import React, {Component, useEffect, useState} from "react";
import moment from "moment";

import "react-calendar-timeline/lib/Timeline.css";
import Timeline, {TimelineMarkers, TodayMarker} from "react-calendar-timeline";

import generateFakeData from "../utils/generate_fake_data";
import {fetchSchedules, fetchSlottedProjects} from "../utils/schedule_data";
import {generateColor} from "../utils/Theme";
import TButton from "../loadable/Button";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Grid, CircularProgress
} from "@mui/material";
import '../styles/Planner.scss';
import { LocalizationProvider, DatePicker, TimePicker } from "@mui/x-date-pickers";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";

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
  selectedBgColor?: string
}

interface GroupInterface {
  id: string,
  root: boolean,
  parent: string,
  title: string,
  rightTitle?: string
}

interface ItemFormInterface {
  open: boolean,
  onClose: Function,
  onAdd: Function,
  selectedGroup: GroupInterface | null,
  startTime?: Date | null
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function ItemForm(props: ItemFormInterface) {
  const [open, setOpen] = useState<boolean>(false)
  const [startTime, setStartTime] = useState<any | null>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [duration, setDuration] = useState<number>(1)

  useEffect(() => {
    if (props.open) {
      setOpen(true)
      setDuration(1)
      setIsLoading(false)
    }
    if (props.startTime) {
      setStartTime(props.startTime)
    }
    if (props.selectedGroup) {
      console.log(props.selectedGroup)
    }
  }, [props])

  const handleClose = () => {
    if (isLoading) return
    setOpen(false)
    props.onClose()
  }

  const submitAdd = () => {
    setIsLoading(true)
    setTimeout(() => {
      startTime.setHours(0)
      startTime.setMinutes(0)
      startTime.setSeconds(0)
      const start = startTime.getTime()
      const end = new Date(startTime.setDate(startTime.getDate() + duration));
      props.onAdd({
        start: start,
        end: end,
        title: 'New task',
        group: props.selectedGroup ? props.selectedGroup.id : null
      })
      setIsLoading(false)
      setTimeout(() => {
        handleClose()
      }, 200)
    }, 500)
  }

  return (<Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          Add new data
        </Typography>
        <div>
           <LocalizationProvider dateAdapter={AdapterDateFns}>
             <Grid container spacing={2} style={{ marginTop: 10 }}>
               <Grid item xs={12} className="time-picker">
                 <TextField
                   id="project-text-input"
                   label="Project"
                   disabled={isLoading}
                   style={{ width: '100%' }}
                   value={props.selectedGroup ? props.selectedGroup.rightTitle : ''}
                   InputProps={{
                     readOnly: true,
                   }}
                 />
               </Grid>
               <Grid item xs={12} className="time-picker">
                 <DatePicker
                   value={startTime}
                   disabled={isLoading}
                   onChange={(newValue) => setStartTime(newValue)}
                   renderInput={(params) => <TextField {...params}
                                                       label='Start Time'
                                                       sx={{width: "100%"}}/>}
                 />
               </Grid>
               <Grid item xs={12}>
                 <TextField
                   id="duration-input"
                   label="Duration (day)"
                   style={{ width: '100%' }}
                   value={duration}
                   disabled={isLoading}
                   type={'number'}
                   onChange={(event) => {
                     const newDuration = parseInt(event.target.value);
                     setDuration(newDuration)
                   }}
                 />
               </Grid>
               <Grid item xs={12}>
                 <TButton color="success" variant="contained" size="large" sx={{width: '100%', marginTop: -1}}
                      onClick={submitAdd}
                      disabled={isLoading}
                      disableElevation>{isLoading ?
                      <CircularProgress color="inherit" size={20}/> : "Add"}
                 </TButton>
               </Grid>
             </Grid>
           </LocalizationProvider>
        </div>
      </Box>
    </Modal>
  )
}

export default function Planner() {
  const [groups, setGroups] = useState<GroupInterface[]>([])
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
  const [selectedGroup, setSelectedGroup] = useState<GroupInterface | null>(null)
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)

  const toggleGroup = id => {
    console.log('toggleGroup', id)
    setOpenGroups({
        ...openGroups,
        [id]: !openGroups[id]
      });
  };

  useEffect(() => {
    fetchSlottedProjects().then((groupsData: GroupInterface[]) => {
      if (groupsData.length > 0) {
        setGroups(groupsData
          .map(group => {
            return Object.assign({}, group, {
              title: group.root ? (
                <div style={{ cursor: "pointer" }}>
                  {group.title}
                </div>
              ) : (
                <div style={{ paddingLeft: 20 }}>{group.title}</div>
              )
            });
          })
        )
      }
    });
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

    if (groups.length > 0) {
      fetchData().catch(console.error);
    }
  }, [groups])

  const handleItemMove = (itemId, dragTime, newGroupOrder) => {
    const group = groups[newGroupOrder];
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
      {groups.length > 0 ?
        <Timeline
          horizontalLineClassNamesForGroup={(group) => group.root ? ["row-root"] : []}
          sidebarWidth={225}
          groups={groups}
          items={items}
          keys={keys}
          sidebarContent={<div>Planning</div>}
          itemsSorted
          itemTouchSendsClick={false}
          stackItems
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
