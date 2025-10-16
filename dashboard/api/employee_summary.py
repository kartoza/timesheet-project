from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from collections import defaultdict
from datetime import datetime, timedelta
import re
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP

from timesheet.models.profile import Profile
from timesheet.models.task import Task
from timesheet.utils.erp import get_detailed_report_data_by_employee

# --- Task description parsing & allocation helpers ---
ALLOWED_SIZE_BUCKETS = (1, 2, 3, 5, 8)

def _normalize_size(raw):
    """Map arbitrary numeric size to one of the allowed buckets.
    Accepts strings with comma or dot decimal separators.
    Examples: 0.25 -> 1, 6 -> 5, 7.9 -> 5, 8.1 -> 8
    Boundaries are treated as right-closed: (0,1] => 1, (1,2] => 2, (2,5] => 3, (5,8] => 5, >8 => 8
    """
    if raw is None:
        return 1
    try:
        v = float(str(raw).replace(',', '.'))
    except Exception:
        return 1
    if v <= 1:
        return 1
    if v <= 2:
        return 2
    if v <= 5:
        return 3
    if v <= 8:
        return 5
    return 8

def _collapse_hard_wraps(s: str) -> str:
    """Fix common hard-wrap artifacts in ERP descriptions.
    - Remove hyphenated line breaks ("-\n").
    - Remove newlines that occur inside parentheses (commonly inside markdown links).
    """
    if not s:
        return ''
    s = s.replace('\r\n', '\n')
    s = re.sub(r"-\s*\n\s*", "-", s)
    out = []
    depth = 0
    for ch in s:
        if ch == '(':
            depth += 1
            out.append(ch)
        elif ch == ')':
            depth = max(0, depth - 1)
            out.append(ch)
        elif ch == '\n' and depth > 0:
            # swallow hard wraps inside URLs/parentheses
            continue
        else:
            out.append(ch)
    return ''.join(out)

def _extract_link_and_clean_text(text: str):
    """Return (clean_text, link_url).
    Supports nested brackets in markdown link titles, e.g. "[[Harvester] Sweden : Springs](https://...)".
    Removes the markdown link but keeps the visible title. Captures only the first URL.
    """
    if not text:
        return '', None

    s = text
    link = None

    # Find a markdown link with possible nested [..] in the title using a small state machine
    i = s.find('[')
    while i != -1:
        depth = 0
        j = i
        while j < len(s):
            ch = s[j]
            if ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        # We have a matching closing ']' at j, and expect '(' next
        if depth == 0 and j < len(s) - 1 and s[j + 1] == '(':
            # Find the closing ')'
            k = j + 2
            while k < len(s) and s[k] != ')':
                k += 1
            # Extract URL (strip whitespace/newlines that may linger)
            url = s[j + 2:k] if k <= len(s) else s[j + 2:]
            url = re.sub(r"\s+", "", url)
            if not link:
                link = url
            # Replace the full [title](url) with just the title content (preserving any inner brackets)
            title_text = s[i + 1:j]
            s = s[:i] + title_text + s[k + 1:]
            break
        i = s.find('[', i + 1)

    # Collapse any remaining simple markdown links to just titles
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", s)
    # Normalize whitespace
    s = ' '.join(s.split())
    return s, link

def _parse_description_items(desc_raw: str):
    """Parse a raw Description field into a list of items with text and normalized size.
    Handles multiple lines, size brackets, broken markdown links across lines, and decimals with comma.
    Returns list of dicts: {"text": str, "size": int, "link": Optional[str]} (no hours yet).
    """
    s = _collapse_hard_wraps(desc_raw or '')
    # Split bullets anywhere (not just before sizes). We only split on '*' or '•' to avoid breaking hyphenated text.
    s = re.sub(r'(?<!^)\s*[\*\u2022]\s+(?=\S)', '\n', s)
    # Drop bullets at the start of any resulting line (again only '*' or '•').
    s = re.sub(r'^\s*[\*\u2022]\s*', '', s, flags=re.M)
    lines = [ln.strip() for ln in s.split('\n') if ln.strip()]
    if not lines:
        return []
    items = []
    buf = ''
    size_line_re = re.compile(r"^\s*\[\s*([0-9]+(?:[.,][0-9]+)?)\s*\]")
    for ln in lines:
        if size_line_re.match(ln):
            if buf:
                items.append(buf.strip())
            buf = ln
        else:
            # Continuation of previous item (e.g., long title, trailing note)
            buf = (buf + ' ' + ln).strip() if buf else ln
    if buf:
        items.append(buf.strip())

    result = []
    for raw_item in items:
        m = re.match(r"^\s*\[\s*([0-9]+(?:[.,][0-9]+)?)\s*\]\s*(.*)$", raw_item)
        if m:
            size = _normalize_size(m.group(1))
            rest = m.group(2)
        else:
            size = 0  # no explicit size provided
            rest = raw_item
        clean_text, link = _extract_link_and_clean_text(rest)
        if clean_text:  # guard against empty after cleanup
            result.append({"text": clean_text, "size": size, "link": link})
    return result

def _allocate_hours_to_items(items, total_hours: float):
    """Given items with a 'size' attribute, allocate total_hours proportionally.
    Uses Hamilton (largest remainder) method at 3-decimal precision to ensure:
    - no negative allocations
    - sum(allocations) == round(total_hours, 3)
    """
    if not items:
        return []

    # Guard: non-positive total hours
    try:
        tot = Decimal(str(total_hours))
    except Exception:
        tot = Decimal('0')
    if tot <= 0:
        out = []
        for item in items:
            ni = dict(item)
            ni['hours'] = 0.0
            out.append(ni)
        return out

    weights = [max(1, int(i.get('size') or 1)) for i in items]
    w_sum = sum(weights)
    if w_sum <= 0:
        w_sum = len(items)

    # Raw decimal allocations
    raw = [tot * Decimal(w) / Decimal(w_sum) for w in weights]

    # Work in thousandths of an hour (millihours)
    floor_millis = [int((r * Decimal('1000')).to_integral_value(rounding=ROUND_DOWN)) for r in raw]
    sum_floor = sum(floor_millis)
    target_millis = int((tot * Decimal('1000')).to_integral_value(rounding=ROUND_HALF_UP))
    remainder = max(0, target_millis - sum_floor)

    # Distribute the remainder to the largest fractional remainders
    fracs = [ ( (r * Decimal('1000')) - Decimal(floor_millis[i]), i ) for i, r in enumerate(raw) ]
    fracs.sort(key=lambda tup: tup[0], reverse=True)
    alloc_millis = floor_millis[:]
    for k in range(remainder):
        idx = fracs[k % len(fracs)][1]
        alloc_millis[idx] += 1

    out = []
    for item, mh in zip(items, alloc_millis):
        ni = dict(item)
        ni['hours'] = round(mh / 1000.0, 3)
        out.append(ni)
    return out

def parse_and_allocate_descriptions(desc_raw: str, total_hours: float):
    """High-level helper to be used in the view.
    Returns list of {"text", "size", "link", "hours"} for the given description string.
    """
    return _allocate_hours_to_items(_parse_description_items(desc_raw), float(total_hours or 0.0))


class EmployeeSummary(UserPassesTestMixin, APIView):

    def test_func(self):
        return self.request.user.is_superuser or self.request.user.is_staff

    def get(self, request, user_id):
        profile = get_object_or_404(Profile, user_id=user_id)
        # Accept ?from=YYYY-MM-DD&to=YYYY-MM-DD (also supports DD-MM-YYYY). Defaults to month-to-date.
        def _parse_date(s):
            for fmt in ('%Y-%m-%d', '%d-%m-%Y'):
                try:
                    return datetime.strptime(s, fmt).date()
                except (ValueError, TypeError):
                    continue
            return None

        qs = request.query_params
        end_date = _parse_date(qs.get('to')) or timezone.localdate()
        start_date = _parse_date(qs.get('from')) or end_date.replace(day=1)
        if start_date > end_date:
            start_date, end_date = end_date, start_date

        # Fetch raw rows (same shape as you showed)
        rows = get_detailed_report_data_by_employee(
            profile.employee_id,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d')
        )

        task_descriptions = {}

        # Guard: only keep dict-like entry rows (ignore the trailing ["Total", ...] row if present)
        entries = [r for r in rows if isinstance(r, dict)]

        # Totals
        total_hours = sum(r.get("Hours", 0.0) for r in entries)
        billable_hours = sum(r.get("Billable Hours", 0.0) for r in entries)
        total_costing = sum(r.get("Total Costing", 0.0) for r in entries)
        total_billing = sum(r.get("Total Billing", 0.0) for r in entries)

        utilization = (billable_hours / total_hours * 100) if total_hours else 0.0
        realized_rate = (total_billing / billable_hours) if billable_hours else 0.0
        cost_rate = (total_costing / total_hours) if total_hours else 0.0
        margin = total_billing - total_costing

        # By project
        proj = defaultdict(lambda: {
            "project_type": None,
            "hours": 0.0,
            "billable_hours": 0.0,
            "costing": 0.0,
            "billing": 0.0,
        })
        for r in entries:
            p = r.get("Project") or "Unknown"
            proj[p]["project_type"] = r.get("Project Type")
            proj[p]["hours"] += r.get("Hours", 0.0)
            proj[p]["billable_hours"] += r.get("Billable Hours", 0.0)
            proj[p]["costing"] += r.get("Total Costing", 0.0)
            proj[p]["billing"] += r.get("Total Billing", 0.0)

            parsed = parse_and_allocate_descriptions(
                r.get("Description", ""), r.get("Hours", 0.0))
            for item in parsed:
                des_text = item['text']
                if des_text not in task_descriptions:
                    task_descriptions[des_text] = {
                        'project': r.get("Project") or "Unknown",
                        'hours': 0.0,
                        'size': item.get('size'),
                        'link': item.get('link'),
                    }
                task_descriptions[des_text]['hours'] += item['hours']
                if not task_descriptions[des_text].get('link') and item.get('link'):
                    task_descriptions[des_text]['link'] = item['link']
                if item.get('size'):
                    prev_size = task_descriptions[des_text].get('size') or 1
                    task_descriptions[des_text]['size'] = max(prev_size, item['size'])

        by_project = []
        for name, v in proj.items():
            by_project.append({
                "project": name,
                "project_type": v["project_type"],
                "hours": round(v["hours"], 3),
                "billable_hours": round(v["billable_hours"], 3),
                "costing": round(v["costing"], 2),
                "billing": round(v["billing"], 2),
                "hours_share_pct": round((v["hours"] / total_hours * 100) if total_hours else 0.0, 1),
                "billing_share_pct": round((v["billing"] / total_billing * 100) if total_billing else 0.0, 1),
                "utilization_pct": round((v["billable_hours"] / v["hours"] * 100) if v["hours"] else 0.0, 1),
            })
        by_project.sort(key=lambda x: x["hours"], reverse=True)

        # By day
        day_map = defaultdict(lambda: {"hours": 0.0, "billable_hours": 0.0, "costing": 0.0, "billing": 0.0})
        for r in entries:
            d = r.get("Date")
            day_map[d]["hours"] += r.get("Hours", 0.0)
            day_map[d]["billable_hours"] += r.get("Billable Hours", 0.0)
            day_map[d]["costing"] += r.get("Total Costing", 0.0)
            day_map[d]["billing"] += r.get("Total Billing", 0.0)

        by_day = []
        for d, v in sorted(day_map.items()):
            by_day.append({
                "date": d,
                "hours": round(v["hours"], 3),
                "billable_hours": round(v["billable_hours"], 3),
                "costing": round(v["costing"], 2),
                "billing": round(v["billing"], 2),
            })

        # Chart data: monthly if range > 31 days, else weekly (weeks start on Monday)
        span_days = (end_date - start_date).days
        granularity = 'monthly' if span_days > 31 else 'weekly'

        def week_start(d):
            return d - timedelta(days=d.weekday())  # Monday as week start

        def month_key(d):
            return d.strftime('%Y-%m')

        buckets = defaultdict(lambda: {'hours': 0.0, 'billable_hours': 0.0, 'costing': 0.0})
        labels_map = {}

        for r in entries:
            ds = r.get('Date')
            d = None
            try:
                d = datetime.strptime(ds, '%Y-%m-%d').date()
            except Exception:
                try:
                    d = datetime.strptime(ds, '%d-%m-%Y').date()
                except Exception:
                    continue

            if granularity == 'monthly':
                key = month_key(d)
                label = key
            else:
                ws = week_start(d)
                key = ws.isoformat()
                label = ws.strftime('Week of %d %b %Y')

            labels_map[key] = label
            buckets[key]['hours'] += r.get('Hours', 0.0)
            buckets[key]['billable_hours'] += r.get('Billable Hours', 0.0)
            buckets[key]['costing'] += r.get('Total Costing', 0.0)

        sorted_keys = sorted(buckets.keys())

        chart = {
            'granularity': granularity,
            'labels': [labels_map[k] for k in sorted_keys],
            'series': {
                'hours': [round(buckets[k]['hours'], 3) for k in sorted_keys],
                'billable_hours': [round(buckets[k]['billable_hours'], 3) for k in sorted_keys],
                'costing': [round(buckets[k]['costing'], 2) for k in sorted_keys],
            }
        }

        task_hours = defaultdict(float)
        for r in entries:
            task_name = r.get("Task") or "Unknown"
            if task_name != "Unknown":
                task = Task.objects.filter(erp_id=task_name).first()
                task_name = task.name if task else task_name
            task_hours[task_name] += r.get("Hours", 0.0)
        top_tasks = [
            {"task": t, "hours": round(h, 3)}
            for t, h in sorted(task_hours.items(), key=lambda kv: kv[1], reverse=True)[:5]
        ]

        summary = {
            "employee_id": profile.employee_name,
            "date_now": end_date.strftime('%d-%m-%Y'),
            "start_of_month": end_date.replace(day=1).strftime('%d-%m-%Y'),
            "period": {
                "from": start_date.strftime('%Y-%m-%d'),
                "to": end_date.strftime('%Y-%m-%d'),
                "days_count": len(by_day),
            },
            "totals": {
                "hours": round(total_hours, 3),
                "billable_hours": round(billable_hours, 3),
                "utilization_pct": round(utilization, 1),
                "costing": round(total_costing, 2),
                "billing": round(total_billing, 2),
                "margin": round(margin, 2),
                "realized_rate_per_hour": round(realized_rate, 2),
                "cost_rate_per_hour": round(cost_rate, 2),
                "avg_hours_per_day": round((total_hours / len(by_day)) if by_day else 0.0, 2),
            },
            "chart": chart,
            "breakdown": {
                "by_project": by_project,
                "top_tasks": top_tasks,
                "project_type_totals": {
                    "Internal": {
                        "hours": round(
                            sum(v["hours"] for n, v in proj.items() if v["project_type"] == "Internal"), 3),
                        "billable_hours": round(
                            sum(v["billable_hours"] for n, v in proj.items() if v["project_type"] == "Internal"), 3),
                        "costing": round(
                            sum(v["costing"] for n, v in proj.items() if v["project_type"] == "Internal"), 2),
                        "billing": round(
                            sum(v["billing"] for n, v in proj.items() if v["project_type"] == "Internal"), 2),
                    },
                    "External": {
                        "hours": round(
                            sum(v["hours"] for n, v in proj.items() if v["project_type"] == "External"), 3),
                        "billable_hours": round(
                            sum(v["billable_hours"] for n, v in proj.items() if v["project_type"] == "External"), 3),
                        "costing": round(
                            sum(v["costing"] for n, v in proj.items() if v["project_type"] == "External"), 2),
                        "billing": round(
                            sum(v["billing"] for n, v in proj.items() if v["project_type"] == "External"), 2),
                    }
                }
            },
            "task_descriptions": task_descriptions,
            "meta": {
                "entries_count": len(entries)
            }
        }

        return Response(summary)
