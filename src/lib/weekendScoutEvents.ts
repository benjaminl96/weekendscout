export const WEEKEND_SCOUT_PREFIX = 'WKSC-';

export function formatWeekendScoutTitle(name: string) {
  return `${WEEKEND_SCOUT_PREFIX}${name.trim()}`;
}

export function isWeekendScoutTitle(title?: string) {
  return title?.startsWith(WEEKEND_SCOUT_PREFIX) ?? false;
}

export function getWeekendScoutName(title: string) {
  return title.replace(WEEKEND_SCOUT_PREFIX, '').trim();
}
