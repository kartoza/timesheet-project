import randomColor from 'randomcolor'
import {getColorFromTaskLabel} from "./Theme";
import {classifyItem} from "./scheduleItem";

const publicTimelineId = (window as any).publicTimelineId;

export function resetTimeInDate(timestamp: any, addDate = 0) {
  let dateTime;
  if (typeof timestamp === 'number') {
    dateTime = new Date(new Date(timestamp))
    dateTime = new Date(Date.UTC(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate()));
    dateTime.setHours(0)
    dateTime.setMinutes(0)
    dateTime.setSeconds(0)
  } else {
    let timestampStr = timestamp.split('T')[0].split('-');
    let year = parseInt(timestampStr[0], 10);
    let month = parseInt(timestampStr[1], 10) - 1;
    let day = parseInt(timestampStr[2], 10);
    dateTime = new Date(year, month, day);
    dateTime.setHours(0, 0, 0, 0);
  }
  if (addDate) {
    dateTime.setDate(dateTime.getDate() + addDate)
  }
  return dateTime.getTime()
}

export function getDateString(timestamp: number, addDate = 0) {
  let dateTime = new Date(new Date(timestamp).toLocaleString('en'))
  if (dateTime.getTimezoneOffset() >= 0) {
    addDate -= 1
  }
  if (addDate) {
    dateTime.setDate(dateTime.getDate() + addDate)
  }
  return `${dateTime.getUTCDate()}/${dateTime.getUTCMonth() + 1}/${dateTime.getUTCFullYear()}`
}

export function buildScheduleInfo(
  projectName?: string,
  taskLabel?: string,
  user?: string,
  notes?: string
) {
  const infoParts: string[] = []
  if (projectName) {
    infoParts.push(projectName)
  }
  if (taskLabel && taskLabel !== '-') {
    infoParts.push(taskLabel)
  }
  if (user) {
    infoParts.push(user)
  }
  if (infoParts.length === 0 && notes) {
    infoParts.push(notes)
  }
  return infoParts.join(' : ')
}

const ITEM_SELECTED_COLOR = '#c19e16'

/** Turn a schedule returned by the API into an item for the planner timeline */
export function mapScheduleToItem(schedule: any) {
  const {isLeave, isHoliday, isKartozaSpecial, showsAsNote} = classifyItem(
    Object.assign({}, schedule, {desc: schedule.title})
  )
  const isEditable = !!(window as any).isStaff && schedule.task_label !== '-' &&
    !isKartozaSpecial && !isHoliday
  const canInteract = !isLeave && (isEditable || showsAsNote)
  return Object.assign({}, schedule, {
    title: isLeave ? schedule.task_name : (isHoliday || isKartozaSpecial ? schedule.title : (showsAsNote ? schedule.notes || 'Note' : schedule.task_name)),
    info: buildScheduleInfo(schedule.project_name, schedule.task_label, schedule.user, schedule.notes),
    desc: schedule.title,
    start: resetTimeInDate(schedule.start_time),
    end: resetTimeInDate(schedule.end_time, 1),
    project_id: schedule.project_id === undefined || schedule.project_id === null ? '' : schedule.project_id + '',
    color: '#FFF',
    bgColor: isLeave ? '#5a5a5a' : (isHoliday ? '#42BF8B' : (isKartozaSpecial ? '#626262' : (showsAsNote ? '#9370DB' : getColorFromTaskLabel(schedule.task_label)))),
    selectedBgColor: ITEM_SELECTED_COLOR,
    canSelect: canInteract,
    canChangeGroup: false,
    canMove: canInteract,
    canResize: canInteract,
    hoursPerDay: schedule.hours_per_day
  })
}

export function deleteSchedule(scheduleId: string) {
  const formData = new FormData()
  formData.append('schedule_id', scheduleId)
  const url = '/api/delete-schedule/'
  return fetch(url, {
    credentials: 'include',
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json', 'X-CSRFToken': (window as any).csrftoken
    },
  })
    .then(response => response.json())
    .then((result: any) => {
      const items: any = {}
      for (const item of result['updated']) {
        items[item.id] = mapScheduleToItem(item)
      }
      return {
        'removed': result['removed'],
        'updated': items
      }
    })
    .catch(error => {
      console.log('Error :', error)
      return { 'removed': false, 'updated': {} }
    })
}

export function updateSchedule(scheduleId: number, startTime: number, endTime: number, notes: string = "", taskId: string | null = null, hoursPerDay: number | null = null) {
  const formData = new FormData()
  const adjustedStartTime = getDateString(startTime, 1)
  const adjustedEndTime = getDateString(endTime)
  formData.append('schedule_id', scheduleId + '')
  formData.append('start_time', adjustedStartTime)
  formData.append('end_time', adjustedEndTime)
  formData.append('notes', notes)
  if (hoursPerDay) {
    formData.append('hours_per_day', hoursPerDay + '')
  }
  if (taskId) {
    formData.append('taskId', taskId)
  }
  const url = '/api/update-schedule/'
  return fetch(url, {
    credentials: 'include',
    method: 'PUT',
    body: formData,
    headers: {
      'Accept': 'application/json', 'X-CSRFToken': (window as any).csrftoken
    },
  })
    .then(response => response.json())
    .then((results: any) => {
      if (results) {
        const items: any = {}
        for (const result of results) {
          items[result.id] = mapScheduleToItem(result)
        }
        return  items;
      }
      return null
    })
    .catch(error => {
      console.log('Error :', error)
      return null
    })
}

export async function fetchSlottedProjects() {
  let groups: any = [];
  let randomSeed = Math.floor(Math.random() * 1000)
  let url = '/api/user-project-slots/'
  if (publicTimelineId) {
    url += '?timelineId=' + publicTimelineId
  }
  return fetch(url).then(response => response.json()).then(result => {
    for (let i = 0; i < result.length; i++) {
      let project = result[ i ];
      let groupId = parseInt(project.user_id + '000000');
      groups.push({
        id: groupId,
        title: project.user_name,
        userId: project.user_id ? project.user_id : null,
        root: true,
        rightTitle: project.user_name,
        projectId: null,
        stackItems: true,
        bgColor: randomColor({luminosity: 'light', seed: randomSeed + i})
      })
      if (project.slotted_projects.length > 0) {
        for (const slottedProject of project.slotted_projects) {
          groups.push({
            id: slottedProject.id,
            title: slottedProject.project_name,
            root: false,
            parent: groupId,
            projectId: slottedProject.project,
            userId: project.user_id ? project.user_id : null,
            rightTitle: slottedProject.project_name,
            stackItems: true,
          })
        }
      }
    }
    return groups;
  })
}

export async function fetchSchedules() {
  let url = '/api/schedules/';
  if (publicTimelineId) {
    url += '?timelineId=' + publicTimelineId
  }
  return fetch(url).then(response => response.json()).then(result => {
    return result
  })
}
