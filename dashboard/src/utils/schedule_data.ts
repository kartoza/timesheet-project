import randomColor from 'randomcolor'
import {getColorFromTaskLabel} from "./Theme";

export function resetTimeInDate(timestamp: number) {
  let dateTime = new Date(new Date(timestamp).toLocaleString('en'))
  dateTime.setHours(0)
  dateTime.setMinutes(0)
  dateTime.setSeconds(0)
  return dateTime.getTime()
}

export function getDateString(timestamp: number) {
  let dateTime = new Date(new Date(timestamp).toLocaleString('en'))
  return `${dateTime.getDate()}/${dateTime.getMonth() + 1}/${dateTime.getFullYear()}`
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
      return 'removed' in result
    })
    .catch(error => {
      console.log('Error :', error)
      return false
    })
}

export function updateSchedule(scheduleId: number, startTime: number, endTime: number) {
  const formData = new FormData()
  formData.append('schedule_id', scheduleId + '')
  formData.append('start_time', getDateString(startTime))
  formData.append('end_time', getDateString(endTime))
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
    .then((result: any) => {
      if (result) {
        return {
          id: result.id,
          start: resetTimeInDate(result.start_time),
          end: resetTimeInDate(result.end_time),
          title: result.task_name,
          info: result.task_label,
          group: result.group,
          bgColor: getColorFromTaskLabel(result.task_label)
        }
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

  return fetch('/api/user-project-slots/').then(response => response.json()).then(result => {
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
  return fetch('/api/schedules/').then(response => response.json()).then(result => {
    return result
  })
}
