import {
    addDays,
    addWeeks,
    differenceInCalendarDays,
    endOfWeek,
    format,
    isSameDay,
    startOfDay,
    startOfWeek
} from "date-fns";

export type DateRange = {
    start: Date;
    end: Date;
}

/**
 * Longest range the API will accept. Must match MAX_RANGE_DAYS in
 * timesheet/api_views/timesheet.py, which rejects anything longer with a 400.
 */
export const MAX_RANGE_DAYS = 31;

/** True when a range is longer than the API allows, using the same comparison. */
export const exceedsMaxRange = (start: Date, end: Date) =>
    differenceInCalendarDays(end, start) > MAX_RANGE_DAYS;

// Weeks start on Monday, matching how the timesheet week is reported.
export const weekOptions = {weekStartsOn: 1 as const};

/** Today with the time stripped. */
export const today = () => startOfDay(new Date());

/** Friday of next week — the latest day that can be selected in the picker. */
export const maxSelectableDate = () =>
    addDays(startOfWeek(addWeeks(new Date(), 1), weekOptions), 4);

/** Trim a range so that it never reaches into the future. */
export const clampToToday = ({start, end}: DateRange): DateRange => {
    const limit = today();
    return {
        start: start > limit ? limit : start,
        end: end > limit ? limit : end
    };
}

/** This week so far — the remainder of the week has not happened yet. */
export const thisWeekRange = (): DateRange => {
    const now = new Date();
    return clampToToday({
        start: startOfWeek(now, weekOptions),
        end: endOfWeek(now, weekOptions)
    });
}

/** Key format used to group time logs by day. */
export const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

/**
 * Split a range into consecutive chunks of at most `days` days.
 *
 * Used to keep a long import from becoming one very slow request: the server
 * makes one ERPNext call per timesheet document, so a whole month in a single
 * request can outlast a production request timeout.
 */
export const splitIntoChunks = (range: DateRange, days: number): DateRange[] => {
    const chunks: DateRange[] = [];
    const end = startOfDay(range.end);
    let start = startOfDay(range.start);
    while (start <= end) {
        const candidate = addDays(start, days - 1);
        const chunkEnd = candidate > end ? end : candidate;
        chunks.push({start, end: chunkEnd});
        start = addDays(chunkEnd, 1);
    }
    return chunks;
}

export const formatDateRange = ({start, end}: DateRange) => {
    if (isSameDay(start, end)) {
        return format(start, 'EEE, d MMM yyyy');
    }
    if (start.getFullYear() === end.getFullYear()) {
        return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
    }
    return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
}
