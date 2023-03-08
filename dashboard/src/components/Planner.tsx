import React, {Component, useEffect, useState} from "react";
import moment from "moment";

import "react-calendar-timeline/lib/Timeline.css";
import Timeline from "react-calendar-timeline";

import generateFakeData from "../utils/generate_fake_data";
import {fetchSchedules, fetchSlottedProjects} from "../utils/schedule_data";

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
  end: number
}

interface GroupInterface {
  id: string,
  root: boolean,
  parent: string,
  title: string
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

  const toggleGroup = id => {
    console.log('toggleGroup', id)
    setOpenGroups({
        ...openGroups,
        [id]: !openGroups[id]
      });
  };

  useEffect(() => {
    const data = generateFakeData()
    console.log('fakeData', data);

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
        const startTime = moment.unix(schedule.start/1000).toDate();
        const endTime = moment.unix(schedule.end/1000).toDate();
        startTime.setHours(0)
        startTime.setMinutes(0)
        startTime.setSeconds(0)
        endTime.setHours(0)
        endTime.setMinutes(0)
        endTime.setSeconds(0)
        return Object.assign({}, schedule, {
          start: startTime.getTime(),
          end: endTime.getTime()
        })
      }))
    }

    if (groups.length > 0) {
      fetchData().catch(console.error);
    }
  }, [groups])

  const handleItemMove = (itemId, dragTime, newGroupOrder) => {
    const group = groups[newGroupOrder];
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

  return (
      groups.length > 0 ?
        <Timeline
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
            hour: 1
          }}
          defaultTimeStart={defaultTimeStart}
          defaultTimeEnd={defaultTimeEnd}
          onItemMove={handleItemMove}
          onItemResize={handleItemResize}
        /> : <div></div>
    );
}
