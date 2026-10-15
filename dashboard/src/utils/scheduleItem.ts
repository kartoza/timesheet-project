/**
 * Single place that decides what kind of planner item a schedule is.
 * It works on both raw API schedules (pass `desc: schedule.title`) and
 * the items built from them, which keep the raw title in `desc`.
 */
export interface ClassifiableItem {
  task_name?: string,
  desc?: string,
  notes?: string,
  task_label?: string,
  task_id?: string | number | null,
  project_name?: string,
  info?: string
}

export interface ItemClassification {
  isLeave: boolean,
  isHoliday: boolean,
  // Announcement style entries on the Kartoza project (HTML content, no task)
  isKartozaSpecial: boolean,
  // No task and not a Kartoza announcement, edited as a note
  isNoteOnly: boolean,
  // Titled and coloured like a note (also true for Kartoza project items with a task)
  showsAsNote: boolean
}

const includesText = (text: string | undefined, needle: string) => (
  !!text && text.toLowerCase().includes(needle)
)

const hasHtml = (text?: string) => !!text && (text.includes('<div') || text.includes('<p>'))

export function classifyItem(item: ClassifiableItem): ItemClassification {
  const isLeave = includesText(item.desc, 'leave') ||
    includesText(item.task_name, 'leave') ||
    includesText(item.task_name, 'time in lieu')
  const isHoliday = item.task_name === 'Public holiday' || includesText(item.desc, 'holiday')
  // Items created in the UI only carry `info` (project : task : user)
  const projectLabel = item.project_name !== undefined ? item.project_name : item.info
  const isKartozaProject = !!projectLabel && projectLabel.includes('Kartoza')
  const isKartozaSpecial = !isHoliday && isKartozaProject &&
    (hasHtml(item.desc) || hasHtml(item.notes)) && item.task_label === '-'
  const hasTask = !!item.task_id
  return {
    isLeave,
    isHoliday,
    isKartozaSpecial,
    isNoteOnly: !isKartozaSpecial && !hasTask,
    showsAsNote: !isHoliday && !isKartozaSpecial && (!hasTask || isKartozaProject)
  }
}
