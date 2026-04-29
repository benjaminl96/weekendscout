export type WeekendStatus = 'free' | 'accounted';

export type WeekendEvent = {
  id: string;
  googleEventId?: string;
  calendarId?: string;
  day: 'Fri' | 'Sat' | 'Sun' | 'Mon';
  time: string;
  title: string;
  calendarName: string;
  kind?: 'calendar' | 'holiday';
  isWeekendScoutEvent?: boolean;
  weekendScoutName?: string;
};

export type WeekendBlock = {
  id: string;
  startDateId: string;
  endDateId: string;
  title: string;
  rangeLabel: string;
  status: WeekendStatus;
  events: WeekendEvent[];
  weekendScoutEvent?: WeekendEvent;
  holidayName?: string;
  isLongWeekend: boolean;
};
