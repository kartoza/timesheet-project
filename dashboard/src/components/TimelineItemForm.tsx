import React, {useEffect, useState} from "react";
import {
  Box, CircularProgress, Grid, Modal, TextField, Typography
} from "@mui/material";
import {DatePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import TButton from "../loadable/Button";
import {GroupInterface} from "./TimelinePlanner";
import {getColorFromTaskLabel} from "../utils/Theme";
import Autocomplete from "@mui/material/Autocomplete";
import TaskAutocomplete from "./TaskAutocomplete";


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

export interface ItemFormInterface {
  open: boolean,
  onClose: Function,
  onAdd: Function,
  selectedGroup: GroupInterface | null,
  startTime?: Date | null
}

export default function ItemForm(props: ItemFormInterface) {
  const [open, setOpen] = useState<boolean>(false)
  const [startTime, setStartTime] = useState<any | null>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [duration, setDuration] = useState<number>(1)
  const [selectedTask, setSelectedTask] = useState<any>(null)

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

  const submitAdd = async () => {
    setIsLoading(true)
    const start = new Date(startTime.toISOString())
    const endTime = new Date(startTime.getTime())
    const end = new Date(endTime.setDate(endTime.getDate() + duration));
    const url = '/api/add-schedule/'
    const formData = new FormData();
    formData.append('start_time', '' + start.getTime())
    formData.append('end_time', '' + end.getTime())
    if (selectedTask) {
      formData.append('task_id', selectedTask.id)
    }
    if (props.selectedGroup) {
      if (props.selectedGroup.userId) {
        formData.append('user_id', props.selectedGroup.userId)
      }
    }
    await fetch(url, {
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
          let _startTime = new Date(result.start_time)
          let _endTime = new Date(result.end_time)
          _startTime = new Date(Date.UTC(_startTime.getFullYear(), _startTime.getMonth(), _startTime.getDate()));
          _endTime = new Date(Date.UTC(_endTime.getFullYear(), _endTime.getMonth(), _endTime.getDate()));
          _startTime.setHours(0)
          _startTime.setMinutes(0)
          _startTime.setSeconds(0)
          _endTime.setHours(0)
          _endTime.setMinutes(0)
          _endTime.setSeconds(0)
          _endTime.setDate(_endTime.getDate() + 1);
          const newSchedule = {
            id: result.id,
            start: _startTime,
            end: _endTime,
            title: result.task_name,
            group: props.selectedGroup ? props.selectedGroup.id : null,
            bgColor: selectedTask ? getColorFromTaskLabel(selectedTask.label) : '#FFF'
          }
          props.onAdd(newSchedule)
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
               <Grid item xs={12}>
                 <TaskAutocomplete selectedProjectId={props.selectedGroup?.projectId}
                                   onTaskSelected={(task) => {
                                     console.log(task)
                                     setSelectedTask(task)
                                   }}/>
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
                      disabled={isLoading || !selectedTask}
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
