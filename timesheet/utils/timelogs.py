from bs4 import BeautifulSoup

from timesheet.models import Timelog


def split_timelog_by_description(timelog):
    """
    Splits a timelog's HTML description into multiple timelogs.

    - The parent timelog's description is updated to only contain the first bullet,
      wrapped in a <ul><li> ... </li></ul> structure.
    - Additional timelogs (children) are created for each extra bullet.
      Each child timelog's description is similarly wrapped in a <ul><li> ... </li></ul> structure,
      and they are given a zero-duration (end_time == start_time).

    Returns the number of child timelogs created.
    """
    # Use the parent timelog if this one is a child.
    parent_log = timelog.parent if timelog.parent else timelog

    # Parse the parent's description as HTML.
    soup = BeautifulSoup(parent_log.description or "", "html.parser")
    if soup.find_all("li"):
        tag = "li"
        bullet_points = [li.decode_contents().strip() for li in soup.find_all("li")]
    elif soup.find_all("p"):
        tag = "p"
        bullet_points = [p.decode_contents().strip() for p in soup.find_all("p")]
    else:
        bullet_points = []
        tag = None

    # If there is one or no bullet point, there is nothing to split.
    if len(bullet_points) <= 1:
        return 0

    # Create new HTML using only the first bullet.
    first_bullet = bullet_points[0].strip()
    if tag == "li":
        first_bullet_html = f"<ul><li>{first_bullet}</li></ul>"
    elif tag == "p":
        first_bullet_html = f"<p>{first_bullet}</p>"
    else:
        first_bullet_html = first_bullet

    # Update the parent's description if needed.
    if parent_log.description.strip() != first_bullet_html:
        parent_log.description = first_bullet_html
        parent_log.save()

    existing_children = parent_log.children.all()
    existing_children.update(
        description=first_bullet_html,
    )

    created_count = 0
    for bp in bullet_points[1:]:
        bp = bp.strip()
        if tag == "li":
            bullet_html = f"<ul><li>{bp}</li></ul>"
        elif tag == "p":
            bullet_html = f"<p>{bp}</p>"
        else:
            bullet_html = bp
        Timelog.objects.create(
            user=parent_log.user,
            task=parent_log.task,
            project=parent_log.project,
            activity=parent_log.activity,
            description=bullet_html,
            start_time=parent_log.start_time,
            end_time=parent_log.start_time,
            timezone=parent_log.timezone,
            submitted=parent_log.submitted,
            parent=None,
        )
        created_count += 1

    return created_count
