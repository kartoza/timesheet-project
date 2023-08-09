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
import ItemForm from "./TimelineItemForm";
import AddBoxIcon from '@mui/icons-material/AddBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import {Button, TextField, InputAdornment, Backdrop, CircularProgress} from "@mui/material";
import TimelineProjectForm from "./TimelineProjectForm";
import SearchIcon from '@mui/icons-material/Search';

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
  color?: string,
  bgColor?: string,
  selectedBgColor?: string,
  canMove?: boolean,
  task_label?: string
}

export interface GroupInterface {
  id: string,
  root: boolean,
  parent: string,
  title: string,
  rightTitle?: string,
  userId?: string,
  projectId?: string
}

interface TimelinePlannerInterface {
  searchValue?: string
}

export default function TimelineDashboard() {
  const timelinePlanner = useRef(null);
  const [searchText, setSearchText] = useState<string | undefined>(undefined)
  const toggleAllGroups = () => {
    if (timelinePlanner.current) {
      (timelinePlanner.current as any).toggleAllGroups();
    }
  }

  return (
    <div>
      <TimelineSearchInput searchValue={searchText} onChange={(value) => setSearchText(value)} toggleAllGroups={toggleAllGroups} />
      <TimelinePlanner searchValue={searchText} ref={timelinePlanner}/>
    </div>
  )
}

const ItemSelectedColor = '#c19e16'

function TimelineSearchInput({searchValue, onChange, toggleAllGroups}) {
  const [searchText, setSearchText] = useState<string>('')
  const [focus, setFocus] = useState<boolean>(true)

  useEffect(() => {
    setSearchText(searchValue);
  }, [searchValue]);

  useEffect(() => {
    setFocus(true)
  }, [searchText])

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
                     <IndeterminateCheckBoxIcon style={{ cursor: 'pointer', color: searchText ? 'gray' : 'black' }} onClick={() => toggleAllGroups()}/>
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
  const [openGroups, setOpenGroups] = useState<any>({})
  const [openForm, setOpenForm] = useState<boolean>(false)
  const [openProjectForm, setOpenProjectForm] = useState<boolean>(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupInterface | null>(null)
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useImperativeHandle(ref, () => ({
    toggleAllGroups(newStatus = OpenCloseStatus.CLOSE) {
      toggleAll(newStatus)
    },
  }));

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
              const group = item.group ? groups.find(group => parseInt(group.id, 10) === item.group) : null;
              return Object.assign({}, item, {
                id: parseInt(item.id) * 1000,
                color: '#FFF',
                selectedBgColor: ItemSelectedColor,
                canMove: false,
                canResize: false,
                group: group ? group.parent : 0,
                title: group ? group.title : item.title
              })
          });
      setItems((oldItems) => [...oldItems, ...groupItems])
    } else {
      const groupItems = items.filter(item => item.group ? openedGroups.includes(item.group) && item.task_label !== '-' : false).map(item => item.id)
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
                <IndeterminateCheckBoxIcon style={{ color: props.searchValue ? 'gray' : 'black' }}/> : <AddBoxIcon style={{ color: props.searchValue ? 'gray' : 'black' }}/>} {group.rightTitle} <div className={'add-project-container'}>
                  { canEdit ? <Button onClick={(event) => {
                    event.stopPropagation()
                    handleProjectAdd(group.id)
                  }} sx={{ m: 0, p: 0 }} variant={'contained'} size={'small'} style={{ fontSize: 10, minWidth: 35 }}>Add</Button> : null }
              </div>
            </div>
          ) : (
            <div style={{ paddingLeft: 20 }}>{group.rightTitle}</div>
          )
        });
      })
    )
  }

  const filterGroups = (searchText: string) => {
    const searchValue = searchText.toLowerCase()
    const updatedGroups = groups.filter((group) => {
      const groupTitle = group.rightTitle ? group.rightTitle.toLowerCase() : ''
      if (group.root && !groupTitle.includes(searchValue)) {
        const children = groups.filter(childGroup => childGroup.parent === group.id)
        if (children.length > 0) {
          return children.filter(child => child.rightTitle ? child.rightTitle.toLowerCase().includes(searchValue) : false).length > 0
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
        let startTime = new Date(schedule.start_time)
        let endTime = new Date(schedule.end_time)
        startTime = new Date(Date.UTC(startTime.getFullYear(), startTime.getMonth(), startTime.getDate()));
        endTime = new Date(Date.UTC(endTime.getFullYear(), endTime.getMonth(), endTime.getDate()));
        startTime.setHours(0)
        startTime.setMinutes(0)
        startTime.setSeconds(0)
        endTime.setHours(0)
        endTime.setMinutes(0)
        endTime.setSeconds(0)
        endTime.setDate(endTime.getDate() + 1);
        return Object.assign({}, schedule, {
          title: schedule.task_name,
          info: schedule.task_label,
          start: startTime.getTime(),
          end: endTime.getTime(),
          color: '#FFF',
          bgColor: getColorFromTaskLabel(schedule.task_label),
          selectedBgColor: ItemSelectedColor,
          canSelect: _canEdit,
          canChangeGroup: false,
          canMove: _canEdit,
          canResize: _canEdit
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

  const itemRenderer = ({ item, timelineContext, itemContext, getItemProps, getResizeProps }) => {
    const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();

    const backgroundColor = itemContext.selected ? (itemContext.dragging ? "red" : item.selectedBgColor) : item.bgColor;
    const taskTimeInfo = item.info.replace( /(^.*\(|\).*$)/g, '' )
    const usedHour = parseFloat(taskTimeInfo.split('/')[0])
    const totalHour = parseFloat(taskTimeInfo.split('/')[1])
    const totalDays = totalHour/7
    const remainingHour = totalHour - usedHour
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
    const background = item.task_label !== '-' ? `linear-gradient(90deg, ${firstColor} 0%, ${lastColor} 100%)` : '#626262';
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
      >
        {itemContext.useResizeHandle ? <div {...leftResizeProps} /> : null}
        <div
          className={'timeline-item'}
          style={{
            background: background,
            borderRadius: '4px'
          }}
        >
          <div className={'timeline-item-title'}>{itemContext.title}</div>
          <div className={'timeline-item-sub'}>
            {countdown.map(day => <div className={'timeline-item-countdown'} style={countDownStyle}>
              <div className={'timeline-item-sub-text'}>{!isNaN(day) ? day : ''}</div> </div>)}
          </div>
          { canEdit && item.task_label !== '-' ? <div className={'remove-item'} onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            deleteItem(item.id)
          }}>✕</div> : null }
        </div>

        {itemContext.useResizeHandle ? <div {...rightResizeProps} /> : null}
      </div>
    );
  };

  return (
    <div>
      <Backdrop open={loading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
      
      <ItemForm open={openForm} selectedGroup={selectedGroup} startTime={selectedTime}
                onClose={() =>
                  {
                    setOpenForm(false)
                    setSelectedGroup(null)
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
          items={items}
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
            <DateHeader unit="primaryHeader" />
            <DateHeader />
          </TimelineHeaders>
          <TimelineMarkers>
            <TodayMarker />
          </TimelineMarkers>
        </Timeline> : <div style={{ marginLeft: '235px', paddingTop: '20px' }}>No Data</div>}
    </div>
    );
})
