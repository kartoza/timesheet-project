import React, {useEffect, useState, Suspense} from 'react';
import {TextField} from "@mui/material";
import {getColorFromTaskLabel} from "../utils/Theme";
import Autocomplete from "@mui/material/Autocomplete";


interface TaskAutocompleteInterface {
  selectedProjectId?: string,
  isRunningProject?: boolean,
  onTaskSelected?: Function,
}

export default function TaskAutocomplete(props: TaskAutocompleteInterface) {
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [tasks, setTasks] = useState<any>([])

  useEffect(() => {
    if (props.onTaskSelected) {
      props.onTaskSelected(selectedTask);
    }
  }, [selectedTask])

  useEffect(() => {
    if (props.selectedProjectId && tasks.length !== 0) {
      return
    }
    if (props.selectedProjectId) {
      fetch('/task-list/' + props.selectedProjectId + '/').then(response => response.json()).then(json => {
        if (props.isRunningProject !== null && props.isRunningProject === false) {
          setSelectedTask(null)
        }
        setTasks(json.map((jsonData: any) => {
          const label = jsonData.label;
          jsonData[ 'color' ] = getColorFromTaskLabel(label);
          return jsonData
        }))
      })
    } else {
      setTasks([])
    }
  }, [props])

  return (<Autocomplete
      disablePortal
      id="combo-box-demo"
      // @ts-ignore
      options={tasks}
      getOptionLabel={(options: any) => (options[ 'label' ])}
      isOptionEqualToValue={(option: any, value: any) => option[ 'id' ] == value[ 'id' ]}
      onChange={(event: any, value: any) => {
        if (value) {
          setSelectedTask(value)
        } else {
          setSelectedTask(null)
        }
      }}
      renderOption={(props, option) => {
        return (<li {...props}
                    style={{backgroundColor: option.color ? option.color : 'rgba(255,255,255,0)'}}>
          {option.label}</li>)
      }}
      value={selectedTask}
      renderInput={(params) => {
        return <TextField
          {...params}
          label="Task"
          variant="filled"
          className="headerInput"
          // @ts-ignore
          style={{backgroundColor: params?.inputProps?.value !== '' ? getColorFromTaskLabel(params.inputProps.value) : 'rgba(255,255,255,0)'}}
          InputProps={{
            ...params.InputProps, disableUnderline: true,
          }}
        />
      }}
    />)
}
