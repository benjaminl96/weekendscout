const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKEND_DAY_LABELS = ['Fri', 'Sat', 'Sun', 'Mon'] as const;

export type WeekendDayLabel = (typeof WEEKEND_DAY_LABELS)[number];

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function toDateId(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseDateOnly(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function getExclusiveEndOfDay(date: Date) {
  return addDays(startOfDay(date), 1);
}

export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatWeekendRange(friday: Date) {
  const monday = addDays(friday, 3);

  return `Fri ${formatShortDate(friday)} - Mon ${formatShortDate(monday)}`;
}

export function getWeekendDayLabel(date: Date): WeekendDayLabel | undefined {
  const label = DAY_LABELS[date.getDay()];

  return WEEKEND_DAY_LABELS.includes(label as WeekendDayLabel)
    ? (label as WeekendDayLabel)
    : undefined;
}

export function findUpcomingFriday(fromDate: Date) {
  const date = startOfDay(fromDate);
  const daysUntilFriday = (5 - date.getDay() + 7) % 7;

  return addDays(date, daysUntilFriday);
}

export function isSameDate(left: Date, right: Date) {
  return toDateId(left) === toDateId(right);
}

export function isDateInWeekendBlock(date: Date, friday: Date) {
  const target = startOfDay(date).getTime();
  const start = startOfDay(friday).getTime();
  const end = addDays(startOfDay(friday), 3).getTime();

  return target >= start && target <= end;
}
