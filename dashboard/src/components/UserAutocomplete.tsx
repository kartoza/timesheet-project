import React, {useEffect, useState} from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";


interface UserAutocompleteProps {
  selectedUser?: any,
  onUserSelected?: Function,
}

export default function UserAutocomplete(props: UserAutocompleteProps) {
  const [selectedUser, setSelectedUser] = useState<any>(props.selectedUser)
  const [users, setUsers] = useState<any>([])

  useEffect(() => {
    if (props.onUserSelected) {
      props.onUserSelected(selectedUser);
    }
  }, [selectedUser])

  useEffect(() => {
    fetch('/user-autocomplete/' ).then(response => response.json()).then(json => {
      setSelectedUser(null)
      setUsers(json.map((jsonData: any) => {
        return jsonData
      }))
    })
  }, [props])

  return (<Autocomplete
    disablePortal
    id="combo-box-demo"
    // @ts-ignore
    options={users}
    getOptionLabel={(options: any) => (options[ 'label' ])}
    isOptionEqualToValue={(option: any, value: any) => option[ 'id' ] == value[ 'id' ]}
    onChange={(event: any, value: any) => {
      if (value) {
        setSelectedUser(value)
      } else {
        setSelectedUser(null)
      }
    }}
    renderOption={(props, option) => {
      return (<li {...props}>
        {option.label}</li>)
    }}
    value={selectedUser}
    renderInput={(params) => {
      return <TextField
        {...params}
        label="User"
        variant="filled"
        className="headerInput"
        InputProps={{
          ...params.InputProps,
          disableUnderline: true,
        }}
      />
    }}
  />)
}
