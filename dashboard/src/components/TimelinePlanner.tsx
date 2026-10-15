import React, {
  useEffect, useState, useCallback, useRef, useMemo, forwardRef, useImperativeHandle
} from "react";
import moment from "moment";

import "react-calendar-timeline/lib/Timeline.css";
import Timeline, {TimelineMarkers, TodayMarker, TimelineHeaders,
  SidebarHeader, DateHeader} from "react-calendar-timeline";

import {
  deleteSchedule,
  fetchSchedules,
  fetchSlottedProjects,
  updateSchedule,
  mapScheduleToItem
} from "../utils/schedule_data";
import {classifyItem} from "../utils/scheduleItem";
import {computeUtilisation, Utilisation} from "../utils/utilisation";
import {
  OpenCloseStatus, PlannerFilters, FilterOption, DEFAULT_FILTERS, STORAGE_KEY,
  currentUserId, hasActiveFilters, itemPassesFilters, loadStoredState
} from "../utils/plannerFilters";
import {getTaskColor} from "../utils/Theme";
import '../styles/Planner.scss';
import ItemForm, {ItemTaskInterface} from "./TimelineItemForm";
import {SIDEBAR_WIDTH, TimelineNavigation, TimelineSearchInput} from "./PlannerControls";
import AddBoxIcon from '@mui/icons-material/AddBox';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import {
  Alert, Button, Backdrop, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Popover, Snackbar
} from "@mui/material";
import TimelineProjectForm from "./TimelineProjectForm";
const CircularMenu = React.lazy(() => import('./Menu'));

export const canEdit = (window as any).isStaff

let keys = {
  groupIdKey: "id",
  groupTitleKey: "title",
  groupRightTitleKey: "rightTitle",
  itemIdKey: "id",
  itemTitleKey: "title",
  itemDivTitleKey: "title",
  itemGroupKey: "group",
  itemTimeStartKey: "start",
  itemTimeEndKey: "end",
  groupLabelKey: "title"
};

interface ItemInterface {
  id: string,
  start: number,
  end: number,
  group?: number | string,
  // Set on the rows shown on a collapsed person, which mirror a real item
  originalGroup?: number | string,
  originalId?: string,
  project_id?: string,
  title?: string,
  task_name?: string,
  info?: string,
  color?: string,
  bgColor?: string,
  selectedBgColor?: string,
  canMove?: boolean,
  task_label?: string,
  task_id?: string,
  notes?: string,
  hoursPerDay?: number,
  desc?: string
}

export interface GroupInterface {
  id: string,
  root: boolean,
  parent: string,
  title: string,
  rightTitle?: string,
  userId?: string,
  projectId?: string,
}

interface TimelinePlannerInterface {
  searchValue?: string,
  filters?: PlannerFilters,
  onRangeChange?: (start: number, end: number) => void,
  onGroupsLoaded?: (groups: GroupInterface[]) => void
}

interface ConfirmState {
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void
}

interface ToastState {
  message: string,
  severity: 'error' | 'success' | 'info'
}

export default function TimelineDashboard() {
  const timelinePlanner = useRef<any>(null);
  const [stored] = useState(loadStoredState)
  const [searchText, setSearchText] = useState<string | undefined>(stored.searchText)
  const [filters, setFilters] = useState<PlannerFilters>(stored.filters || DEFAULT_FILTERS)
  const [range, setRange] = useState<{start: number, end: number} | null>(null)
  const [options, setOptions] = useState<{projects: FilterOption[], people: FilterOption[]}>(
    {projects: [], people: []}
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({searchText, filters}))
    } catch (e) {
      // storage can be unavailable (private mode), the planner still works
    }
  }, [searchText, filters])

  const handleGroupsLoaded = useCallback((groups: GroupInterface[]) => {
    const projects = new Map<string, string>()
    const people = new Map<string, string>()
    for (const group of groups) {
      if (group.root) {
        if (group.userId) people.set(String(group.userId), group.rightTitle || group.title)
      } else if (group.projectId) {
        projects.set(String(group.projectId), group.rightTitle || group.title)
      }
    }
    const toOptions = (map: Map<string, string>) => Array.from(map.entries())
      .map(([id, label]) => ({id, label}))
      .sort((a, b) => a.label.localeCompare(b.label))
    setOptions({projects: toOptions(projects), people: toOptions(people)})
  }, [])

  const handleRangeChange = useCallback((start: number, end: number) => setRange({start, end}), [])

  return (
    <div className={'planner-page'}>
      <CircularMenu/>
      <TimelineSearchInput searchValue={searchText}
                           onChange={(value) => setSearchText(value)}
                           toggleAllGroups={(newStatus) => timelinePlanner.current?.toggleAllGroups(newStatus)}/>
      <TimelineNavigation planner={timelinePlanner} range={range}
                          filters={filters} onFiltersChange={setFilters} options={options}/>
      <TimelinePlanner searchValue={searchText} filters={filters} ref={timelinePlanner}
                       onRangeChange={handleRangeChange} onGroupsLoaded={handleGroupsLoaded}/>
    </div>
  )
}

const ItemSelectedColor = '#c19e16'

// The visible window is fixed to 30 days (minZoom === maxZoom on the timeline)
const VISIBLE_RANGE = 60 * 60 * 1000 * 24 * 30
const WEEK = 60 * 60 * 1000 * 24 * 7
const DEFAULT_TIME_START = moment()
      .startOf("week")
      .valueOf()
const DEFAULT_TIME_END = DEFAULT_TIME_START + VISIBLE_RANGE

const stripHtml = (text: string) => {
  if (text && text.includes('<')) {
    return new DOMParser().parseFromString(text, 'text/html').body.textContent || text;
  }
  return text;
}

const formatItemDate = (time: number) => moment(time).format('ddd, D MMM YYYY')

const getBaseScheduleId = (item: ItemInterface | null | undefined) => {
  if (!item) return null;
  return item.originalId ? item.originalId : item.id;
}

const mergeUpdatedSchedules = (currentItems: ItemInterface[], updatedSchedules: any) => {
  return currentItems.map((currentItem) => {
    const updated = updatedSchedules ? updatedSchedules[currentItem.id] : null;
    return updated ? Object.assign({}, currentItem, updated) : currentItem;
  })
}

/**
 * The row shown on a collapsed person for an item that lives on one of their
 * (hidden) project rows. It is derived, never stored.
 */
const toCollapsedItem = (item: ItemInterface, projectGroup: GroupInterface): ItemInterface => (
  Object.assign({}, item, {
    id: `collapsed-${item.id}`,
    originalId: item.id + '',
    originalGroup: item.group,
    color: '#FFF',
    selectedBgColor: ItemSelectedColor,
    canMove: false,
    canResize: false,
    group: projectGroup.parent,
    title: projectGroup.title
  })
)

/** Keep the groups matching the search text, a person matches through their projects and the other way round */
const searchGroups = (groups: GroupInterface[], searchText: string) => {
  const searchValue = searchText.toLowerCase()
  const matches = (group: GroupInterface) => (
    (group.rightTitle ? group.rightTitle.toLowerCase() : '').includes(searchValue)
  )
  return groups.filter(group => {
    if (matches(group)) return true
    if (group.root) {
      return groups.some(child => !child.root && String(child.parent) === String(group.id) && matches(child))
    }
    const parent = groups.find(root => String(root.id) === String(group.parent))
    return !!parent && matches(parent)
  })
}

const filterGroupsByPerson = (groupList: GroupInterface[], allGroups: GroupInterface[], filters?: PlannerFilters) => {
  if (!filters) return groupList
  const personId = filters.onlyMe ? currentUserId : filters.personId
  if (!personId && !filters.projectId) return groupList
  return groupList.filter(group => {
    if (group.root) {
      if (personId && String(group.userId) !== String(personId)) return false
      if (filters.projectId) {
        return groupList.some(child => !child.root && String(child.parent) === String(group.id) &&
          String(child.projectId) === String(filters.projectId))
      }
      return true
    }
    const parent = allGroups.find(root => root.root && String(root.id) === String(group.parent))
    if (personId && (!parent || String(parent.userId) !== String(personId))) return false
    if (filters.projectId && String(group.projectId) !== String(filters.projectId)) return false
    return true
  })
}

const UtilisationBadge = ({utilisation, week}: {utilisation?: Utilisation, week: number}) => {
  if (!utilisation || utilisation.capacity === 0 && utilisation.booked === 0) return null
  const level = utilisation.percent > 100 || utilisation.overbookedDays > 0 ? 'over' :
    (utilisation.percent >= 80 ? 'ok' : 'under')
  const title = `${utilisation.booked} of ${utilisation.capacity} available hours booked in the week of ${moment(week).format('D MMM')}` +
    (utilisation.overbookedDays > 0 ? `, overbooked on ${utilisation.overbookedDays} day(s)` : '')
  return <span className={`utilisation-badge utilisation-${level}`} title={title}>{utilisation.percent}%</span>
}

const TimelinePlanner = forwardRef((props: TimelinePlannerInterface, ref) => {
  const [groups, setGroups] = useState<GroupInterface[]>([])
  const [items, setItems] = useState<ItemInterface[]>([])
  // People whose project rows are folded away, everyone else is expanded
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [selectedItem, setSelectedItem] = useState<ItemInterface | null>(null)
  const [openForm, setOpenForm] = useState<boolean>(false)
  const [openProjectForm, setOpenProjectForm] = useState<boolean>(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupInterface | null>(null)
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)
  const [scheduleEndTime, setScheduleEndTime] = useState<Date | null>(null)
  const [selectedTask, setSelectedTask] = useState<ItemTaskInterface | null>(null)
  const [isUserRowNote, setIsUserRowNote] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [popoverContent, setPopoverContent] = useState<React.ReactNode>(null)
  const [pendingSaves, setPendingSaves] = useState<number>(0)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [visibleTime, setVisibleTime] = useState({start: DEFAULT_TIME_START, end: DEFAULT_TIME_END})

  useEffect(() => {
    if (props.onRangeChange) props.onRangeChange(visibleTime.start, visibleTime.end)
  }, [visibleTime])

  useEffect(() => {
    const load = async () => {
      try {
        const groupsData: GroupInterface[] = await fetchSlottedProjects()
        if (groupsData.length > 0) {
          setGroups(groupsData)
          if (props.onGroupsLoaded) props.onGroupsLoaded(groupsData)
          const schedules: any[] = await fetchSchedules()
          setItems(schedules.map(mapScheduleToItem))
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const trackSave = useCallback(<T,>(promise: Promise<T>): Promise<T> => {
    setPendingSaves(count => count + 1)
    const done = () => setPendingSaves(count => count - 1)
    promise.then(done, done)
    return promise
  }, [])

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>, content: React.ReactNode) => {
    setPopoverContent(content)
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const popoverOpen = Boolean(anchorEl);

  // Derived rows ---------------------------------------------------------
  const rootsWithChildren = useMemo(() => (
    new Set(groups.filter(group => !group.root).map(group => String(group.parent)))
  ), [groups])

  const isRootOpen = useCallback((rootId) => (
    rootsWithChildren.has(String(rootId)) && !collapsedGroups[String(rootId)]
  ), [rootsWithChildren, collapsedGroups])

  const timelineItems = useMemo(() => {
    const projectGroups = new Map<string, GroupInterface>()
    groups.forEach(group => {
      if (!group.root) projectGroups.set(String(group.id), group)
    })
    const collapsedItems: ItemInterface[] = []
    for (const item of items) {
      const projectGroup = projectGroups.get(String(item.group))
      if (projectGroup && !isRootOpen(projectGroup.parent)) {
        collapsedItems.push(toCollapsedItem(item, projectGroup))
      }
    }
    return collapsedItems.length > 0 ? [...items, ...collapsedItems] : items
  }, [items, groups, isRootOpen])

  const renderedItems = useMemo(() => {
    const searchValue = (props.searchValue || '').toLowerCase()
    return timelineItems.filter(item => {
      if (!itemPassesFilters(item, props.filters)) return false
      if (!searchValue) return true
      return item.info ? item.info.toLowerCase().includes(searchValue) : false
    })
  }, [timelineItems, props.searchValue, props.filters])

  const toggleGroup = useCallback((id) => {
    if (props.searchValue) return
    setCollapsedGroups(current => ({...current, [String(id)]: !current[String(id)]}))
  }, [props.searchValue])

  const toggleAll = (newStatus = OpenCloseStatus.CLOSE) => {
    if (props.searchValue) return
    const collapsed: Record<string, boolean> = {}
    if (newStatus === OpenCloseStatus.CLOSE) {
      rootsWithChildren.forEach(id => { collapsed[id] = true })
    }
    setCollapsedGroups(collapsed)
  }

  useImperativeHandle(ref, () => ({
    toggleAllGroups(newStatus = OpenCloseStatus.CLOSE) {
      toggleAll(newStatus)
    },
    goToToday() {
      const start = moment().startOf("week").valueOf()
      setVisibleTime({start, end: start + VISIBLE_RANGE})
    },
    goToDate(time: number) {
      const start = moment(time).startOf("week").valueOf()
      setVisibleTime({start, end: start + VISIBLE_RANGE})
    },
    shiftRange(direction: number) {
      setVisibleTime(current => ({
        start: current.start + direction * WEEK,
        end: current.end + direction * WEEK
      }))
    },
  }));

  const removeProjectFromUser = useCallback((userId?: string, projectId?: string, groupId?: string) => {
    if (!userId || !projectId || !groupId) return;
    setConfirmState({
      title: 'Remove project',
      message: 'Remove this project from the person\'s planning? Their scheduled items for it will no longer be shown.',
      confirmLabel: 'Remove',
      onConfirm: () => {
        const url = '/api/remove-user-project-slot/';
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('project_id', projectId);
        trackSave(fetch(url, {
          credentials: 'include',
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
            'X-CSRFToken': (window as any).csrftoken
          },
        })
          .then(response => response.json())
          .then((result: any) => {
            if (result['detail'] === 'Not found.') {
              setToast({message: 'Could not remove the project, try again later.', severity: 'error'})
            } else {
              setGroups(current => current.filter(group => group.id !== groupId));
              setSelectedGroup(null);
            }
          })
          .catch(() => setToast({message: 'Could not remove the project, try again later.', severity: 'error'})))
      }
    })
  }, [trackSave])

  const handleProjectAdd = useCallback((groupId) => {
    const group = groups.find(group => group.id === groupId)
    if (group) {
      setSelectedGroup(group)
      setOpenProjectForm(true)
    }
  }, [groups])

  // The week at the left edge of the timeline; snapped so panning the timeline does not recompute (and re-layout) every frame
  const utilisationStart = moment(visibleTime.start).startOf("week").valueOf()
  const utilisation = useMemo(() => {
    const rootIds = new Map<string, string>()
    groups.forEach(group => rootIds.set(String(group.id), String(group.root ? group.id : group.parent)))
    return computeUtilisation(
      items,
      item => rootIds.get(String(item.group)) ?? null,
      utilisationStart,
      utilisationStart + WEEK
    )
  }, [items, groups, utilisationStart])

  const renderedGroups = useMemo(() => {
    const visibleGroups = filterGroupsByPerson(
      searchGroups(groups, props.searchValue || ''), groups, props.filters
    ).filter(group => group.root || isRootOpen(group.parent))
    const toggleColor = props.searchValue ? 'gray' : 'black'
    return visibleGroups.map(group => (
      Object.assign({}, group, {
        stackItems: true,
        title: group.root ? (
          <div className={"root-parent"} onClick={() => toggleGroup(group.id)}>
            {isRootOpen(group.id) ?
              <IndeterminateCheckBoxIcon style={{ color: toggleColor }}/> :
              <AddBoxIcon style={{ color: toggleColor }}/>} {group.rightTitle}
            <UtilisationBadge week={utilisationStart} utilisation={utilisation.get(String(group.id))}/>
            <div className={'add-project-container'}>
              { canEdit ? <Button onClick={(event) => {
                event.stopPropagation()
                handleProjectAdd(group.id)
              }} sx={{ m: 0, p: 0 }} variant={'contained'} size={'small'} style={{ fontSize: 10, minWidth: 35 }}>Add</Button> : null }
            </div>
          </div>
        ) : (
          <div className='project-name-container'>
            { canEdit ?
              <ClearIcon className='delete-project-button'
                         onClick={() => removeProjectFromUser(group.userId, group.projectId, group.id)}/> :
              <div style={{ paddingLeft: 20 }}/>
            }
            <div>{group.rightTitle}</div>
          </div>
        )
      })
    ))
  }, [groups, props.searchValue, props.filters, isRootOpen, toggleGroup, handleProjectAdd, removeProjectFromUser, utilisation, utilisationStart])

  // Item actions ---------------------------------------------------------
  const findItem = (itemId: string) => timelineItems.find(item => item.id === itemId)

  const deleteItem = (itemId: string) => {
    const item = findItem(itemId)
    if (!item) return
    const baseId = getBaseScheduleId(item);
    setConfirmState({
      title: 'Delete item',
      message: 'Are you sure you want to delete this record?',
      confirmLabel: 'Delete',
      onConfirm: () => {
        trackSave(deleteSchedule(baseId as string)).then(result => {
          if (result && result['removed']) {
            setItems(currentItems => mergeUpdatedSchedules(
              currentItems.filter(currentItem => String(currentItem.id) !== String(baseId)),
              result.updated
            ))
          } else {
            setToast({message: 'Could not delete the item, try again later.', severity: 'error'})
          }
        })
      }
    })
  }

  // Apply the new dates right away and roll back if the server rejects them
  const saveItemDates = (item: ItemInterface, newStart: number, newEnd: number) => {
    const baseId = getBaseScheduleId(item);
    const isSameSchedule = (other: ItemInterface) => String(other.id) === String(baseId)
    const originals = items.filter(isSameSchedule)
    setItems(currentItems => currentItems.map(
      other => isSameSchedule(other) ? Object.assign({}, other, {start: newStart, end: newEnd}) : other
    ))
    trackSave(updateSchedule(
      Number(baseId),
      newStart,
      newEnd,
      item.notes || '',
      item.task_id || null,
      item.hoursPerDay || null
    )).then((updatedSchedules: any) => {
      if (updatedSchedules) {
        setItems(currentItems => mergeUpdatedSchedules(currentItems, updatedSchedules))
      } else {
        setItems(currentItems => currentItems.map(
          other => originals.find(original => original.id === other.id) || other
        ))
        setToast({message: 'Could not save the change, it has been reverted.', severity: 'error'})
      }
    })
  }

  const handleItemMove = (itemId, dragTime, newGroupOrder) => {
    const group = renderedGroups[newGroupOrder];
    const item = findItem(itemId);
    if (!item) {
      return false;
    }
    const isNoteOnly = !item.task_id;
    const targetGroupId = group ? Number(group.id) : null;
    const itemGroupId = item.originalGroup !== undefined && item.originalGroup !== null ? Number(item.originalGroup) :
      (item.group !== undefined && item.group !== null ? Number(item.group) : null);
    // Disallow moving non note-only items into root rows or into other groups
    if ((group && group.root && !isNoteOnly) || (targetGroupId !== null && itemGroupId !== null && targetGroupId !== itemGroupId)) {
      return false;
    }

    saveItemDates(item, dragTime, dragTime + (item.end - item.start))
  };

  const handleItemResize = (itemId, time, edge) => {
    const item = findItem(itemId)
    if (!item) return
    saveItemDates(item, edge === "left" ? time : item.start, edge === "left" ? item.end : time)
  };

  const handleCanvasClick = (groupId, time, event) => {
    if (!canEdit) return
    if (openForm) return
    const group = groups.find(group => group.id === groupId)
    if (!group) return
    setSelectedTime(new Date(time))
    setScheduleEndTime(null)
    setSelectedItem(null)
    setSelectedTask(null)
    setSelectedGroup(group)
    setIsUserRowNote(!!group.root)
    setOpenForm(true)
  }

  const isNotNullAndNumber = (item) => {
    return item !== null && typeof item === 'number';
  }

  const renderItemTooltip = (item: ItemInterface, isNoteOnly: boolean, usedHour: number, totalHour: number) => {
    const lastDay = item.end - 24 * 60 * 60 * 1000
    const notes = item.notes ? stripHtml(item.notes) : ''
    return (
      <div className={'item-tooltip'}>
        <div className={'item-tooltip-title'}>{isNoteOnly ? 'Note' : item.title}</div>
        {item.info && !isNoteOnly ? <div>{item.info}</div> : null}
        <div>
          {formatItemDate(item.start)}{lastDay > item.start ? ` – ${formatItemDate(lastDay)}` : ''}
        </div>
        {item.hoursPerDay ? <div>{item.hoursPerDay} h/day</div> : null}
        {!isNoteOnly && !isNaN(usedHour) && !isNaN(totalHour) ? <div>{usedHour} / {totalHour} hours used</div> : null}
        {notes ? <div className={'item-tooltip-notes'}>{notes}</div> : null}
      </div>
    )
  }

  const itemRenderer = ({ item, timelineContext, itemContext, getItemProps, getResizeProps }) => {
    const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
    const classification = classifyItem(item);
    if (classification.isLeave) {
      return (
        <div
          {...getItemProps({
            style: {
              backgroundColor: '#4a4a4a',
              borderColor: itemContext.selected ? '#ecb754' : item.color,
              borderStyle: "solid",
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderRadius: 4,
              borderLeftWidth: itemContext.selected ? 4 : 1,
              borderRightWidth: itemContext.selected ? 4 : 1,
              cursor: 'default'
            }
          })}
          onMouseEnter={(e: any) => handlePopoverOpen(e, item.task_name)}
          onMouseLeave={handlePopoverClose}
        >
          <div
            style={{
              height: '100%',
              background: '#4a4a4a',
              borderRadius: '4px',
              color: '#fff'
            }}>
            <div className={'timeline-item'}>
              <div className={'timeline-item-title'}>{item.task_name || itemContext.title}</div>
            </div>
          </div>
        </div>
      );
    }

    const {isHoliday, isKartozaSpecial, isNoteOnly} = classification;
    const backgroundColor = itemContext.selected ? (itemContext.dragging ? "red" : item.selectedBgColor) : item.bgColor;
    const taskTimeInfo = item.info.replace( /(^.*\(|\).*$)/g, '' )
    const usedHour = parseFloat(taskTimeInfo.split('/')[0])
    const totalHour = parseFloat(taskTimeInfo.split('/')[1])
    const totalDays = totalHour/7
    const remainingHour = totalHour - usedHour
    const hoursPerDayPercentage = item.hoursPerDay ? item.hoursPerDay / 7 * 100 : 100
    let remainingDays = parseInt((remainingHour / 7) + "")
    const countdown:any = []
    let days = 0;
    if (isNotNullAndNumber(item.first_day) && isNotNullAndNumber(item.last_day)) {
      days = Math.abs(item.first_day - item.last_day)
      for (let i = item.first_day; i > item.last_day - 1; i--) {
        countdown.push(i)
      }
    } else {
      days = Math.abs(
        moment(item.start_time).diff(moment(item.end_time), 'days'))
      for (let i = 0; i < days; i++) {
        countdown.push(remainingDays)
        remainingDays -= 1
      }
    }
    const countDownStyle = {
      width: `${100/(days > 0 ? days : 1)}%`
    }
    const firstColor = getTaskColor((totalDays - countdown[0]) / totalDays)
    const lastColor = getTaskColor((totalDays - countdown[countdown.length - 1]) / totalDays)
    const showActions = canEdit && !isKartozaSpecial && !isHoliday && (item.task_label !== '-' || isNoteOnly)
    const background = isHoliday ? '#42BF8B' : (isKartozaSpecial ? '#626262' : (isNoteOnly ? '#9370DB' : (item.task_label !== '-' ? `linear-gradient(90deg, ${firstColor} 0%, ${lastColor} 100%)` : '#626262')));
    return (
      <div
        {...getItemProps({
          style: {
            backgroundColor,
            borderColor: itemContext.resizing ? "red" : itemContext.selected ? '#ecb754' : item.color,
            borderStyle: "solid",
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderRadius: 4,
            borderLeftWidth: itemContext.selected ? 4 : 1,
            borderRightWidth: itemContext.selected ? 4 : 1,
          },
          onMouseDown: () => {
            // console.log("on item click", item);
          }
        })}
        onMouseEnter={(e: any) => {
          if (itemContext.dragging || itemContext.resizing) return
          if (isHoliday) {
            handlePopoverOpen(e, stripHtml(item.desc))
          } else {
            handlePopoverOpen(e, renderItemTooltip(item, isNoteOnly, usedHour, totalHour))
          }
        }}
        onMouseLeave={handlePopoverClose}
      >
        {itemContext.useResizeHandle ? <div {...leftResizeProps} /> : null}
        <div
          style={{
            height: '100%',
            background: background,
            borderRadius: '4px'
          }}>
        <div
          className={'timeline-item'}
          style={ hoursPerDayPercentage < 100 ? {
            background: `linear-gradient(to bottom, rgba(0, 0, 0, 0) ${hoursPerDayPercentage}%, rgba(255,255,255, 0.3) ${100-hoursPerDayPercentage}%)`
          } : {}}
        >
          <div className={'timeline-item-title'}>{
            isHoliday || isKartozaSpecial ? <div dangerouslySetInnerHTML={{ __html: item.desc }}></div> : itemContext.title
          }</div>
          <div className={'timeline-item-sub'}>
            {isHoliday ? '🏖️' :
              isKartozaSpecial ? null :
              isNoteOnly ? <div style={{ padding: '5px', fontSize: '0.8em' }}>{item.notes}</div> :
              countdown.map(day => <div className={'timeline-item-countdown'} style={countDownStyle}>
                <div className={'timeline-item-sub-text'}>{!isNaN(day) ? day : ''}</div> </div>)
            }
          </div>
          { showActions ? <div className={'item-actions'}>
            <button type="button" className={'item-action'} title="Edit" aria-label="Edit item"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      handlePopoverClose()
                      const targetGroupId = item.originalGroup ? item.originalGroup : item.group;
                      const group = groups.find(group => group.id === targetGroupId)
                      if (group) {
                        setSelectedGroup(group)
                      }
                      const task: ItemTaskInterface | null = isNoteOnly ? null : {
                        id: item.task_id,
                        label: item.task_label
                      }
                      setIsUserRowNote(!!(group && group.root && (!item.project_id || item.project_id === '')))
                      setSelectedItem(Object.assign({}, item, {
                        group: targetGroupId
                      }))
                      setSelectedTime(item.start)
                      setSelectedTask(task)
                      setScheduleEndTime(item.end)
                      setOpenForm(true)
                    }}><EditIcon sx={{ fontSize: 14 }}/></button>
            <button type="button" className={'item-action'} title="Delete" aria-label="Delete item"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      handlePopoverClose()
                      deleteItem(item.id)
                    }}><CloseIcon sx={{ fontSize: 14 }}/></button>
          </div> : null }
        </div>

        {itemContext.useResizeHandle ? <div {...rightResizeProps} /> : null}
      </div>
      </div>
    );
  };

  return (
    <div>
      <Backdrop open={loading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <Popover
        id="mouse-over-popover"
        sx={{
          pointerEvents: 'none',
        }}
        open={popoverOpen}
        disableScrollLock
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <div className={'item-tooltip-container'}>{popoverContent}</div>
      </Popover>

      <Dialog open={confirmState !== null} onClose={() => setConfirmState(null)}>
        <DialogTitle>{confirmState?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmState?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmState(null)}>Cancel</Button>
          <Button color="error" variant="contained" autoFocus onClick={() => {
            const onConfirm = confirmState?.onConfirm
            setConfirmState(null)
            if (onConfirm) onConfirm()
          }}>{confirmState?.confirmLabel}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast !== null} autoHideDuration={5000} onClose={() => setToast(null)}
                anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}>
        <Alert severity={toast?.severity || 'info'} variant="filled" onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>

      {pendingSaves > 0 ? <div className={'saving-indicator'}>
        <CircularProgress size={14} color="inherit"/> Saving…
      </div> : null}

      <ItemForm open={openForm}
                selectedGroup={selectedGroup}
                selectedTask={selectedTask}
                startTime={selectedTime}
                endTime={scheduleEndTime}
                hoursPerDay={selectedItem?.hoursPerDay}
                notes={selectedItem?.notes ? selectedItem.notes : ''}
                isEditMode={selectedItem !== null}
                isUserRowNote={isUserRowNote}
                onUpdate={(startTime: Date, notes: string, selectedTask: ItemTaskInterface | null, duration: number, hoursPerDay: number) => {
                  if (selectedItem) {
                    const endTime = new Date(startTime.getTime())
                    const end = new Date(endTime.setDate(endTime.getDate() + duration));
                    const baseId = getBaseScheduleId(selectedItem);
                    trackSave(updateSchedule(
                      baseId ? Number(baseId) : parseInt(selectedItem.id), startTime.getTime(), end.getTime(), notes, selectedTask ? selectedTask.id : null, hoursPerDay)).then((updatedSchedules: any) => {
                      if (updatedSchedules) {
                        setItems(currentItems => mergeUpdatedSchedules(currentItems, updatedSchedules))
                      } else {
                        setToast({message: 'Could not save the change, try again later.', severity: 'error'})
                      }
                    })
                  }
                }}
                onClose={() =>
                  {
                    setSelectedItem(null)
                    setOpenForm(false)
                    setSelectedGroup(null)
                    setSelectedTask(null)
                    setScheduleEndTime(null)
                    setIsUserRowNote(false)
                  }}
                onAdd={(item: ItemInterface, updatedSchedules: any) => {
                  if (item) {
                    item.color = '#FFF'
                    item.selectedBgColor = '#CC6600'
                    setItems(oldItems => mergeUpdatedSchedules([...oldItems, item], updatedSchedules))
                  }
                }}
      />
      <TimelineProjectForm open={openProjectForm}
                           onClose={() => setOpenProjectForm(false)}
                           onAdd={(newGroup: GroupInterface) => {
                             if (newGroup) {
                               let groupIndex = 0;
                               for (const group of groups.slice().reverse()) {
                                 if (group.parent === newGroup.parent) {
                                   break;
                                 }
                                 groupIndex += 1
                               }
                               if (groupIndex === groups.length) {
                                 groupIndex = 0
                                 for (const group of groups.slice().reverse()) {
                                   if (group.id === newGroup.parent) {
                                     break;
                                   }
                                   groupIndex += 1
                                 }
                               }
                               if (groups.length > 0) {
                                 groupIndex = groups.length - groupIndex
                               }
                               setGroups((pre) => {
                                 return [...pre.slice(0, groupIndex),
                                   newGroup,
                                   ...pre.slice(groupIndex, groups.length)];
                               })
                             }
                           }}
                           selectedGroup={selectedGroup}/>
      {renderedGroups.length > 0 ?
        <Timeline
          horizontalLineClassNamesForGroup={(group) => group.root ? ["row-root"] : []}
          sidebarWidth={SIDEBAR_WIDTH}
          groups={renderedGroups}
          items={renderedItems}
          keys={keys}
          sidebarContent={<div>Planning</div>}
          itemsSorted
          itemTouchSendsClick={false}
          itemHeightRatio={0.9}
          lineHeight={60}
          showCursorLine
          dragSnap={60 * 24 * 60 * 1000}
          timeSteps={{
            year: 1,
            month: 1,
            day: 1,
            hour: 1
          }}
          visibleTimeStart={visibleTime.start}
          visibleTimeEnd={visibleTime.end}
          onTimeChange={(start, end, updateScrollCanvas) => {
            setVisibleTime({start, end})
            updateScrollCanvas(start, end)
          }}
          onItemMove={handleItemMove}
          onItemResize={handleItemResize}
          itemRenderer={itemRenderer}
          minZoom={60 * 60 * 1000 * 24 * 30}
          maxZoom={60 * 60 * 1000 * 24 * 30}
          onCanvasClick={handleCanvasClick}>
          <TimelineHeaders className="sticky">
            <SidebarHeader>
              {({ getRootProps }) => {
                return (
                  <div {...getRootProps()} style={{ width: `${SIDEBAR_WIDTH}px`}}>
                  </div>
                )
              }}
            </SidebarHeader>
            <DateHeader
                unit="primaryHeader"
                intervalRenderer={({ getIntervalProps, intervalContext, data }) => {
                  return <div {...getIntervalProps()} className='DateHeaderContainer' onClick={() => {}}>
                    <div className='DateHeaderText'>
                      {intervalContext.intervalText}
                    </div>
                  </div>
                }} />
            <DateHeader />
          </TimelineHeaders>
          <TimelineMarkers>
            <TodayMarker>
              {({styles}) => <div className={'today-marker'} style={{...styles, width: 2}}/>}
            </TodayMarker>
          </TimelineMarkers>
        </Timeline> : <div className={'planner-empty'}>{props.searchValue ? `No results for "${props.searchValue}"` : (props.filters && hasActiveFilters(props.filters) ? 'Nothing matches the current filters' : 'No Data')}</div>}
    </div>
    );
})
