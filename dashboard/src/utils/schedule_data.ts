import randomColor from 'randomcolor'


export async function fetchSlottedProjects() {
  let groups: any = [];
  let randomSeed = Math.floor(Math.random() * 1000)

  return fetch('/api/user-project-slots/').then(
    response => response.json()
  ).then(result => {
    for (let i = 0; i < result.length; i++) {
      let project = result[i];
      let groupId = parseInt(project.user_id + '000000');
      groups.push({
        id: groupId,
        title: project.user_name,
        root: true,
        rightTitle: project.user_name,
        stackItems: false,
        bgColor: randomColor({ luminosity: 'light', seed: randomSeed + i })
      })
      if (project.slotted_projects.length > 0) {
        for (const slottedProject of project.slotted_projects) {
          groups.push({
            id: slottedProject.id,
            title: slottedProject.project_name,
            root: false,
            parent: groupId,
            rightTitle: slottedProject.project_name,
            stackItems: false,
          })
        }
      }
    }
    return groups;
  })
}

export async function fetchSchedules() {
  return fetch('/api/schedules/').then(
    response => response.json()
  ).then(result => {
    return result
  })
}
