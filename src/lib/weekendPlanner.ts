import type { WeekendBlock, WeekendEvent } from '../types/weekend';
import {
  addDays,
  findUpcomingFriday,
  formatDateWithOrdinal,
  formatWeekendRange,
  getWeekendDayLabel,
  isDateInWeekendBlock,
  toDateId,
} from './dateUtils';
import { getLongWeekendHoliday } from './federalHolidays';

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
    const holiday = getLongWeekendHoliday(friday);
    const holidayEvent = holiday ? toHolidayWeekendEvent(holiday.name, holiday.date) : undefined;
    const weekendEvents = events
      .filter((event) => isDateInWeekendBlock(event.date, friday))
      .map(toWeekendEvent);
    const allEvents = holidayEvent ? [...weekendEvents, holidayEvent] : weekendEvents;

    return {
      id: toDateId(friday),
      title: holiday ? `${holiday.name} weekend` : getDefaultWeekendTitle(friday, allEvents),
      rangeLabel: formatWeekendRange(friday),
      status: getWeekendStatus(weekendEvents.length),
      events: allEvents,
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

function getDefaultWeekendTitle(friday: Date, events: WeekendEvent[]) {
  const fridayLabel = formatDateWithOrdinal(friday);

  if (events.length === 0) {
    return `${fridayLabel} open weekend`;
  }

  if (events.length === 1) {
    return `${fridayLabel} mostly clear`;
  }

  return `${fridayLabel} weekend`;
}

function getWeekendStatus(calendarEventCount: number) {
  if (calendarEventCount === 0) {
    return 'free';
  }

  if (calendarEventCount <= 1) {
    return 'light';
  }

  return 'busy';
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
