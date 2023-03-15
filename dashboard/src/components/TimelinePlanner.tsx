import React, {useEffect, useState, useCallback} from "react";
import moment from "moment";

import "react-calendar-timeline/lib/Timeline.css";
import Timeline, {TimelineMarkers, TodayMarker, TimelineHeaders,
  SidebarHeader, DateHeader} from "react-calendar-timeline";

import {
  deleteSchedule, fetchSchedules, fetchSlottedProjects, updateSchedule
} from "../utils/schedule_data";
import {getColorFromTaskLabel} from "../utils/Theme";
import '../styles/Planner.scss';
import ItemForm from "./TimelineItemForm";
import AddBoxIcon from '@mui/icons-material/AddBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import {Button, TextField, InputAdornment} from "@mui/material";
import TimelineProjectForm from "./TimelineProjectForm";
import SearchIcon from '@mui/icons-material/Search';

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
  group?: number,
  title?: string,
  color?: string,
  bgColor?: string,
  selectedBgColor?: string,
  canMove?: boolean
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
  const [searchText, setSearchText] = useState<string | undefined>(undefined)
  return (
    <div>
      <TimelineSearchInput searchValue={searchText} onChange={(value) => setSearchText(value)} />
      <TimelinePlanner searchValue={searchText}/>
    </div>
  )
}

const ItemSelectedColor = '#c19e16'

function TimelineSearchInput({searchValue, onChange}) {
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
                   height: '100%', width: '225px',
                   position: 'absolute', backgroundColor: '#FFF'
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
                   </InputAdornment>)
                 }}
  />)
}

const DEFAULT_TIME_START = moment()
      .startOf("month")
      .valueOf()
const DEFAULT_TIME_END = moment()
      .startOf("month")
      .add(1, "month")
      .valueOf()

function TimelinePlanner(props: TimelinePlannerInterface) {
  const [groups, setGroups] = useState<GroupInterface[]>([])
  const [renderedGroups, setRenderedGroups] = useState<GroupInterface[]>([])
  const [items, setItems] = useState<ItemInterface[]>([])
  const [openGroups, setOpenGroups] = useState<any>({})
  const [openForm, setOpenForm] = useState<boolean>(false)
  const [openProjectForm, setOpenProjectForm] = useState<boolean>(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupInterface | null>(null)
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)

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
          stackItems: false,
          height: 50,
          title: group.root ? (
            <div className={"root-parent"} onClick={() => toggleGroup(parseInt(group.id))}>
              {_openGroups[parseInt(group.id)] ?
                <IndeterminateCheckBoxIcon/> : <AddBoxIcon/>} {group.rightTitle} <div className={'add-project-container'}>
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

  useEffect(() => {
    const fetchData = async () => {
      const schedules: any = await fetchSchedules();
      setItems(schedules.map(schedule => {
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
        endTime.setDate(endTime.getDate());
        return Object.assign({}, schedule, {
          title: schedule.task_name,
          info: schedule.task_label,
          start: startTime.getTime(),
          end: endTime.getTime(),
          color: '#FFF',
          bgColor: getColorFromTaskLabel(schedule.task_label),
          selectedBgColor: ItemSelectedColor,
          canChangeGroup: false,
          canMove: canEdit,
          canResize: canEdit
        })
      }))
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
      updateGroups(groups)
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
      const groupItems = items.filter(item => item.group ? item.group === id : false).map(item => item.id)
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
        deleteSchedule(
          item.id
        ).then(result => {
          if (result) {
            setItems((current) => current.filter((currentItem) => currentItem.id !== itemId));
          }
        })
      }
    }
  }, [items])

  const handleItemMove = (itemId, dragTime, newGroupOrder) => {
    const group = renderedGroups[ newGroupOrder ];
    if (group.root) {
      return false;
    }
    const item = items.find(item => item.id === itemId)
    if (item) {
      setItems(items.map(item => item.id === itemId ? Object.assign({}, item, {
        start: dragTime,
        end: dragTime + (item.end - item.start),
        group: group.id
      }) : item))
      updateSchedule(itemId, dragTime, dragTime + (item.end - item.start)).then(updatedSchedule => {
        console.log('moved', updatedSchedule)
      })
    }
  };

  const handleItemResize = (itemId, time, edge) => {
    const item = items.find(item => item.id === itemId)
    if (item) {
      setItems(
        items.map(item =>
          item.id === itemId
            ? Object.assign({}, item, {
                start: edge === "left" ? time : item.start,
                end: edge === "left" ? item.end : time
              })
            : item
        )
      )
      updateSchedule(itemId, edge === "left" ? time : item.start, edge === "left" ? item.end : time).then(updatedSchedule => {
        console.log('resized', updatedSchedule)
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

  const itemRenderer = ({ item, timelineContext, itemContext, getItemProps, getResizeProps }) => {
    const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
    const backgroundColor = itemContext.selected ? (itemContext.dragging ? "red" : item.selectedBgColor) : item.bgColor;
    return (
      <div
        {...getItemProps({
          style: {
            backgroundColor,
            color: item.color,
            border: 'unset',
            borderColor: itemContext.resizing ? "red" : item.color,
            borderStyle: "solid",
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderRadius: 4,
            borderLeftWidth: itemContext.selected ? 3 : 1,
            borderRightWidth: itemContext.selected ? 3 : 1,
          },
          onMouseDown: () => {
            console.log("on item click", item);
          }
        })}
      >
        {itemContext.useResizeHandle ? <div {...leftResizeProps} /> : null}
        <div
          className={'timeline-item'}
        >
          <div className={'timeline-item-title'}>{itemContext.title}</div>
          <div className={'timeline-itme-sub'}>{item.info.replace( /(^.*\(|\).*$)/g, '' )}</div>
          { canEdit ? <div className={'remove-item'} onClick={(e) => {
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
      <ItemForm open={openForm} selectedGroup={selectedGroup} startTime={selectedTime}
                onClose={() =>
                  {
                    setOpenForm(false)
                    setSelectedGroup(null)
                  }}
                onAdd={(item: ItemInterface) => {
                  if (item) {
                    item.color = '#FFF'
                    item.selectedBgColor = '#CC6600'
                    setItems(oldItems => [...oldItems, item]);
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
          itemHeightRatio={0.75}
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
          onCanvasClick={handleCanvasClick}>
          <TimelineHeaders>
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
}
