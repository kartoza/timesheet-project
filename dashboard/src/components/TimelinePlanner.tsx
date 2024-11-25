import React, {
  useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle
} from "react";
import moment from "moment";

import "react-calendar-timeline/lib/Timeline.css";
import Timeline, {TimelineMarkers, TodayMarker, TimelineHeaders,
  SidebarHeader, DateHeader} from "react-calendar-timeline";

import {
  deleteSchedule,
  fetchSchedules,
  fetchSlottedProjects,
  updateSchedule
} from "../utils/schedule_data";
import {getColorFromTaskLabel, getTaskColor} from "../utils/Theme";
import '../styles/Planner.scss';
import ItemForm, {ItemTaskInterface} from "./TimelineItemForm";
import AddBoxIcon from '@mui/icons-material/AddBox';
import ClearIcon from '@mui/icons-material/Clear';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import {Button, TextField, InputAdornment, Backdrop, CircularProgress, Typography, Popover} from "@mui/material";
import TimelineProjectForm from "./TimelineProjectForm";
import SearchIcon from '@mui/icons-material/Search';
const CircularMenu = React.lazy(() => import('./Menu'));

export const canEdit = (window as any).isStaff

enum OpenCloseStatus {
    OPEN = "OPEN",
    CLOSE = "CLOSE"
}

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
  group?: number,
  title?: string,
  info?: string,
  color?: string,
  bgColor?: string,
  selectedBgColor?: string,
  canMove?: boolean,
  task_label?: string,
  task_id?: string,
  notes?: string,
  hoursPerDay?: number
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
  searchValue?: string
}

export default function TimelineDashboard() {
  const timelinePlanner = useRef(null);
  const [searchText, setSearchText] = useState<string | undefined>(undefined)
  const toggleAllGroups = (newStatus: OpenCloseStatus) => {
    if (timelinePlanner.current) {
      (timelinePlanner.current as any).toggleAllGroups(newStatus);
    }
  }

  return (
    <div>
      <CircularMenu/>
      <TimelineSearchInput searchValue={searchText} onChange={(value) => setSearchText(value)} toggleAllGroups={toggleAllGroups} />
      <TimelinePlanner searchValue={searchText} ref={timelinePlanner}/>
    </div>
  )
}

const ItemSelectedColor = '#c19e16'

function TimelineSearchInput({searchValue, onChange, toggleAllGroups}) {
  const [searchText, setSearchText] = useState<string>('')
  const [focus, setFocus] = useState<boolean>(true)
  const [currentToggle, setCurrentToggle] = (
      useState<OpenCloseStatus>(OpenCloseStatus.OPEN)
  )

  useEffect(() => {
    setSearchText(searchValue);
  }, [searchValue]);

  useEffect(() => {
    setFocus(true)
  }, [searchText])

  const Icon = (
      currentToggle === OpenCloseStatus.OPEN ? IndeterminateCheckBoxIcon : AddBoxIcon
  )

  return (<TextField id="timeline-filter"
                 style={{
                   width: '225px', zIndex: 999,
                   position: 'fixed', backgroundColor: '#FFF'
                 }}
                 hiddenLabel
                 variant="filled"
                 size={'small'}
                 value={searchText}
                 focused={focus}
                 className={'timeline-filter'}
                 onChange={(e) => {
                   const caretStart = e.target.selectionStart;
                   const caretEnd = e.target.selectionEnd;
                   const value = e.target.value;
                   setSearchText(value);
                   onChange(value);
                   e.target.setSelectionRange(caretStart, caretEnd);
                 }}
                 InputProps={{
                   startAdornment: (<InputAdornment position="start">
                     <SearchIcon/>
                   </InputAdornment>),
                   endAdornment: (<InputAdornment position="end">
                     <Icon style={{ cursor: 'pointer', color: searchText ? 'gray' : 'black' }}
                                                onClick={() => {
                                                  if (searchText) {
                                                    return;
                                                  }
                                                  if (currentToggle === OpenCloseStatus.CLOSE) {
                                                    toggleAllGroups(OpenCloseStatus.OPEN)
                                                    setCurrentToggle(OpenCloseStatus.OPEN)
                                                  } else {
                                                    toggleAllGroups(OpenCloseStatus.CLOSE);
                                                    setCurrentToggle(OpenCloseStatus.CLOSE);
                                                  }
                                                  return;
                                                }}/>
                   </InputAdornment>)
                 }}
  />)
}

const DEFAULT_TIME_START = moment()
      .startOf("week")
      .valueOf()
const DEFAULT_TIME_END = moment()
      .startOf("week")
      .add(3, "week")
      .valueOf()

const TimelinePlanner = forwardRef((props: TimelinePlannerInterface, ref) => {
  const [groups, setGroups] = useState<GroupInterface[]>([])
  const [renderedGroups, setRenderedGroups] = useState<GroupInterface[]>([])
  const [items, setItems] = useState<ItemInterface[]>([])
  const [renderedItems, setRenderedItems] = useState<ItemInterface[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemInterface | null>(null)
  const [openGroups, setOpenGroups] = useState<any>({})
  const [openForm, setOpenForm] = useState<boolean>(false)
  const [openProjectForm, setOpenProjectForm] = useState<boolean>(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupInterface | null>(null)
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)
  const [scheduleEndTime, setScheduleEndTime] = useState<Date | null>(null)
  const [selectedTask, setSelectedTask] = useState<ItemTaskInterface | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [popoverText, setPopoverText] = useState<string>('')

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>, text: string) => {
    let updatedText: any = text;
    if (text.includes('div')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      const paragraphs = doc.querySelectorAll('p');
      paragraphs.forEach(p => {
          updatedText = p.textContent;
      });
    }
    setPopoverText(updatedText)
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const popoverOpen = Boolean(anchorEl);

  useImperativeHandle(ref, () => ({
    toggleAllGroups(newStatus = OpenCloseStatus.CLOSE) {
      toggleAll(newStatus)
    },
  }));

  useEffect(() => {
    setRenderedItems(items);
  }, [items]);

  const toggleAll = (newStatus = OpenCloseStatus.CLOSE) => {
    if (typeof props.searchValue !== 'undefined' && props.searchValue !== "") {
      return
    }
    const openedGroups: any[] = [];
    for (const openGroupId of Object.keys(openGroups)) {
      if (openGroupId !== 'undefined') {
        if (openGroups[parseInt(openGroupId)] === (newStatus === OpenCloseStatus.CLOSE)) {
          openedGroups.push(parseInt(openGroupId))
        }
      }
    }
    if (newStatus === OpenCloseStatus.CLOSE) {
      const childrenGroups = groups
        .filter(group => openedGroups.includes(group.parent))
        .map(group => '' + group.id);

      // Filter items by group and modify them as necessary
      const groupItems = items
          .filter(item => item.group ? childrenGroups.includes('' + item.group) : false)
          .map(item => {
              const group = item.group ? groups.find(
                  group => parseInt(group.id, 10) === item.group
              ) : null;
              return Object.assign({}, item, {
                id: parseInt(item.id) * 1000,
                color: '#FFF',
                selectedBgColor: ItemSelectedColor,
                canMove: false,
                canResize: false,
                task_id: item.task_id,
                task_label: item.task_label,
                group: group ? group.parent : 0,
                title: group ? group.title : item.title
              })
          });
      setItems((oldItems) => [...oldItems, ...groupItems])
    } else {
      const groupItems = items.filter(
          item => item.group ? openedGroups.includes(
              item.group) && item.task_label !== '-' : false
      ).map(item => item.id)
      if (groupItems.length > 0) {
        setItems(items.filter(item => !groupItems.includes(item.id)))
      }
    }
    setOpenGroups(prevOpenGroups => {
      let newOpenGroups = {...prevOpenGroups};
      for (let key of Object.keys(newOpenGroups)) {
        newOpenGroups[key] = newStatus === OpenCloseStatus.OPEN;
      }
      return newOpenGroups;
    });
  }

  const removeProjectFromUser = (userId?: string, projectId?: string, groupId?: string) => {
    if (!userId || !projectId || !groupId) return;
    let confirmation = confirm('Are you sure?')
    if (confirmation) {
      setLoading(true);
      const url = '/api/remove-user-project-slot/';
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('project_id', projectId);
      fetch(url, {
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
          setLoading(false);
          if (result['detail'] === 'Not found.') {
            alert('Could not delete the project, try again later.')
          } else {
            setGroups(groups.filter(group => group.id !== groupId));
            updateGroups(renderedGroups.filter(g => g.id !== groupId));
            setSelectedGroup(null);
          }
        })
    }
  }

  const updateGroups = (groupsData: GroupInterface[]) => {
    let _openGroups = openGroups;
    if (renderedGroups.length === 0) {
      for (const group of groupsData) {
        if (group.root) {
          if (!(group.parent in _openGroups)) {
            _openGroups[group.parent] = false
          }
        }
        if (group.parent) {
          _openGroups[group.parent] = true
        }
      }
      setOpenGroups(_openGroups)
    }
    setRenderedGroups(groupsData
      .filter(g => g.root || _openGroups[g.parent])
      .map(group => {
        return Object.assign({}, group, {
          stackItems: true,
          title: group.root ? (
            <div className={"root-parent"} onClick={() => toggleGroup(parseInt(group.id))}>
              {_openGroups[parseInt(group.id)] ?
                <IndeterminateCheckBoxIcon style={{ color: props.searchValue ? 'gray' : 'black' }}/> :
                  <AddBoxIcon style={{ color: props.searchValue ? 'gray' : 'black' }}/>} {group.rightTitle}
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
        });
      })
    )
  }

  const updateRenderedItems = (searchValue: string) => {
    if (!searchValue) {
      setRenderedItems(items)
    } else {
      setRenderedItems(items.filter(schedule => schedule.info ? schedule.info.toLowerCase().includes(searchValue) : false))
    }
  }

  const filterGroups = (searchText: string) => {
    const searchValue = searchText.toLowerCase()
    updateRenderedItems(searchValue);
    const updatedGroups = groups.filter((group) => {
      const groupTitle = group.rightTitle ? group.rightTitle.toLowerCase() : ''
      if (group.root && !groupTitle.includes(searchValue)) {
        const children = groups.filter(
            childGroup => childGroup.parent === group.id
        )
        if (children.length > 0) {
          return children.filter(
              child => child.rightTitle ?
                  child.rightTitle.toLowerCase().includes(searchValue) : false).length > 0
        }
      }
      if (!group.root && !groupTitle.includes(searchValue)) {
        const parent = groups.find(_group => _group.id === group.parent)
        if (parent) {
          return parent.rightTitle ? parent.rightTitle.toLowerCase().includes(searchValue) : false
        }
      }
      return groupTitle.includes(searchValue)
    })
    updateGroups(updatedGroups)
  }

  useEffect(() => {
    const fetchData = async () => {
      const schedules: any = await fetchSchedules();
      setItems(schedules.map(schedule => {
        const _canEdit = canEdit && schedule.task_label !== '-';
        let startTimeStr = schedule.start_time.split('T')[0].split('-');
        let year = parseInt(startTimeStr[0], 10);
        let month = parseInt(startTimeStr[1], 10) - 1;
        let day = parseInt(startTimeStr[2], 10);
        let startTime = new Date(year, month, day);
        startTime.setHours(0, 0, 0, 0);

        let endTimeStr = schedule.end_time.split('T')[0].split('-');
        year = parseInt(endTimeStr[0], 10);
        month = parseInt(endTimeStr[1], 10) - 1;
        day = parseInt(endTimeStr[2], 10);
        let endTime = new Date(year, month, day);
        endTime.setHours(0, 0, 0, 0);

        endTime.setDate(endTime.getDate() + 1)
        return Object.assign({}, schedule, {
          title: schedule.task_name,
          info: schedule.project_name + ' : ' + schedule.task_label + schedule.user,
          desc: schedule.title,
          start: startTime.getTime(),
          end: endTime.getTime(),
          color: '#FFF',
          bgColor: getColorFromTaskLabel(schedule.task_label),
          selectedBgColor: ItemSelectedColor,
          canSelect: _canEdit,
          canChangeGroup: false,
          canMove: _canEdit,
          canResize: _canEdit,
          hoursPerDay: schedule.hours_per_day
        })
      }))
      setLoading(false)
    }
    if (groups.length > 0) {
      updateGroups(groups)
      if (items.length === 0) {
        fetchData().catch(console.error);
      }
    }
  }, [groups])

  useEffect(() => {
    if (items.length > 0) {
      const searchText = props.searchValue;
      if (searchText !== null && typeof searchText !== 'undefined') {
        filterGroups(searchText)
      } else {
        updateGroups(groups)
      }
    }
  }, [items])

  useEffect(() => {
    if (groups.length > 0 && Object.keys(openGroups).length > 0) {
      updateGroups(groups)
    }
  }, [openGroups])

  useEffect(() => {
    let searchText = ''
    if (typeof props.searchValue === 'undefined') {
      return
    } else {
      searchText = props.searchValue
    }
    if (searchText !== null) {
      filterGroups(searchText)
    }
  }, [props])

  useEffect(() => {
    if (groups.length === 0) {
      fetchSlottedProjects().then((groupsData: GroupInterface[]) => {
        if (groupsData.length > 0) {
          setGroups(groupsData)
        }
      });
    }
  }, [])

  const handleProjectAdd = (groupId) => {
    const group = groups.find(group => group.id === groupId)
    if (group) {
      setSelectedGroup(group)
      setOpenProjectForm(true)
    }
  }

  const toggleGroup = useCallback((id) => {
    if (typeof props.searchValue !== 'undefined' && props.searchValue !== "") {
      return
    }
    if (openGroups[id]) {
      const childrenGroups = groups.filter(group => group.parent === id).map(group => '' + group.id)
      const groupItems = items.filter(item => item.group ? childrenGroups.includes('' + item.group) : false).map(item => {
          const group = item.group ? groups.filter(group => parseInt(group.id) === item.group)[0] : null;
          return Object.assign({}, item, {
            id: parseInt(item.id) * 1000,
            color: '#FFF',
            selectedBgColor: ItemSelectedColor,
            canMove: false,
            canResize: false,
            group: id,
            title: group ? group.title : item.title
          })
        }
      )
      setItems((oldItems) => [...oldItems, ...groupItems])
    } else {
      const groupItems = items.filter(item => item.group ? item.group === id && item.task_label !== '-' : false).map(item => item.id)
      if (groupItems.length > 0) {
        setItems(items.filter(item => !groupItems.includes(item.id)))
      }
    }
    setOpenGroups({
        ...openGroups,
        [id]: !openGroups[id]
      });
  }, [items, groups, openGroups, props]);

  const deleteItem = useCallback((itemId: string) => {
    const item = items.find(item => item.id === itemId)
    if (item) {
      if (window.confirm('Are you sure you want to delete this record?')) {
        setLoading(true)
        deleteSchedule(
          item.id
        ).then(result => {
          setLoading(false)
          if (result['removed']) {
            const updatedSchedules = result.updated
            setItems(items.map(item => updatedSchedules[item.id] ? Object.assign({}, item, updatedSchedules[item.id]) : item).filter((currentItem) => currentItem.id !== itemId))
          }
        })
      }
    }
  }, [items])

  const handleItemMove = (itemId, dragTime, newGroupOrder) => {
    const group = renderedGroups[ newGroupOrder ];
    setLoading(true)
    if (group.root) {
      return false;
    }
    const item = items.find(item => item.id === itemId)
    if (item) {
      updateSchedule(itemId, dragTime, dragTime + (item.end - item.start)).then((updatedSchedules: any) => {
        setLoading(false)
        if (updatedSchedules) {
          setItems(items.map(item => updatedSchedules[item.id] ? Object.assign({}, item, updatedSchedules[item.id]) : item))
        }
      })
    }
  };

  const handleItemResize = (itemId, time, edge) => {
    const item = items.find(item => item.id === itemId)
    setLoading(true)
    if (item) {
      updateSchedule(itemId, edge === "left" ? time : item.start, edge === "left" ? item.end : time).then((updatedSchedules: any) => {
        setLoading(false)
        if (updatedSchedules) {
          setItems(items.map(item => updatedSchedules[item.id] ? Object.assign({}, item, updatedSchedules[item.id]) : item))
        }
      })
    }
  };

  const handleCanvasClick = (groupId, time, event) => {
    if (!canEdit) return
    if (openForm) return
    const group = groups.filter(group => group.id === groupId)[0]
    if (!group.root) {
      setSelectedTime(new Date(time))
      setSelectedGroup(group)
      setOpenForm(true)
    }
  }

  const isNotNullAndNumber = (item) => {
    return item !== null && typeof item === 'number';
  }

  const isPublicHoliday = (item: any) => {
    return item.title === 'Public holiday'
  }

  const isLeave = (item: any) => {
    return item.title.includes('Leave')
  }

  const itemRenderer = ({ item, timelineContext, itemContext, getItemProps, getResizeProps }) => {
    const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();

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
    const background = item.task_label !== '-' ? `linear-gradient(90deg, ${firstColor} 0%, ${lastColor} 100%)` : (item.title === 'Public holiday' ? '#42BF8B' : '#626262');
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
        onMouseEnter={(e: any) => {isPublicHoliday(itemContext) || isLeave(itemContext) ? handlePopoverOpen(e, item.desc) : null}}
        onMouseLeave={(e: any) => {isPublicHoliday(itemContext) || isLeave(itemContext) ? handlePopoverClose() : null}}
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
            isPublicHoliday(itemContext) ? <div dangerouslySetInnerHTML={{ __html: item.desc }}></div> : itemContext.title
          }</div>
          <div className={'timeline-item-sub'}>
            {isPublicHoliday(itemContext) ? '🏖️' :
              countdown.map(day => <div className={'timeline-item-countdown'} style={countDownStyle}>
                <div className={'timeline-item-sub-text'}>{!isNaN(day) ? day : ''}</div> </div>)
            }
          </div>
          { canEdit && item.task_label !== '-' ? <div className={'remove-item'} onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            deleteItem(item.id)
          }}>✕</div> : null }
          { canEdit && item.task_label !== '-' ?
          <div className={'edit-item'} onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            const group = groups.find(group => group.id === item.group)
            if (group) {
              setSelectedGroup(group)
            }
            const task: ItemTaskInterface = {
              id: item.task_id,
              label: item.task_label
            }
            setSelectedItem(item)
            setSelectedTime(item.start)
            setSelectedTask(task)
            setScheduleEndTime(item.end)
            setOpenForm(true)
          }}>✎</div> : null }
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
        <Typography sx={{ p: 1 }}>{popoverText}</Typography>
      </Popover>

      <ItemForm open={openForm}
                selectedGroup={selectedGroup}
                selectedTask={selectedTask}
                startTime={selectedTime}
                endTime={scheduleEndTime}
                hoursPerDay={selectedItem?.hoursPerDay}
                notes={selectedItem?.notes ? selectedItem.notes : ''}
                onUpdate={(startTime: Date, notes: string, selectedTask: ItemTaskInterface, duration: number, hoursPerDay: number) => {
                  if (selectedItem) {
                    setLoading(true)
                    const endTime = new Date(startTime.getTime())
                    const end = new Date(endTime.setDate(endTime.getDate() + duration));
                    updateSchedule(
                      parseInt(selectedItem.id), startTime.getTime(), end.getTime(), notes, selectedTask?.id, hoursPerDay).then((updatedSchedules: any) => {
                      setLoading(false)
                      if (updatedSchedules) {
                        setItems(items.map(item => updatedSchedules[item.id] ? Object.assign({}, item, updatedSchedules[item.id]) : item))
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
                  }}
                onAdd={(item: ItemInterface, updatedSchedules: any) => {
                  if (item) {
                    item.color = '#FFF'
                    item.selectedBgColor = '#CC6600'
                    setItems(oldItems => [...oldItems.map(oldItem => updatedSchedules[oldItem.id] ? Object.assign({}, oldItem, updatedSchedules[oldItem.id]) : oldItem), item]);
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
          sidebarWidth={225}
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
          defaultTimeStart={DEFAULT_TIME_START}
          defaultTimeEnd={DEFAULT_TIME_END}
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
                  <div {...getRootProps()} style={{ width: '225px'}}>
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
            <TodayMarker />
          </TimelineMarkers>
        </Timeline> : <div style={{ marginLeft: '235px', paddingTop: '20px' }}>No Data</div>}
    </div>
    );
})
