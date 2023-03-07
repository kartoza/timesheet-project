import React, {Component, useEffect, useState} from "react";
import moment from "moment";

import "react-calendar-timeline/lib/Timeline.css";
import Timeline from "react-calendar-timeline";

import generateFakeData from "../utils/generate_fake_data";

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


export default class Planner extends Component {
  constructor(props) {
    super(props);

    const { groups, items } = generateFakeData();

    const defaultTimeStart = moment()
      .startOf("month")
      .toDate();
    const defaultTimeEnd = moment()
      .startOf("month")
      .add(1, "month")
      .toDate();
    const openGroups = {}
     // convert every 2 groups out of 3 to nodes, leaving the first as the root
    const newGroups = groups.map(group => {
      const isRoot = (parseInt(group.id) - 1) % 3 === 0;
      const parent = isRoot ? null : Math.floor((parseInt(group.id) - 1) / 3) * 3 + 1;

      if (isRoot) {
        openGroups[group.id] = true
      }
      return Object.assign({}, group, {
        root: isRoot,
        parent: parent
      });
    });

    this.state = {
      groups: newGroups,
      items,
      defaultTimeStart,
      defaultTimeEnd,
      openGroups
    };
  }

  toggleGroup = id => {
    const { openGroups } = (this.state as any);
    this.setState({
      openGroups: {
        ...openGroups,
        [id]: !openGroups[id]
      }
    });
  };

  handleItemMove = (itemId, dragTime, newGroupOrder) => {
    const { items, groups } = (this.state as any);

    const group = groups[newGroupOrder];

    this.setState({
      items: items.map(item =>
        item.id === itemId
          ? Object.assign({}, item, {
              start: dragTime,
              end: dragTime + (item.end - item.start),
              group: group.id
            })
          : item
      )
    });

    console.log("Moved", itemId, dragTime, newGroupOrder);
  };

  handleItemResize = (itemId, time, edge) => {
    const { items } = (this.state as any);

    this.setState({
      items: items.map(item =>
        item.id === itemId
          ? Object.assign({}, item, {
              start: edge === "left" ? time : item.start,
              end: edge === "left" ? item.end : time
            })
          : item
      )
    });

    console.log("Resized", itemId, time, edge);
  };

  render() {
    const { groups, items, defaultTimeStart, defaultTimeEnd, openGroups } = (this.state as any);

    // hide (filter) the groups that are closed, for the rest, patch their "title" and add some callbacks or padding
    const newGroups = groups
      .filter(g => g.root || openGroups[g.parent])
      .map(group => {
        return Object.assign({}, group, {
          title: group.root ? (
            <div onClick={() => this.toggleGroup(parseInt(group.id))} style={{ cursor: "pointer" }}>
              {openGroups[parseInt(group.id)] ? "[-]" : "[+]"} {group.title}
            </div>
          ) : (
            <div style={{ paddingLeft: 20 }}>{group.title}</div>
          )
        });
      });

    return (
      <Timeline
        groups={newGroups}
        items={items}
        keys={keys}
        sidebarContent={<div>Above The Left</div>}
        itemsSorted
        itemTouchSendsClick={false}
        stackItems
        itemHeightRatio={0.75}
        showCursorLine
        timeSteps={{
          year: 1,
          month: 1,
          day: 1
        }}
        defaultTimeStart={defaultTimeStart}
        defaultTimeEnd={defaultTimeEnd}
        onItemMove={this.handleItemMove}
        onItemResize={this.handleItemResize}
      />
    );
  }
}
