export type WeekendStatus = 'free' | 'light' | 'busy';

export type WeekendEvent = {
  id: string;
  googleEventId?: string;
  calendarId?: string;
  day: 'Fri' | 'Sat' | 'Sun' | 'Mon';
  time: string;
  title: string;
  calendarName: string;
  kind?: 'calendar' | 'holiday';
};

export type WeekendBlock = {
  id: string;
  title: string;
  rangeLabel: string;
  status: WeekendStatus;
  events: WeekendEvent[];
  holidayName?: string;
  isLongWeekend: boolean;
};
