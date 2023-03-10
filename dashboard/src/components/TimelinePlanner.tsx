import React, {useEffect, useState, useCallback} from "react";
import moment from "moment";

import "react-calendar-timeline/lib/Timeline.css";
import Timeline, {TimelineMarkers, TodayMarker} from "react-calendar-timeline";

import {fetchSchedules, fetchSlottedProjects} from "../utils/schedule_data";
import {generateColor} from "../utils/Theme";
import '../styles/Planner.scss';
import ItemForm from "./TimelineItemForm";
import AddBoxIcon from '@mui/icons-material/AddBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import {Button} from "@mui/material";
import TimelineProjectForm from "./TimelineProjectForm";

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
  userId?: string
}

export default function TimelinePlanner() {
  const [groups, setGroups] = useState<GroupInterface[]>([])
  const [renderedGroups, setRenderedGroups] = useState<GroupInterface[]>([])
  const [items, setItems] = useState<ItemInterface[]>([])
  const [defaultTimeStart, setDefaultTimeStart] = useState<Date>(
    moment()
      .startOf("month")
      .toDate()
  )
  const [defaultTimeEnd, setDefaultTimeEnd] = useState<Date>(
    moment()
      .startOf("month")
      .add(1, "month")
      .toDate()
  )
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
          title: group.root ? (
            <div className={"root-parent"} onClick={() => toggleGroup(parseInt(group.id))}>
              {_openGroups[parseInt(group.id)] ?
                <IndeterminateCheckBoxIcon/> : <AddBoxIcon/>} {group.rightTitle} <div className={'add-project-container'}>
                  <Button onClick={(event) => {
                    event.stopPropagation()
                    handleProjectAdd(group.id)
                  }} sx={{ m: 0, p: 0 }} variant={'contained'} size={'small'} style={{ fontSize: 10, minWidth: 35 }}>Add</Button>
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
    if (groups.length > 0) {
      updateGroups(groups)
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
    if (groups.length === 0) {
      fetchSlottedProjects().then((groupsData: GroupInterface[]) => {
        if (groupsData.length > 0) {
          setGroups(groupsData)
        }
      });
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const schedules: any = await fetchSchedules();
      setItems(schedules.map(schedule => {
        let startTime = new Date(schedule.start_time)
        let endTime = new Date(schedule.end_time)
        startTime = new Date(Date.UTC(startTime.getUTCFullYear(), startTime.getUTCMonth(), startTime.getUTCDate()));
        endTime = new Date(Date.UTC(endTime.getUTCFullYear(), endTime.getUTCMonth(), endTime.getUTCDate()));
        startTime.setHours(0)
        startTime.setMinutes(0)
        startTime.setSeconds(0)
        endTime.setHours(0)
        endTime.setMinutes(0)
        endTime.setSeconds(0)
        endTime.setDate(endTime.getDate() + 1);
        return Object.assign({}, schedule, {
          title: 'Coding Task',
          start: startTime.getTime(),
          end: endTime.getTime(),
          color: '#FFF',
          bgColor: generateColor(schedule.project_name),
          selectedBgColor: '#CC6600'
        })
      }))
    }

    if (groups.length > 0 && items.length === 0) {
      fetchData().catch(console.error);
    }
  }, [groups])

  const handleProjectAdd = (groupId) => {
    const group = groups.find(group => group.id === groupId)
    if (group) {
      setSelectedGroup(group)
      setOpenProjectForm(true)
    }
  }

  const toggleGroup = useCallback((id) => {
    if (openGroups[id]) {
      const childrenGroups = groups.filter(group => group.parent === id).map(group => '' + group.id)
      const groupItems = items.filter(item => item.group ? childrenGroups.includes('' + item.group) : false).map(item => {
          const group = item.group ? groups.filter(group => parseInt(group.id) === item.group)[0] : null;
          return Object.assign({}, item, {
            id: parseInt(item.id) * 1000,
            color: '#FFF',
            bgColor: '#242474',
            selectedBgColor: '#CC6600',
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
  }, [items, groups, openGroups]);

  const handleItemMove = (itemId, dragTime, newGroupOrder) => {
    const group = renderedGroups[newGroupOrder];
    if (group.root) {
      return false;
    }
    setItems(items.map(item =>
      item.id === itemId
        ? Object.assign({}, item, {
            start: dragTime,
            end: dragTime + (item.end - item.start),
            group: group.id
          })
        : item
    ))
    console.log("Moved", itemId, dragTime, newGroupOrder);
  };

  const handleItemResize = (itemId, time, edge) => {
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
    console.log("Resized", itemId, time, edge);
  };

  const handleCanvasClick = (groupId, time, event) => {
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
            borderRightWidth: itemContext.selected ? 3 : 1
          },
          onMouseDown: () => {
            console.log("on item click", item);
          }
        })}
      >
        {itemContext.useResizeHandle ? <div {...leftResizeProps} /> : null}
        <div
          style={{
            height: itemContext.dimensions.height,
            overflow: "hidden",
            paddingLeft: 3,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {itemContext.title}
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
                    let lastId = items[items.length - 1].id
                    item.id = lastId + 1
                    item.color = '#FFF'
                    item.bgColor = selectedGroup ? generateColor(selectedGroup.rightTitle ? selectedGroup.rightTitle : '') : '#FFF'
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
          }}
          defaultTimeStart={defaultTimeStart}
          defaultTimeEnd={defaultTimeEnd}
          onItemMove={handleItemMove}
          onItemResize={handleItemResize}
          itemRenderer={itemRenderer}
          onCanvasClick={handleCanvasClick}>
          <TimelineMarkers>
            <TodayMarker />
          </TimelineMarkers>
        </Timeline> : <div></div>}
    </div>
    );
}
