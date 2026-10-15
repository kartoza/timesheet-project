import React, {useEffect, useState} from "react";
import moment from "moment";
import AddBoxIcon from '@mui/icons-material/AddBox';
import ClearIcon from '@mui/icons-material/Clear';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import {
  Autocomplete, Badge, Button, Chip, FormControlLabel, IconButton, InputAdornment,
  Popover, Switch, TextField, Tooltip
} from "@mui/material";
import {DatePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import {
  ALL_ITEM_TYPES, DEFAULT_FILTERS, FilterOption, ITEM_TYPE_LABELS, ItemType,
  OpenCloseStatus, currentUserId, hasActiveFilters
} from "../utils/plannerFilters";

export const SIDEBAR_WIDTH = 300

export function TimelineSearchInput({searchValue, onChange, toggleAllGroups}) {
  const [searchText, setSearchText] = useState<string>('')
  const [focus, setFocus] = useState<boolean>(true)
  const [currentToggle, setCurrentToggle] = (
      useState<OpenCloseStatus>(OpenCloseStatus.OPEN)
  )

  useEffect(() => {
    setSearchText(searchValue);
  }, [searchValue]);

  useEffect(() => {
    setFocus(true)
  }, [searchText])

  const Icon = (
      currentToggle === OpenCloseStatus.OPEN ? IndeterminateCheckBoxIcon : AddBoxIcon
  )

  return (<TextField id="timeline-filter"
                 style={{
                   width: `${SIDEBAR_WIDTH}px`, zIndex: 999,
                   position: 'fixed', backgroundColor: '#FFF'
                 }}
                 hiddenLabel
                 variant="filled"
                 size={'small'}
                 value={searchText}
                 focused={focus}
                 className={'timeline-filter'}
                 onChange={(e) => {
                   const caretStart = e.target.selectionStart;
                   const caretEnd = e.target.selectionEnd;
                   const value = e.target.value;
                   setSearchText(value);
                   onChange(value);
                   e.target.setSelectionRange(caretStart, caretEnd);
                 }}
                 InputProps={{
                   startAdornment: (<InputAdornment position="start">
                     <SearchIcon/>
                   </InputAdornment>),
                   endAdornment: (<InputAdornment position="end">
                     <Icon style={{ cursor: 'pointer', color: searchText ? 'gray' : 'black' }}
                                                onClick={() => {
                                                  if (searchText) {
                                                    return;
                                                  }
                                                  if (currentToggle === OpenCloseStatus.CLOSE) {
                                                    toggleAllGroups(OpenCloseStatus.OPEN)
                                                    setCurrentToggle(OpenCloseStatus.OPEN)
                                                  } else {
                                                    toggleAllGroups(OpenCloseStatus.CLOSE);
                                                    setCurrentToggle(OpenCloseStatus.CLOSE);
                                                  }
                                                  return;
                                                }}/>
                   </InputAdornment>)
                 }}
  />)
}

function TimelineFilterPanel({filters, onFiltersChange, options}) {
  const toggleType = (type: ItemType) => {
    const types = filters.types.includes(type) ?
      filters.types.filter(current => current !== type) : [...filters.types, type]
    onFiltersChange({...filters, types})
  }
  const findOption = (list: FilterOption[], id: string | null) => list.find(option => option.id === id) || null

  return (
    <div className={'planner-filter-panel'}>
      <div className={'planner-filter-title'}>Show</div>
      <div className={'planner-filter-chips'}>
        {ALL_ITEM_TYPES.map(type => (
          <Chip key={type} label={ITEM_TYPE_LABELS[type]} size="small" clickable
                color={filters.types.includes(type) ? 'primary' : 'default'}
                variant={filters.types.includes(type) ? 'filled' : 'outlined'}
                onClick={() => toggleType(type)}/>
        ))}
      </div>
      <Autocomplete size="small"
                    options={options.projects}
                    value={findOption(options.projects, filters.projectId)}
                    onChange={(e, value) => onFiltersChange({...filters, projectId: value ? value.id : null})}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => <TextField {...params} label="Project"/>}/>
      <Autocomplete size="small"
                    options={options.people}
                    disabled={filters.onlyMe}
                    value={findOption(options.people, filters.personId)}
                    onChange={(e, value) => onFiltersChange({...filters, personId: value ? value.id : null})}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => <TextField {...params} label="Person"/>}/>
      {currentUserId ? (
        <FormControlLabel label="Only me"
                          control={<Switch checked={filters.onlyMe}
                                           onChange={(e) => onFiltersChange({...filters, onlyMe: e.target.checked})}/>}/>
      ) : null}
      <Button size="small" disabled={!hasActiveFilters(filters)}
              onClick={() => onFiltersChange(DEFAULT_FILTERS)}>Reset filters</Button>
    </div>
  )
}

export function TimelineNavigation({planner, range, filters, onFiltersChange, options}) {
  const [jumpDate, setJumpDate] = useState<Date | null>(null)
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)
  const activeFilterCount = (
    (filters.types.length < ALL_ITEM_TYPES.length ? 1 : 0) +
    (filters.projectId ? 1 : 0) + (filters.personId ? 1 : 0) + (filters.onlyMe ? 1 : 0)
  )

  let rangeLabel = ''
  if (range) {
    const start = moment(range.start)
    const end = moment(range.end).subtract(1, 'day')
    rangeLabel = start.year() === end.year() ?
      `${start.format('D MMM')} – ${end.format('D MMM YYYY')}` :
      `${start.format('D MMM YYYY')} – ${end.format('D MMM YYYY')}`
  }

  return (
    <div className={'planner-navigation'}>
      <Badge badgeContent={activeFilterCount} color="primary">
        <Button size="small" startIcon={<FilterListIcon/>}
                onClick={(e) => setFilterAnchor(e.currentTarget)}>Filters</Button>
      </Badge>
      <Popover open={filterAnchor !== null} anchorEl={filterAnchor}
                     disableScrollLock
                     onClose={() => setFilterAnchor(null)}
                     anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                     transformOrigin={{vertical: 'bottom', horizontal: 'center'}}>
        <TimelineFilterPanel filters={filters} onFiltersChange={onFiltersChange} options={options}/>
      </Popover>
      <div className={'planner-navigation-divider'}/>
      <Tooltip title="Previous week">
        <IconButton size="small" aria-label="Previous week" onClick={() => planner.current?.shiftRange(-1)}>
          <ChevronLeftIcon/>
        </IconButton>
      </Tooltip>
      <Button size="small" variant="outlined" onClick={() => {
        setJumpDate(null)
        planner.current?.goToToday()
      }}>Today</Button>
      <Tooltip title="Next week">
        <IconButton size="small" aria-label="Next week" onClick={() => planner.current?.shiftRange(1)}>
          <ChevronRightIcon/>
        </IconButton>
      </Tooltip>
      <div className={'planner-range-label'}>{rangeLabel}</div>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          value={jumpDate}
          label="Go to date"
          format="dd/MM/yyyy"
          onChange={(newValue) => {
            setJumpDate(newValue)
            if (newValue && !isNaN(newValue.getTime())) {
              planner.current?.goToDate(newValue.getTime())
            }
          }}
          slotProps={{
            textField: { size: 'small', sx: { width: 170, ml: 1 } },
            popper: { placement: 'top-end' }
          }}
        />
      </LocalizationProvider>
    </div>
  )
}
