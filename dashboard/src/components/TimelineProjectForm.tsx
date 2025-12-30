import React, {useEffect, useState} from "react";
import {
  Box, CircularProgress, Grid, Modal, TextField, Typography
} from "@mui/material";
import {DatePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import TButton from "../loadable/Button";
import {GroupInterface} from "./TimelinePlanner";
import Autocomplete from "@mui/material/Autocomplete";


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

export interface TimelineUser {
  id: string,
  name: string
}

export interface TimelineProjectInterface {
  open: boolean,
  onClose: Function,
  onAdd: Function,
  selectedGroup: GroupInterface | null,
}

export default function TimelineProjectForm(props: TimelineProjectInterface) {
  const [open, setOpen] = useState<boolean>(false)
  const [user, setUser] = useState<TimelineUser | null>(null)
  const [projects, setProjects] = useState<any>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [projectInput, setProjectInput] = useState('')
  const [projectLoading, setProjectLoading] = useState<boolean>(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  useEffect(() => {
    if (props.open) {
      setOpen(true)
      setIsLoading(false)
      setSelectedProject(null)
    }
    if (props.selectedGroup) {
      if (props.selectedGroup.userId) {
        setUser({
          id: props.selectedGroup.userId,
          name: props.selectedGroup.title
        })
      }
    }
  }, [props])

  useEffect(() => {
      setProjectLoading(true)
      if (projectInput.length > 1) {
          let url = `/api/project-list/?q=${projectInput}`;
          if (user) {
            url += `&user_id=${user.id}`;
          }
          fetch(url).then(
              response => response.json()
          ).then(
              json => {
                  setProjects(json)
                  setProjectLoading(false)
              }
          )
      } else {
          setProjects([])
          setProjectLoading(false)
      }
  }, [projectInput])

  useEffect(() => {
    console.log('test')
  }, [selectedProject]);

  const handleClose = () => {
    if (isLoading) return
    setOpen(false)
    props.onClose()
  }

  const submitAdd = () => {
    if (!user || !props.selectedGroup) return
    setIsLoading(true)
    const url = '/api/add-user-project-slot/'
    const formData = new FormData();
    formData.append('user_id', user.id)
    formData.append('project_id', selectedProject.id)

    fetch(url, {
      credentials: 'include',
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'X-CSRFToken': (window as any).csrftoken
      },
    })
      .then(response => response.json())
      .then((result: any) => {
        setIsLoading(false)
        if (result) {
          const newGroup = {
            id: result.id,
            title: result.project_name,
            root: false,
            parent: props.selectedGroup ? props.selectedGroup.id : null,
            userId: props.selectedGroup ? props.selectedGroup.userId : null,
            projectId: result.project,
            rightTitle: result.project_name,
            stackItems: true,
          }
          props.onAdd(newGroup)
        }
      })
      .catch(error => {
        console.log('Error :', error)
        setIsLoading(false)
      })
      handleClose()
  }

  return (<Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          Add new project
        </Typography>
        <div>
           <LocalizationProvider dateAdapter={AdapterDateFns}>
             <Grid container spacing={2} style={{ marginTop: 10 }}>
               <Grid item xs={12} className="time-picker">
                 <TextField
                   id="project-text-input"
                   label="User"
                   disabled={isLoading}
                   style={{ width: '100%' }}
                   value={user ? user.name : ''}
                   InputProps={{
                     readOnly: true,
                   }}
                 />
               </Grid>
               <Grid item xs={12}>
                 <Autocomplete
                    disablePortal
                    id="timeline-project-input"
                    // @ts-ignore
                    options={projects}
                    getOptionLabel={ (options: any) => (options['label'])}
                    isOptionEqualToValue={(option: any, value: any) => option['id'] == value['id']}
                    onChange={(event: any, value: any) => {
                        if (value) {
                            setSelectedProject(value)
                        } else {
                            setSelectedProject(null)
                        }
                    }}
                    value={selectedProject}
                    onInputChange={(event, newInputValue) => {
                        setProjectInput(newInputValue)
                    }}
                    loading={projectLoading}
                    disabled={isLoading}
                    renderInput={(params) => (
                        <TextField {...params}
                                   label="Project"
                                   variant="filled"
                                   className="headerInput"
                                   InputProps={{
                                       ...params.InputProps,
                                       disableUnderline: true,
                                       endAdornment: (
                                           <React.Fragment>
                                               { projectLoading ?
                                                   <CircularProgress color="inherit" size={20} /> : null }
                                               { params.InputProps.endAdornment }
                                           </React.Fragment>
                                       )
                                   }}
                        />
                    )
                    }
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
