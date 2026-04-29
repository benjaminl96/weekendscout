import { addDays, isDateInWeekendBlock, isSameDate } from './dateUtils';

export type FederalHoliday = {
  name: string;
  date: Date;
};

function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  occurrence: number,
) {
  const date = new Date(year, monthIndex, 1);
  const daysUntilWeekday = (weekday - date.getDay() + 7) % 7;

  return new Date(year, monthIndex, 1 + daysUntilWeekday + (occurrence - 1) * 7);
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number) {
  const date = new Date(year, monthIndex + 1, 0);
  const daysSinceWeekday = (date.getDay() - weekday + 7) % 7;

  return new Date(year, monthIndex, date.getDate() - daysSinceWeekday);
}

function observedFixedHoliday(name: string, year: number, monthIndex: number, day: number) {
  const actualDate = new Date(year, monthIndex, day);

  if (actualDate.getDay() === 6) {
    return { name, date: addDays(actualDate, -1) };
  }

  if (actualDate.getDay() === 0) {
    return { name, date: addDays(actualDate, 1) };
  }

  return { name, date: actualDate };
}

export function getFederalHolidaysForYear(year: number): FederalHoliday[] {
  return [
    observedFixedHoliday("New Year's Day", year, 0, 1),
    {
      name: 'Martin Luther King Jr. Day',
      date: nthWeekdayOfMonth(year, 0, 1, 3),
    },
    {
      name: "Washington's Birthday",
      date: nthWeekdayOfMonth(year, 1, 1, 3),
    },
    {
      name: 'Memorial Day',
      date: lastWeekdayOfMonth(year, 4, 1),
    },
    observedFixedHoliday('Juneteenth', year, 5, 19),
    observedFixedHoliday('Independence Day', year, 6, 4),
    {
      name: 'Labor Day',
      date: nthWeekdayOfMonth(year, 8, 1, 1),
    },
    {
      name: 'Columbus Day',
      date: nthWeekdayOfMonth(year, 9, 1, 2),
    },
    observedFixedHoliday('Veterans Day', year, 10, 11),
    {
      name: 'Thanksgiving Day',
      date: nthWeekdayOfMonth(year, 10, 4, 4),
    },
    observedFixedHoliday('Christmas Day', year, 11, 25),
  ];
}

export function getLongWeekendHoliday(friday: Date) {
  const yearsToCheck = [friday.getFullYear(), addDays(friday, 3).getFullYear()];

  return yearsToCheck
    .flatMap((year) => getFederalHolidaysForYear(year))
    .find((holiday) => {
      const isFridayOrMonday = holiday.date.getDay() === 5 || holiday.date.getDay() === 1;

      return isFridayOrMonday && isDateInWeekendBlock(holiday.date, friday);
    });
}

export function isFederalHoliday(date: Date) {
  return getFederalHolidaysForYear(date.getFullYear()).some((holiday) =>
    isSameDate(holiday.date, date),
  );
}
