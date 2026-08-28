import React, {useState} from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import {DateCalendar, LocalizationProvider, PickersDay, PickersDayProps} from "@mui/x-date-pickers";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import {
    endOfMonth,
    endOfWeek,
    isSameDay,
    isWithinInterval,
    startOfMonth,
    startOfWeek,
    subDays,
    subWeeks
} from "date-fns";
import {CalendarIcon} from "../loadable/Icon";
import {
    DateRange,
    MAX_RANGE_DAYS,
    clampToToday,
    exceedsMaxRange,
    formatDateRange,
    maxSelectableDate,
    thisWeekRange,
    weekOptions
} from "../utils/dateRange";

type DateRangeFilterProps = {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

const presets: { label: string, range: () => DateRange }[] = [
    {
        label: 'Today',
        range: () => ({start: new Date(), end: new Date()})
    },
    {
        label: 'This week',
        range: thisWeekRange
    },
    {
        label: 'Last week',
        range: () => {
            const lastWeek = subWeeks(new Date(), 1);
            return {
                start: startOfWeek(lastWeek, weekOptions),
                end: endOfWeek(lastWeek, weekOptions)
            }
        }
    },
    {
        label: 'Last 7 days',
        range: () => ({start: subDays(new Date(), 6), end: new Date()})
    },
    {
        label: 'This month',
        range: () => {
            const today = new Date();
            return {start: startOfMonth(today), end: endOfMonth(today)}
        }
    },
]

function DateRangeFilter({value, onChange}: DateRangeFilterProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    // Set after the first click of a range, until the range is completed.
    const [pendingStart, setPendingStart] = useState<Date | null>(null);
    const [warning, setWarning] = useState('');

    const closePopover = () => {
        setAnchorEl(null);
        setPendingStart(null);
        setWarning('');
    }

    const selectPreset = (range: DateRange) => {
        // "This week" and "This month" run past today, so they are trimmed to
        // the part that has actually happened.
        onChange(clampToToday(range));
        closePopover();
    }

    /**
     * A single click already selects that day on its own, so picking one date
     * needs no extra interaction. Clicking a later day extends the selection
     * into a range, clicking an earlier one starts over from that day.
     */
    const dayClicked = (day: Date | null) => {
        if (!day) {
            return;
        }
        if (pendingStart && day > pendingStart) {
            // The API rejects longer ranges, so the selection is refused here
            // with an explanation rather than coming back as a failed request.
            if (exceedsMaxRange(pendingStart, day)) {
                setWarning(
                    `A range cannot span more than ${MAX_RANGE_DAYS} days. ` +
                    'Pick an earlier end date.'
                );
                return;
            }
            onChange({start: pendingStart, end: day});
            setPendingStart(null);
        } else {
            onChange({start: day, end: day});
            setPendingStart(day);
        }
        setWarning('');
    }

    const renderDay = (dayProps: PickersDayProps<Date>) => {
        const {day, outsideCurrentMonth, ...other} = dayProps;
        const inRange = !outsideCurrentMonth && isWithinInterval(day, {
            start: new Date(value.start).setHours(0, 0, 0, 0),
            end: new Date(value.end).setHours(23, 59, 59, 999)
        });
        const isEdge = isSameDay(day, value.start) || isSameDay(day, value.end);
        return (
            <PickersDay
                {...other}
                day={day}
                outsideCurrentMonth={outsideCurrentMonth}
                selected={isEdge && !outsideCurrentMonth}
                sx={inRange && !isEdge ? {
                    backgroundColor: 'action.selected',
                    borderRadius: '50%'
                } : undefined}
            />
        )
    }

    return (
        <Box sx={{display: 'flex', justifyContent: 'flex-end', marginBottom: 1}}>
            <Button
                size="small"
                variant="outlined"
                startIcon={<CalendarIcon/>}
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{textTransform: 'none'}}
            >
                {formatDateRange(value)}
            </Button>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={closePopover}
                anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                transformOrigin={{vertical: 'top', horizontal: 'right'}}
            >
                <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm: 'row'}}}>
                    <List dense sx={{minWidth: 140, paddingTop: 1}}>
                        {presets.map((preset) =>
                            <ListItemButton key={preset.label} onClick={() => selectPreset(preset.range())}>
                                <ListItemText primary={preset.label}/>
                            </ListItemButton>
                        )}
                    </List>
                    <Divider orientation="vertical" flexItem/>
                    <Box>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DateCalendar
                                value={pendingStart ?? value.start}
                                onChange={dayClicked}
                                maxDate={maxSelectableDate()}
                                slots={{day: renderDay}}
                            />
                        </LocalizationProvider>
                        <Typography
                            variant="caption"
                            color={warning ? 'warning.main' : 'text.secondary'}
                            sx={{display: 'block', padding: '0 16px 12px', maxWidth: 320}}
                        >
                            {warning || (pendingStart
                                ? `Click a later date to extend the range, up to ${MAX_RANGE_DAYS} days.`
                                : 'Click a date to show that day, then click another to make it a range.')}
                        </Typography>
                    </Box>
                </Box>
            </Popover>
        </Box>
    )
}

export default DateRangeFilter;
