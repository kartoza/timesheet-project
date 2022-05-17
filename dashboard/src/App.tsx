import React, {useEffect, useState} from 'react';
import './App.scss';
import {
    Container,
    Autocomplete,
    TextField, Stack, CircularProgress, Button, Grid, CardContent, Typography, CardActions, Box, Card
} from "@mui/material";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';


function TimeCard() {
    const [value, setValue] = React.useState<Date | null>(new Date());
    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <div>
                <CardContent sx={{ paddingLeft: 0, paddingRight: 0 }}>
                    <DateTimePicker
                        value={value}
                        onChange={(newValue) => setValue(newValue)}
                        renderInput={(params) => <TextField {...params} variant="standard" sx={{ width: 200 }} />}
                    />
                    <TextField id="hour" type="number" label="Hours" variant="standard" sx={{ width: 200 }} />
                </CardContent>
                <CardActions sx={{ justifyContent: "center" }}>
                    <Button variant="contained" size="small" sx={{ width: 200, marginTop: -1 }}>Add</Button>
                </CardActions>
            </div>
        </LocalizationProvider>
    )
}


function App() {
    const [activities, setActivities] = useState([])
    const [projectInput, setProjectInput] = useState('')
    const [projects, setProjects] = useState([])
    const [projectLoading, setProjectLoading] = useState(false)
    const [selectedProject, setSelectedProject] = useState(null)
    const [selectedTask, setSelectedTask] = useState(null)
    const [tasks, setTasks] = useState([])

    useEffect(() => {
        fetch('/activity-list/').then(
            response => response.json()
        ).then(
            json => {
                setActivities(json)
            }
        )
    }, [])

    useEffect(() => {
        setProjectLoading(true)
        if (projectInput.length > 2) {
            fetch('/project-list/?q=' + projectInput).then(
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
        if (selectedProject) {
            fetch('/task-list/' + selectedProject + '/').then(
                response => response.json()
            ).then(
                json => {
                    setTasks(json)
                }
            )
        } else {
            setTasks([])
        }
    }, [selectedProject])

    return (
        <div className="App">
            <Container maxWidth="lg">
                <div className="App-header">
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Autocomplete
                                disablePortal
                                id="combo-box-demo"
                                options={activities}
                                loading={activities.length > 0}
                                renderInput={(params) => (
                                    <TextField {...params}
                                               label="Activity"
                                               InputProps={{
                                                   ...params.InputProps,
                                                   endAdornment: (
                                                       <React.Fragment>
                                                           { setActivities.length == 0 ?
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
                        <Grid item xs={4}>
                            <Autocomplete
                                disablePortal
                                id="combo-box-demo"
                                options={projects}
                                getOptionLabel={ options => (options['label'])}
                                isOptionEqualToValue={(option, value) => option['id'] == value['id']}
                                onChange={(event: any, value: any) => {
                                    if (value) {
                                        setSelectedProject(value.id)
                                    } else {
                                        setSelectedProject(null)
                                        setSelectedTask(null)
                                    }
                                }}
                                onInputChange={(event, newInputValue) => {
                                    setProjectInput(newInputValue)
                                }}
                                loading={projectLoading}
                                renderInput={(params) => (
                                    <TextField {...params}
                                               label="Project"
                                               InputProps={{
                                                   ...params.InputProps,
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
                        <Grid item xs={4}>
                            <Autocomplete
                                disablePortal
                                id="combo-box-demo"
                                options={tasks}
                                getOptionLabel={ options => (options['label'])}
                                isOptionEqualToValue={(option, value) => option['id'] == value['id']}
                                onChange={(event: any, value: any) => {
                                    if (value) {
                                        setSelectedTask(value)
                                    } else {
                                        setSelectedTask(null)
                                    }
                                }}
                                value={selectedTask}
                                renderInput={(params) => <TextField {...params} label="Task"/>}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField style={{ width: "100%" }} label="Description" variant="outlined" />
                        </Grid>
                    </Grid>
                    <Box className="time-box">
                        <TimeCard/>
                    </Box>
                </div>
            </Container>
        </div>
    );
}

export default App;
