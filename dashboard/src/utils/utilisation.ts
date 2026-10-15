import {classifyItem, ClassifiableItem} from "./scheduleItem";

export const HOURS_PER_DAY = 7

export interface UtilisableItem extends ClassifiableItem {
  start: number,
  end: number,
  group?: number | string,
  hoursPerDay?: number | null
}

export interface Utilisation {
  booked: number,
  capacity: number,
  percent: number,
  overbookedDays: number
}

/** Local midnight of the day a timestamp falls on, which is how items store their dates */
const toDayStart = (time: number) => {
  const date = new Date(time)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Next local midnight (not +24h, which breaks on daylight saving changes) */
const nextDay = (day: number) => {
  const date = new Date(day)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime()
}

const isWeekend = (day: number) => {
  const weekday = new Date(day).getDay()
  return weekday === 0 || weekday === 6
}

/**
 * Booked vs available hours per person over [rangeStart, rangeEnd), weekdays only.
 * Leave and holidays reduce a person's capacity for that day, notes are ignored.
 * `rootOf` maps an item to the id of the person row it belongs to.
 */
export function computeUtilisation(
  items: UtilisableItem[],
  rootOf: (item: UtilisableItem) => string | null,
  rangeStart: number,
  rangeEnd: number
): Map<string, Utilisation> {
  const from = toDayStart(rangeStart)
  const to = toDayStart(rangeEnd)
  const booked = new Map<string, Map<number, number>>()
  const off = new Map<string, Map<number, number>>()

  const add = (target: Map<string, Map<number, number>>, root: string, day: number, hours: number) => {
    let days = target.get(root)
    if (!days) target.set(root, days = new Map())
    days.set(day, (days.get(day) || 0) + hours)
  }

  for (const item of items) {
    const root = rootOf(item)
    if (root === null) continue
    const cls = classifyItem(item)
    const isOff = cls.isLeave || cls.isHoliday
    if (!isOff && cls.isNoteOnly) continue
    const hours = item.hoursPerDay || HOURS_PER_DAY
    const last = Math.min(toDayStart(item.end), to)
    for (let day = Math.max(toDayStart(item.start), from); day < last; day = nextDay(day)) {
      if (isWeekend(day)) continue
      add(isOff ? off : booked, root, day, hours)
    }
  }

  const result = new Map<string, Utilisation>()
  const roots = new Set([...Array.from(booked.keys()), ...Array.from(off.keys())])
  roots.forEach(root => {
    let totalBooked = 0
    let capacity = 0
    let overbookedDays = 0
    for (let day = from; day < to; day = nextDay(day)) {
      if (isWeekend(day)) continue
      const available = Math.max(0, HOURS_PER_DAY - (off.get(root)?.get(day) || 0))
      const hours = booked.get(root)?.get(day) || 0
      capacity += available
      totalBooked += hours
      if (hours > available) overbookedDays++
    }
    result.set(root, {
      booked: totalBooked,
      capacity,
      percent: capacity > 0 ? Math.round(totalBooked / capacity * 100) : (totalBooked > 0 ? 100 : 0),
      overbookedDays
    })
  })
  return result
}
