import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import {
  CalendarDays,
  Caravan,
  Compass,
  Edit3,
  ExternalLink,
  HelpCircle,
  LogOut,
  Map,
  MapPin,
  Mountain,
  RefreshCw,
  Route,
  TentTree,
  TreePine,
  X,
} from 'lucide-react';
import { WeekendCard } from './components/WeekendCard';
import {
  createWeekendScoutEvent,
  deleteWeekendScoutEvent,
  fetchCalendarEventDetails,
  fetchReadableCalendars,
  fetchPlanningEvents,
  renameWeekendScoutEvent,
  type GoogleCalendarListEntry,
  type GoogleCalendarEvent,
} from './lib/googleCalendar';
import { requestCalendarAccess, revokeCalendarAccess } from './lib/googleIdentity';
import { formatWeekendScoutTitle } from './lib/weekendScoutEvents';
import {
  generateWeekendBlocks,
  getWeekendCountForMonths,
  getWeekendScanRange,
  type PlanningEvent,
} from './lib/weekendPlanner';
import type { WeekendBlock, WeekendEvent } from './types/weekend';

const DEFAULT_MONTHS_AHEAD = 12;
const MIN_MONTHS_AHEAD = 1;
const MAX_MONTHS_AHEAD = 36;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function App() {
  const today = useMemo(() => new Date(), []);
  const [monthsAhead, setMonthsAhead] = useState(DEFAULT_MONTHS_AHEAD);
  const [accessToken, setAccessToken] = useState<string>();
  const [calendars, setCalendars] = useState<GoogleCalendarListEntry[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(new Set());
  const [calendarEvents, setCalendarEvents] = useState<PlanningEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WeekendEvent>();
  const [claimDraft, setClaimDraft] = useState<WeekendClaimDraft>();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [eventDetails, setEventDetails] = useState<GoogleCalendarEvent>();
  const [eventDetailsError, setEventDetailsError] = useState<string>();
  const [isLoadingEventDetails, setIsLoadingEventDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const weekends = useMemo(
    () =>
      generateWeekendBlocks(
        today,
        getWeekendCountForMonths(today, monthsAhead),
        calendarEvents,
      ),
    [calendarEvents, monthsAhead, today],
  );
  const accountedWeekends = weekends.filter((weekend) => weekend.status === 'accounted');
  const openWeekends = weekends.filter(
    (weekend) => weekend.status === 'free' && !weekend.isLongWeekend,
  );
  const longWeekends = weekends.filter(
    (weekend) => weekend.status === 'free' && weekend.isLongWeekend,
  );
  const hasCalendarData = Boolean(accessToken);
  const canConnect = Boolean(googleClientId) && !isLoading;
  const selectedCalendars = calendars.filter((calendar) =>
    selectedCalendarIds.has(calendar.id),
  );

  async function loadCalendarData(
    token: string,
    calendarsToFetch: GoogleCalendarListEntry[],
    monthsToScan = monthsAhead,
  ) {
    const scanRange = getWeekendScanRange(
      today,
      getWeekendCountForMonths(today, monthsToScan),
    );
    const events = await fetchPlanningEvents(
      token,
      scanRange.start,
      scanRange.end,
      calendarsToFetch,
    );

    setCalendarEvents(events);
  }

  async function handleConnectCalendar() {
    if (!googleClientId) {
      setError('Add VITE_GOOGLE_CLIENT_ID to .env.local before connecting Google Calendar.');
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const token = await requestCalendarAccess(googleClientId);
      const fetchedCalendars = await fetchReadableCalendars(token);
      const defaultSelectedCalendars = getDefaultSelectedCalendars(fetchedCalendars);

      setAccessToken(token);
      setCalendars(fetchedCalendars);
      setSelectedCalendarIds(new Set(defaultSelectedCalendars.map((calendar) => calendar.id)));
      await loadCalendarData(token, defaultSelectedCalendars);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Google Calendar connection failed.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefreshCalendar() {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      await loadCalendarData(accessToken, selectedCalendars);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Calendar refresh failed.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSignOut() {
    if (accessToken) {
      revokeCalendarAccess(accessToken);
    }

    setAccessToken(undefined);
    setCalendars([]);
    setSelectedCalendarIds(new Set());
    setCalendarEvents([]);
    setSelectedEvent(undefined);
    setEventDetails(undefined);
    setEventDetailsError(undefined);
    setError(undefined);
  }

  async function handleSelectEvent(event: WeekendEvent) {
    if (!accessToken || !event.calendarId || !event.googleEventId) {
      return;
    }

    setSelectedEvent(event);
    setEventDetails(undefined);
    setEventDetailsError(undefined);
    setIsLoadingEventDetails(true);

    try {
      const details = await fetchCalendarEventDetails(
        accessToken,
        event.calendarId,
        event.googleEventId,
      );

      setEventDetails(details);
    } catch (detailsError) {
      setEventDetailsError(
        detailsError instanceof Error
          ? detailsError.message
          : 'Unable to load this event from Google Calendar.',
      );
    } finally {
      setIsLoadingEventDetails(false);
    }
  }

  function handleCloseEventDetails() {
    setSelectedEvent(undefined);
    setEventDetails(undefined);
    setEventDetailsError(undefined);
  }

  async function handleToggleCalendar(calendarId: string) {
    if (!accessToken) {
      return;
    }

    const nextSelectedCalendarIds = new Set(selectedCalendarIds);

    if (nextSelectedCalendarIds.has(calendarId)) {
      nextSelectedCalendarIds.delete(calendarId);
    } else {
      nextSelectedCalendarIds.add(calendarId);
    }

    const nextSelectedCalendars = calendars.filter((calendar) =>
      nextSelectedCalendarIds.has(calendar.id),
    );

    setSelectedCalendarIds(nextSelectedCalendarIds);
    setIsLoading(true);
    setError(undefined);

    try {
      await loadCalendarData(accessToken, nextSelectedCalendars);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Calendar refresh failed.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleMarkWeekend(weekend: WeekendBlock) {
    setClaimDraft({ mode: 'create', weekend, name: '' });
  }

  function handleRenameWeekendScoutEvent(weekend: WeekendBlock, event: WeekendEvent) {
    if (!event.isWeekendScoutEvent) {
      return;
    }

    setClaimDraft({
      mode: 'rename',
      weekend,
      event,
      name: event.weekendScoutName ?? '',
    });
  }

  async function handleSaveWeekendClaim(name: string) {
    if (!accessToken || !claimDraft) {
      return;
    }

    const title = formatWeekendScoutTitle(name);

    setIsLoading(true);
    setError(undefined);

    try {
      if (claimDraft.mode === 'create') {
        await createWeekendScoutEvent(
          accessToken,
          title,
          claimDraft.weekend.startDateId,
          claimDraft.weekend.endDateId,
        );
      } else if (
        claimDraft.event?.calendarId &&
        claimDraft.event.googleEventId &&
        claimDraft.event.isWeekendScoutEvent
      ) {
        await renameWeekendScoutEvent(
          accessToken,
          claimDraft.event.calendarId,
          claimDraft.event.googleEventId,
          title,
        );
      }

      const calendarsToFetch = getCalendarsForWeekendScoutRefresh(
        calendars,
        selectedCalendarIds,
      );

      setSelectedCalendarIds(new Set(calendarsToFetch.map((calendar) => calendar.id)));
      await loadCalendarData(accessToken, calendarsToFetch);
      setClaimDraft(undefined);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : 'Unable to save weekend.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteWeekendScoutEvent(_weekend: WeekendBlock, event: WeekendEvent) {
    if (
      !accessToken ||
      !event.calendarId ||
      !event.googleEventId ||
      !event.isWeekendScoutEvent
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Clear "${event.weekendScoutName ?? event.title}" from Weekend Scout?`,
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      await deleteWeekendScoutEvent(accessToken, event.calendarId, event.googleEventId);
      await loadCalendarData(accessToken, selectedCalendars);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to clear weekend.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMonthsAheadChange(monthsValue: number) {
    const nextMonthsAhead = clampMonthsAhead(monthsValue);

    setMonthsAhead(nextMonthsAhead);

    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      await loadCalendarData(accessToken, selectedCalendars, nextMonthsAhead);
    } catch (rangeError) {
      setError(rangeError instanceof Error ? rangeError.message : 'Calendar refresh failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="atlas-map min-h-screen text-ink">
      <section className="border-b border-ink/10 bg-soil/75">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-center">
            <div className="flex flex-col gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-moss">
                  <Compass className="h-4 w-4" />
                  Weekend Scout
                </p>
                <h1 className="mt-1 max-w-3xl text-3xl font-semibold tracking-normal text-ink md:text-4xl">
                  Make the most of your weekends.
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                {hasCalendarData ? (
                  <>
                    <button
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink/15 bg-canopy/85 px-4 text-sm font-semibold text-ink shadow-sm transition hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isLoading}
                      onClick={handleRefreshCalendar}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </button>
                    <button
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-soil shadow-sm transition hover:bg-ink/90"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-soil shadow-sm transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canConnect}
                    onClick={handleConnectCalendar}
                  >
                    <CalendarDays className="h-4 w-4" />
                    {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
                  </button>
                )}
              </div>
            </div>

            <HeaderMapScene />
          </div>

          {error ? (
            <p className="rounded-md border border-sun/35 bg-sun/10 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          ) : null}

          {!googleClientId ? (
            <p className="rounded-md border border-lake/25 bg-lake/10 px-4 py-3 text-sm text-ink">
              Add a Google OAuth web client ID to .env.local as VITE_GOOGLE_CLIENT_ID
              to enable sign-in.
            </p>
          ) : null}

          {hasCalendarData ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="border-l-4 border-moss bg-canopy/85 px-3 py-2">
                <p className="text-xl font-semibold">{weekends.length}</p>
                <p className="text-xs text-ink/60">weekends scanned</p>
              </div>
              <div className="border-l-4 border-lake bg-canopy/85 px-3 py-2">
                <p className="text-xl font-semibold">{openWeekends.length}</p>
                <p className="text-xs text-ink/60">open weekends</p>
              </div>
              <div className="border-l-4 border-clay bg-canopy/85 px-3 py-2">
                <p className="text-xl font-semibold">{accountedWeekends.length}</p>
                <p className="text-xs text-ink/60">accounted for</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex max-w-xs items-center gap-3 rounded-md border border-ink/10 bg-canopy/85 px-3 py-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-trail" htmlFor="months-ahead">
                Months ahead
              </label>
              <input
                className="h-9 w-20 rounded-md border border-ink/15 bg-soil/55 px-2 text-sm font-semibold text-ink outline-none focus:border-lake"
                disabled={isLoading}
                id="months-ahead"
                max={MAX_MONTHS_AHEAD}
                min={MIN_MONTHS_AHEAD}
                onChange={(event) => handleMonthsAheadChange(Number(event.target.value))}
                type="number"
                value={monthsAhead}
              />
            </div>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-md border border-ink/10 bg-canopy/85 px-3 text-sm font-semibold text-ink transition hover:bg-ink/10"
              onClick={() => setIsHelpOpen(true)}
              type="button"
            >
              <HelpCircle className="h-4 w-4" />
              How this works
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {hasCalendarData ? (
          <>
            <CalendarSelector
              calendars={calendars}
              disabled={isLoading}
              selectedCalendarIds={selectedCalendarIds}
              onToggleCalendar={handleToggleCalendar}
            />
            <WeekendSection
              cardColumns="two"
              description="Weekends claimed with WKSC-prefixed Google Calendar events."
              onDeleteWeekendScoutEvent={handleDeleteWeekendScoutEvent}
              onMarkWeekend={handleMarkWeekend}
              onRenameWeekendScoutEvent={handleRenameWeekendScoutEvent}
              onSelectEvent={handleSelectEvent}
              title="Accounted For"
              weekends={accountedWeekends}
            />
            <div className="grid gap-4 border-t border-ink/10 py-4 lg:grid-cols-2">
              <WeekendSection
                cardColumns="one"
                description="Friday through Monday windows with nothing currently scheduled."
                onDeleteWeekendScoutEvent={handleDeleteWeekendScoutEvent}
                onMarkWeekend={handleMarkWeekend}
                onRenameWeekendScoutEvent={handleRenameWeekendScoutEvent}
                onSelectEvent={handleSelectEvent}
                title="Open Weekends"
                variant="trail"
                weekends={openWeekends}
              />
              <WeekendSection
                cardColumns="one"
                description="Federal holidays that create Friday or Monday planning windows."
                onDeleteWeekendScoutEvent={handleDeleteWeekendScoutEvent}
                onMarkWeekend={handleMarkWeekend}
                onRenameWeekendScoutEvent={handleRenameWeekendScoutEvent}
                onSelectEvent={handleSelectEvent}
                title="Long Weekends"
                variant="trail"
                weekends={longWeekends}
              />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-ink/10 bg-canopy/85 p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-ink">
              Connect Google Calendar to scan your weekends.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink/65">
              Weekend Scout reads the calendars available to your Google account,
              including calendars shared with you, then groups events into Friday
              through Monday planning windows.
            </p>
          </div>
        )}
      </section>

      {selectedEvent ? (
        <EventDetailsDialog
          error={eventDetailsError}
          event={selectedEvent}
          details={eventDetails}
          isLoading={isLoadingEventDetails}
          onClose={handleCloseEventDetails}
        />
      ) : null}

      {claimDraft ? (
        <WeekendClaimDialog
          draft={claimDraft}
          isSaving={isLoading}
          onClose={() => setClaimDraft(undefined)}
          onSave={handleSaveWeekendClaim}
        />
      ) : null}

      {isHelpOpen ? <HowThisWorksDialog onClose={() => setIsHelpOpen(false)} /> : null}
    </main>
  );
}

function getDefaultSelectedCalendars(calendars: GoogleCalendarListEntry[]) {
  const selectedCalendars = calendars.filter((calendar) => calendar.selected !== false);

  return selectedCalendars.length > 0 ? selectedCalendars : calendars;
}

function clampMonthsAhead(monthsAhead: number) {
  if (!Number.isFinite(monthsAhead)) {
    return DEFAULT_MONTHS_AHEAD;
  }

  return Math.min(
    MAX_MONTHS_AHEAD,
    Math.max(MIN_MONTHS_AHEAD, Math.round(monthsAhead)),
  );
}

function getCalendarsForWeekendScoutRefresh(
  calendars: GoogleCalendarListEntry[],
  selectedCalendarIds: Set<string>,
) {
  const selectedCalendars = calendars.filter((calendar) =>
    selectedCalendarIds.has(calendar.id),
  );
  const primaryCalendar = calendars.find((calendar) => calendar.primary);

  if (
    primaryCalendar &&
    !selectedCalendars.some((calendar) => calendar.id === primaryCalendar.id)
  ) {
    return [...selectedCalendars, primaryCalendar];
  }

  return selectedCalendars;
}

function HeaderMapScene() {
  return (
    <div className="map-scene hidden lg:block" aria-hidden="true">
      <div className="map-lake" />
      <div className="map-route" />
      <Mountain className="absolute left-8 top-7 h-14 w-14 text-lake/70" strokeWidth={1.8} />
      <TreePine className="absolute bottom-8 right-12 h-10 w-10 text-moss" strokeWidth={2} />
      <TreePine className="absolute bottom-7 right-24 h-7 w-7 text-moss/80" strokeWidth={2} />
      <TentTree className="absolute left-10 bottom-8 h-9 w-9 text-moss" strokeWidth={2} />
      <MapPin className="absolute right-24 top-10 h-8 w-8 text-clay" fill="currentColor" strokeWidth={1.8} />
      <Route className="absolute right-9 bottom-8 h-8 w-8 text-trail/70" strokeWidth={2} />
      <Map className="absolute left-28 top-8 h-7 w-7 text-trail/65" strokeWidth={2} />
      <Caravan className="absolute left-[42%] top-[44%] h-8 w-8 text-ink" strokeWidth={2.1} />
      <div className="map-rv">
        <span className="map-wheel map-wheel-left" />
        <span className="map-wheel map-wheel-right" />
      </div>
      <div className="map-rv map-rv-small">
        <span className="map-wheel map-wheel-left" />
        <span className="map-wheel map-wheel-right" />
      </div>
    </div>
  );
}

type CalendarSelectorProps = {
  calendars: GoogleCalendarListEntry[];
  selectedCalendarIds: Set<string>;
  disabled: boolean;
  onToggleCalendar: (calendarId: string) => void;
};

function CalendarSelector({
  calendars,
  selectedCalendarIds,
  disabled,
  onToggleCalendar,
}: CalendarSelectorProps) {
  return (
    <section className="border-b border-ink/10 py-3">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-ink">Calendars</h2>
        <p className="text-sm text-ink/60">
          Choose which Google calendars Weekend Scout should scan. This does not
          change what is hidden or shown in Google Calendar.
        </p>
      </div>

      <div className="grid max-h-32 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {calendars.map((calendar) => {
          const isSelected = selectedCalendarIds.has(calendar.id);

          return (
            <label
              className={`flex min-w-0 items-center gap-2 rounded-md border bg-canopy/85 px-2.5 py-2 text-xs shadow-sm transition ${
                isSelected
                  ? 'border-lake/40 ring-1 ring-lake/20'
                  : 'border-ink/10 opacity-75'
              } ${disabled ? 'cursor-wait' : 'cursor-pointer hover:border-lake/35'}`}
              key={calendar.id}
            >
              <input
                checked={isSelected}
                className="h-3.5 w-3.5 accent-lake"
                disabled={disabled}
                onChange={() => onToggleCalendar(calendar.id)}
                type="checkbox"
              />
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full border border-ink/10"
                style={{ backgroundColor: calendar.backgroundColor ?? '#4f7554' }}
              />
              <span className="min-w-0 flex-1 truncate text-ink">
                {calendar.summary}
              </span>
              {calendar.selected === false ? (
                <span className="shrink-0 rounded-full bg-trail/10 px-2 py-0.5 text-xs font-medium text-trail">
                  hidden
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </section>
  );
}

type WeekendSectionProps = {
  title: string;
  description: string;
  weekends: WeekendBlock[];
  onSelectEvent: (event: WeekendEvent) => void;
  onMarkWeekend: (weekend: WeekendBlock) => void;
  onRenameWeekendScoutEvent: (weekend: WeekendBlock, event: WeekendEvent) => void;
  onDeleteWeekendScoutEvent: (weekend: WeekendBlock, event: WeekendEvent) => void;
  cardColumns?: 'one' | 'two';
  variant?: 'plain' | 'trail';
};

function WeekendSection({
  title,
  description,
  weekends,
  onSelectEvent,
  onMarkWeekend,
  onRenameWeekendScoutEvent,
  onDeleteWeekendScoutEvent,
  cardColumns = 'two',
  variant = 'plain',
}: WeekendSectionProps) {
  return (
    <section
      className={
        variant === 'trail'
          ? 'border-l-4 border-trail/30 bg-canopy/50 p-3'
          : 'py-4'
      }
    >
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="text-xs text-ink/55">{description}</p>
      </div>

      {weekends.length > 0 ? (
        <div
          className={`grid max-h-[34rem] gap-3 overflow-y-auto pr-1 ${
            cardColumns === 'two' ? 'lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {weekends.map((weekend) => (
            <WeekendCard
              key={weekend.id}
              weekend={weekend}
              onSelectEvent={onSelectEvent}
              onMarkWeekend={onMarkWeekend}
              onRenameWeekendScoutEvent={onRenameWeekendScoutEvent}
              onDeleteWeekendScoutEvent={onDeleteWeekendScoutEvent}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-ink/20 bg-canopy/80 px-4 py-3 text-sm text-ink/60">
          Nothing in this group for the current scan window.
        </p>
      )}
    </section>
  );
}

type WeekendClaimDraft = {
  mode: 'create' | 'rename';
  weekend: WeekendBlock;
  event?: WeekendEvent;
  name: string;
};

function HowThisWorksDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-soil/75 px-3 py-3 sm:items-center sm:justify-center"
      role="dialog"
    >
      <div className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-lg border border-ink/15 bg-paper shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 bg-canopy/90 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-moss">Quick Guide</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">How this works</h2>
          </div>
          <button
            aria-label="Close help"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink/10 bg-soil/50 text-ink transition hover:bg-ink/10"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm text-ink/75">
          <HelpSection title="Open vs. accounted for">
            Weekends start open by default. Regular Google Calendar events are shown
            for context, but they do not make a weekend taken.
          </HelpSection>

          <HelpSection title="WKSC events">
            When you mark a weekend accounted for, Weekend Scout creates an all-day
            Google Calendar event prefixed with <strong className="text-ink">WKSC-</strong>,
            like <strong className="text-ink">WKSC-Yellowstone Trip</strong>. Only
            WKSC-prefixed events can be renamed or cleared from this app.
          </HelpSection>

          <HelpSection title="Long weekends">
            Long weekends are detected from U.S. federal holidays that land on Friday
            or Monday. They are planning signals, not automatically taken weekends.
          </HelpSection>

          <HelpSection title="Calendar filters">
            The Calendars panel controls which Google calendars Weekend Scout scans.
            These checkboxes only affect this app; they do not change your Google
            Calendar sidebar settings.
          </HelpSection>

          <HelpSection title="Months ahead">
            The months-ahead input controls how far into the future Weekend Scout
            pulls events and generates Friday-through-Monday weekend blocks. It
            defaults to 12 months.
          </HelpSection>
        </div>
      </div>
    </div>
  );
}

function HelpSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-ink/10 bg-canopy/70 px-4 py-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-trail">
        {title}
      </h3>
      <p className="mt-2 leading-6">{children}</p>
    </section>
  );
}

type WeekendClaimDialogProps = {
  draft: WeekendClaimDraft;
  isSaving: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
};

function WeekendClaimDialog({
  draft,
  isSaving,
  onClose,
  onSave,
}: WeekendClaimDialogProps) {
  const [name, setName] = useState(draft.name);
  const trimmedName = name.trim();
  const title =
    draft.mode === 'create' ? 'Mark Weekend Accounted For' : 'Rename Weekend';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedName) {
      return;
    }

    onSave(trimmedName);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-soil/75 px-3 py-3 sm:items-center sm:justify-center"
      role="dialog"
    >
      <form
        className="w-full max-w-lg rounded-lg border border-ink/15 bg-paper shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 bg-canopy/90 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-moss">{draft.weekend.rangeLabel}</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-ink">
              <Edit3 className="h-5 w-5" />
              {title}
            </h2>
          </div>
          <button
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink/10 bg-soil/50 text-ink transition hover:bg-ink/10"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Weekend name</span>
            <input
              autoFocus
              className="mt-2 h-11 w-full rounded-md border border-ink/15 bg-soil/55 px-3 text-sm text-ink outline-none focus:border-lake"
              disabled={isSaving}
              onChange={(event) => setName(event.target.value)}
              placeholder="Yellowstone Trip"
              value={name}
            />
          </label>

          <p className="rounded-md border border-trail/20 bg-canopy/60 px-3 py-2 text-xs text-ink/65">
            Weekend Scout will save this to Google Calendar as{' '}
            <span className="font-semibold text-ink">
              {trimmedName ? formatWeekendScoutTitle(trimmedName) : 'WKSC-...'}
            </span>
            . Only WKSC-prefixed events can be renamed or cleared here.
          </p>

          <div className="flex justify-end gap-2">
            <button
              className="rounded-md border border-ink/10 bg-soil/50 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink/10"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-soil transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || !trimmedName}
              type="submit"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

type EventDetailsDialogProps = {
  event: WeekendEvent;
  details?: GoogleCalendarEvent;
  error?: string;
  isLoading: boolean;
  onClose: () => void;
};

function EventDetailsDialog({
  event,
  details,
  error,
  isLoading,
  onClose,
}: EventDetailsDialogProps) {
  const title = details?.summary ?? event.title;
  const location = details?.location;
  const description = normalizeDescription(details?.description);
  const organizer = details?.organizer?.displayName ?? details?.organizer?.email;
  const attendees = details?.attendees ?? [];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-soil/75 px-3 py-3 sm:items-center sm:justify-center"
      role="dialog"
    >
      <div className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-lg border border-ink/15 bg-paper shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 bg-canopy/90 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-moss">{event.calendarName}</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">{title}</h2>
          </div>
          <button
            aria-label="Close event details"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink/10 bg-soil/50 text-ink transition hover:bg-ink/10"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {isLoading ? (
            <p className="rounded-md border border-dashed border-ink/20 bg-canopy/80 px-4 py-3 text-sm text-ink/65">
              Loading event details from Google Calendar...
            </p>
          ) : null}

          {error ? (
            <p className="rounded-md border border-sun/35 bg-sun/10 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          ) : null}

          {details ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="When" value={formatGoogleEventTime(details)} />
                <DetailItem label="Status" value={details.status ?? 'Confirmed'} />
                {location ? <DetailItem label="Where" value={location} /> : null}
                {organizer ? <DetailItem label="Organizer" value={organizer} /> : null}
              </div>

              {description ? (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-trail">
                    Details
                  </h3>
                  <p className="mt-2 whitespace-pre-line rounded-md border border-ink/10 bg-canopy/80 px-4 py-3 text-sm leading-6 text-ink/75">
                    {description}
                  </p>
                </section>
              ) : null}

              {attendees.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-trail">
                    Guests
                  </h3>
                  <div className="mt-2 grid gap-2">
                    {attendees.slice(0, 8).map((attendee) => (
                      <p
                        className="rounded-md border border-ink/10 bg-canopy/80 px-3 py-2 text-sm text-ink/70"
                        key={attendee.email ?? attendee.displayName}
                      >
                        {attendee.displayName ?? attendee.email}
                        {attendee.responseStatus ? (
                          <span className="text-ink/45"> · {attendee.responseStatus}</span>
                        ) : null}
                      </p>
                    ))}
                  </div>
                </section>
              ) : null}

              {details.htmlLink ? (
                <a
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-soil transition hover:bg-ink/90"
                  href={details.htmlLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open in Google Calendar
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-canopy/80 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-trail">
        {label}
      </p>
      <p className="mt-1 text-sm text-ink/75">{value}</p>
    </div>
  );
}

function formatGoogleEventTime(event: GoogleCalendarEvent) {
  if (event.start.date) {
    return `${formatDateOnly(event.start.date)} · All day`;
  }

  const startDate = new Date(event.start.dateTime ?? '');
  const endDate = new Date(event.end.dateTime ?? '');

  if (Number.isNaN(startDate.getTime())) {
    return 'Time unavailable';
  }

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(startDate);
  const startTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(startDate);

  if (Number.isNaN(endDate.getTime())) {
    return `${dateLabel} · ${startTime}`;
  }

  const endTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(endDate);

  return `${dateLabel} · ${startTime} - ${endTime}`;
}

function formatDateOnly(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parsedDate);
}

function normalizeDescription(description?: string) {
  if (!description) {
    return undefined;
  }

  const document = new DOMParser().parseFromString(description, 'text/html');
  const plainText = document.body.textContent?.trim();

  return plainText || description.trim();
}
