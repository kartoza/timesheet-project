import json
import logging

from timesheet.models.task import Task
from timesheet.utils.erp import get_detailed_report_data

logger = logging.getLogger(__name__)


def fetch_and_save_billable_hours(project_name: str) -> list[dict]:
    """
    Fetch Timesheet Detailed Report from ERPNext for a project, aggregate
    billable and consumed hours per task, persist to Task.billable_hours,
    and return per-task summary rows.
    """
    rows = get_detailed_report_data(project_name)

    by_task: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        erp_id = row.get('Task') or ''
        if erp_id not in by_task:
            by_task[erp_id] = {'consumed': 0.0, 'billable': 0.0}
        by_task[erp_id]['consumed'] += float(row.get('Hours') or 0)
        by_task[erp_id]['billable'] += float(row.get('Billable Hours') or 0)

    task_lookup = {
        t.erp_id: t
        for t in Task.objects.filter(erp_id__in=by_task.keys())
    }

    results = []
    for erp_id, totals in by_task.items():
        task = task_lookup.get(erp_id)
        billable = totals['billable']

        if task:
            Task.objects.filter(pk=task.pk).update(billable_hours=billable)
            logger.debug('Updated billable_hours=%.2f for task %s', billable, erp_id)

        results.append({
            'erp_id': erp_id,
            'name': task.name if task else erp_id,
            'budget': task.expected_time if task else 0.0,
            'consumed': totals['consumed'],
            'billable': billable,
            'left': (task.expected_time if task else 0.0) - totals['consumed'],
        })

    return sorted(results, key=lambda r: r['budget'], reverse=True)
