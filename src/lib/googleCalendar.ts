import { parseDateOnly } from './dateUtils';
import { isWeekendScoutTitle } from './weekendScoutEvents';
import type { PlanningEvent } from './weekendPlanner';

export const CALENDAR_READONLY_SCOPE =
  'https://www.googleapis.com/auth/calendar.readonly';

export const CALENDAR_EVENTS_SCOPE =
  'https://www.googleapis.com/auth/calendar.events';

export type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  primary?: boolean;
  selected?: boolean;
  accessRole?: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  backgroundColor?: string;
  foregroundColor?: string;
};

export type GoogleCalendarEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  creator?: {
    email?: string;
    displayName?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
  attendees?: {
    email?: string;
    displayName?: string;
    responseStatus?: string;
    optional?: boolean;
  }[];
  start: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
};

type CalendarListResponse = {
  items?: GoogleCalendarListEntry[];
};

type EventsResponse = {
  items?: GoogleCalendarEvent[];
};

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export async function fetchReadableCalendars(accessToken: string) {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load Google calendar list.');
  }

  const data = (await response.json()) as CalendarListResponse;

  return (data.items ?? []).filter((calendar) => calendar.accessRole !== 'none');
}

export async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
) {
  const params = new URLSearchParams({
    showDeleted: 'false',
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin,
    timeMax,
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to load events for calendar ${calendarId}.`);
  }

  const data = (await response.json()) as EventsResponse;

  return data.items ?? [];
}

export async function fetchCalendarEventDetails(
  accessToken: string,
  calendarId: string,
  eventId: string,
) {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events/${encodeURIComponent(eventId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Unable to load this event from Google Calendar.');
  }

  return (await response.json()) as GoogleCalendarEvent;
}

export async function createWeekendScoutEvent(
  accessToken: string,
  summary: string,
  startDateId: string,
  endDateId: string,
) {
  if (!isWeekendScoutTitle(summary)) {
    throw new Error('Weekend Scout can only create WKSC-prefixed events.');
  }

  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events`, {
    body: JSON.stringify({
      summary,
      description: 'Created by Weekend Scout.',
      start: { date: startDateId },
      end: { date: endDateId },
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Unable to create Weekend Scout event.');
  }

  return (await response.json()) as GoogleCalendarEvent;
}

export async function renameWeekendScoutEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  summary: string,
) {
  if (!isWeekendScoutTitle(summary)) {
    throw new Error('Weekend Scout can only rename WKSC-prefixed events.');
  }

  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events/${encodeURIComponent(eventId)}`,
    {
      body: JSON.stringify({ summary }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    },
  );

  if (!response.ok) {
    throw new Error('Unable to rename Weekend Scout event.');
  }

  return (await response.json()) as GoogleCalendarEvent;
}

export async function deleteWeekendScoutEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
) {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events/${encodeURIComponent(eventId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'DELETE',
    },
  );

  if (!response.ok) {
    throw new Error('Unable to delete Weekend Scout event.');
  }
}

export async function fetchPlanningEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
  calendars?: GoogleCalendarListEntry[],
) {
  const calendarsToFetch = calendars ?? (await fetchReadableCalendars(accessToken));
  const eventGroups = await Promise.allSettled(
    calendarsToFetch.map(async (calendar) => {
      const events = await fetchCalendarEvents(
        accessToken,
        calendar.id,
        timeMin.toISOString(),
        timeMax.toISOString(),
      );

      return events.map((event) => toPlanningEvent(event, calendar));
    }),
  );

  return eventGroups.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );
}

function toPlanningEvent(
  event: GoogleCalendarEvent,
  calendar: GoogleCalendarListEntry,
): PlanningEvent {
  const startDate = event.start.date
    ? parseDateOnly(event.start.date)
    : new Date(event.start.dateTime ?? '');
  const time = event.start.date ? 'All day' : formatEventTime(startDate);

  return {
    id: `${calendar.id}-${event.id}`,
    googleEventId: event.id,
    calendarId: calendar.id,
    date: startDate,
    time,
    title: event.summary ?? 'Busy',
    calendarName: calendar.summary,
  };
}

function formatEventTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
