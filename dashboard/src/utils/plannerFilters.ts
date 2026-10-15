import {classifyItem} from "./scheduleItem";

export enum OpenCloseStatus {
  OPEN = "OPEN",
  CLOSE = "CLOSE"
}

export type ItemType = 'task' | 'note' | 'leave' | 'holiday'

export const ALL_ITEM_TYPES: ItemType[] = ['task', 'note', 'leave', 'holiday']
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  task: 'Tasks', note: 'Notes', leave: 'Leave', holiday: 'Holidays'
}

export interface PlannerFilters {
  types: ItemType[],
  projectId: string | null,
  personId: string | null,
  onlyMe: boolean
}

export interface FilterOption {
  id: string,
  label: string
}

export const DEFAULT_FILTERS: PlannerFilters = {
  types: ALL_ITEM_TYPES, projectId: null, personId: null, onlyMe: false
}

export const STORAGE_KEY = 'planner.state'
export const currentUserId = (window as any).currentUserId

export const hasActiveFilters = (filters: PlannerFilters) => (
  filters.types.length < ALL_ITEM_TYPES.length || !!filters.projectId ||
  !!filters.personId || filters.onlyMe
)

export const getItemType = (item: any): ItemType => {
  const {isLeave, isHoliday} = classifyItem(item)
  if (isLeave) return 'leave'
  if (isHoliday) return 'holiday'
  if (!item.task_id) return 'note'
  return 'task'
}

export const itemPassesFilters = (item: any, filters?: PlannerFilters) => {
  if (!filters) return true
  const type = getItemType(item)
  if (!filters.types.includes(type)) return false
  if (filters.projectId && type === 'task' && String(item.project_id) !== String(filters.projectId)) return false
  return true
}

export const loadStoredState = (): { searchText?: string, filters?: PlannerFilters } => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const filters = stored.filters ? Object.assign({}, DEFAULT_FILTERS, stored.filters) : undefined
    if (filters) {
      filters.types = filters.types.filter(type => ALL_ITEM_TYPES.includes(type))
    }
    return { searchText: stored.searchText || undefined, filters }
  } catch (e) {
    return {}
  }
}
