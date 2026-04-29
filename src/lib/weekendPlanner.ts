import type { WeekendBlock, WeekendEvent } from '../types/weekend';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  findUpcomingFriday,
  formatDateWithOrdinal,
  formatWeekendRange,
  getWeekendDayLabel,
  isDateInWeekendBlock,
  toDateId,
} from './dateUtils';
import { getLongWeekendHoliday } from './federalHolidays';
import { getWeekendScoutName, isWeekendScoutTitle } from './weekendScoutEvents';

export type PlanningEvent = {
  id: string;
  googleEventId: string;
  calendarId: string;
  date: Date;
  time: string;
  title: string;
  calendarName: string;
};

export function generateWeekendBlocks(
  fromDate: Date,
  weekendCount: number,
  events: PlanningEvent[],
): WeekendBlock[] {
  const firstFriday = findUpcomingFriday(fromDate);

  return Array.from({ length: weekendCount }, (_, index) => {
    const friday = addDays(firstFriday, index * 7);
    const endDate = addDays(friday, 4);
    const holiday = getLongWeekendHoliday(friday);
    const holidayEvent = holiday ? toHolidayWeekendEvent(holiday.name, holiday.date) : undefined;
    const weekendEvents = events
      .filter((event) => isDateInWeekendBlock(event.date, friday))
      .map(toWeekendEvent);
    const weekendScoutEvent = weekendEvents.find((event) => event.isWeekendScoutEvent);
    const allEvents = holidayEvent ? [...weekendEvents, holidayEvent] : weekendEvents;

    return {
      id: toDateId(friday),
      startDateId: toDateId(friday),
      endDateId: toDateId(endDate),
      title: getWeekendTitle(friday, allEvents, weekendScoutEvent, holiday?.name),
      rangeLabel: formatWeekendRange(friday),
      status: weekendScoutEvent ? 'accounted' : 'free',
      events: allEvents,
      weekendScoutEvent,
      holidayName: holiday?.name,
      isLongWeekend: Boolean(holiday),
    };
  });
}

export function getWeekendScanRange(fromDate: Date, weekendCount: number) {
  const firstFriday = findUpcomingFriday(fromDate);

  return {
    start: firstFriday,
    end: addDays(firstFriday, (weekendCount - 1) * 7 + 4),
  };
}

export function getWeekendCountForMonths(fromDate: Date, monthsAhead: number) {
  const firstFriday = findUpcomingFriday(fromDate);
  const scanEnd = addMonths(fromDate, monthsAhead);
  const daysToScan = differenceInCalendarDays(firstFriday, scanEnd);

  return Math.max(1, Math.ceil(daysToScan / 7));
}

function getWeekendTitle(
  friday: Date,
  events: WeekendEvent[],
  weekendScoutEvent?: WeekendEvent,
  holidayName?: string,
) {
  const fridayLabel = formatDateWithOrdinal(friday);

  if (weekendScoutEvent?.weekendScoutName) {
    return weekendScoutEvent.weekendScoutName;
  }

  if (holidayName) {
    return `${holidayName} weekend`;
  }

  if (events.length === 0) {
    return `${fridayLabel} open weekend`;
  }

  return `${fridayLabel} open weekend`;
}

function toWeekendEvent(event: PlanningEvent): WeekendEvent {
  const day = getWeekendDayLabel(event.date);

  if (!day) {
    throw new Error('Planning event is outside the Friday-Monday weekend window.');
  }

  return {
    id: event.id,
    googleEventId: event.googleEventId,
    calendarId: event.calendarId,
    day,
    time: event.time,
    title: event.title,
    calendarName: event.calendarName,
    kind: 'calendar',
    isWeekendScoutEvent: isWeekendScoutTitle(event.title),
    weekendScoutName: isWeekendScoutTitle(event.title)
      ? getWeekendScoutName(event.title)
      : undefined,
  };
}

function toHolidayWeekendEvent(name: string, date: Date): WeekendEvent {
  const day = getWeekendDayLabel(date);

  if (!day) {
    throw new Error('Holiday is outside the Friday-Monday weekend window.');
  }

  return {
    id: `holiday-${toDateId(date)}`,
    day,
    time: 'All day',
    title: name,
    calendarName: 'U.S. federal holiday',
    kind: 'holiday',
  };
}
