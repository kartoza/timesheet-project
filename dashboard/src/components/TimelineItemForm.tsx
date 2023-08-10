import React, {useEffect, useState} from "react";
import {
  Box, CircularProgress, Grid, Modal, TextField, Typography
} from "@mui/material";
import {DatePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import TButton from "../loadable/Button";
import {GroupInterface} from "./TimelinePlanner";
import {getColorFromTaskLabel} from "../utils/Theme";
import TaskAutocomplete from "./TaskAutocomplete";
import {resetTimeInDate} from "../utils/schedule_data";


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
  const [notes, setNotes] = useState<string>('');

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
    const end = new Date(endTime.setDate(endTime.getDate() + (duration - 1)));
    const url = '/api/add-schedule/'
    const formData = new FormData();
    formData.append('start_time', '' + start.getTime())
    formData.append('end_time', '' + end.getTime())
    formData.append('notes', notes)
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
        if (result['new']) {
          let item = result['new'];
          let _startTime = resetTimeInDate(item.start_time)
          let _endTime = resetTimeInDate(item.end_time, 1)
          const newSchedule = {
            id: item.id,
            start: _startTime,
            end: _endTime,
            title: item.task_name,
            info: item.task_label,
            first_day: item.first_day,
            last_day: item.last_day,
            group: props.selectedGroup ? props.selectedGroup.id : null,
            bgColor: selectedTask ? getColorFromTaskLabel(selectedTask.label) : '#FFF'
          }
          const updated: any = {}
          if (result['updated']) {
            for (let i = 0; i < result['updated'].length; i++) {
              let item = result['updated'][ i ];
              updated[item.id] = {
                id: item.id,
                start: resetTimeInDate(item.start_time),
                end: resetTimeInDate(item.end_time, 1),
                title: item.task_name,
                info: item.task_label,
                group: item.group,
                first_day: item.first_day,
                last_day: item.last_day,
                bgColor: getColorFromTaskLabel(item.task_label)
              }
            }
          }
          props.onAdd(newSchedule, updated)
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
                 <TextField
                     value={notes}
                     id={'notes'}
                     label="Notes"
                     multiline
                     rows={4}
                     onChange={(event) => {
                       setNotes(event.target.value + '')
                     }}
                     style={{ width: '100%' }}
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
