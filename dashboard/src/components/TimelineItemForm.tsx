import React, {useEffect, useState} from "react";
import {
  Box, CircularProgress, Grid, Modal, TextField, Typography
} from "@mui/material";
import {DatePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import TButton from "../loadable/Button";
import {GroupInterface} from "./TimelinePlanner";


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
