import React, {useEffect, useState, Suspense} from 'react';
import {TextField} from "@mui/material";
import {getColorFromTaskLabel, isColorLight} from "../utils/Theme";
import Autocomplete from "@mui/material/Autocomplete";
import {ItemTaskInterface} from "./TimelineItemForm";


interface TaskAutocompleteInterface {
  selectedProjectId?: string,
  isRunningProject?: boolean,
  selectedTask?: ItemTaskInterface | null,
  onTaskSelected?: Function,
}


export default function TaskAutocomplete(props: TaskAutocompleteInterface) {
  const [selectedTask, setSelectedTask] = useState<any>(props.selectedTask)
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
        const backgroundColor = option.color ? option.color : 'rgba(255,255,255,0)';
        const textColor = isColorLight(backgroundColor) ? '#000000' : '#FFFFFF';

        return (<li {...props}
                    style={{
                      backgroundColor: backgroundColor,
                      color: textColor
                    }}>
          {option.label}</li>)
      }}
      value={selectedTask}
      renderInput={(params) => {
          let backgroundColor = 'inherit'
          let textColor = 'inherit';
          if (params.inputProps.value) {
              backgroundColor = getColorFromTaskLabel(params.inputProps.value);
              textColor = isColorLight(backgroundColor) ? '#000000' : '#FFFFFF'
          }
          return <TextField
              {...params}
              label="Task"
              variant="filled"
              className="headerInput"
              // @ts-ignore
              style={{
                  backgroundColor: backgroundColor
              }}
              InputProps={{
                  ...params.InputProps,
                  disableUnderline: true,
                  style: {
                      color: textColor
                  }
              }}
              InputLabelProps={{
                  style: params.inputProps.value ? { color: textColor } : {}
              }}
          />
      }}
    />)
}
