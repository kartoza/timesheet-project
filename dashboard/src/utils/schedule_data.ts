import randomColor from 'randomcolor'
import {getColorFromTaskLabel} from "./Theme";

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
      for (let i = 0; i < result['updated'].length; i++) {
          let item = result['updated'][i];
          items[item.id] = {
            id: item.id,
            start: resetTimeInDate(item.start_time),
            end: resetTimeInDate(item.end_time, 1),
            title: item.task_name,
            info: item.project_name + ' : ' + item.task_label + item.user,
            group: item.group,
            desc: item.title,
            first_day: item.first_day,
            last_day: item.last_day,
            bgColor: getColorFromTaskLabel(item.task_label)
          }
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
        for (let i = 0; i < results.length; i++) {
          let result = results[i];
          items[result.id] = {
            id: result.id,
            start: resetTimeInDate(result.start_time),
            end: resetTimeInDate(result.end_time, 1),
            title: result.task_name,
            desc: result.title,
            info: result.project_name + ' : ' + result.task_label + result.user,
            group: result.group,
            first_day: result.first_day,
            last_day: result.last_day,
            notes: result.notes,
            task_id: result.task_id,
            task_label: result.task_label,
            bgColor: getColorFromTaskLabel(result.task_label),
            hoursPerDay: result.hours_per_day
          }
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
