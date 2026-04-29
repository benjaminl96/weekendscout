import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Caravan,
  Compass,
  LogOut,
  Map,
  MapPin,
  Mountain,
  RefreshCw,
  Route,
  TentTree,
  TreePine,
} from 'lucide-react';
import { WeekendCard } from './components/WeekendCard';
import { fetchPlanningEvents } from './lib/googleCalendar';
import { requestCalendarAccess, revokeCalendarAccess } from './lib/googleIdentity';
import {
  generateWeekendBlocks,
  getWeekendScanRange,
  type PlanningEvent,
} from './lib/weekendPlanner';
import type { WeekendBlock } from './types/weekend';

const WEEKEND_COUNT = 16;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function App() {
  const today = useMemo(() => new Date(), []);
  const [accessToken, setAccessToken] = useState<string>();
  const [calendarEvents, setCalendarEvents] = useState<PlanningEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const weekends = useMemo(
    () => generateWeekendBlocks(today, WEEKEND_COUNT, calendarEvents),
    [calendarEvents, today],
  );
  const longWeekends = weekends.filter((weekend) => weekend.isLongWeekend);
  const openWeekends = weekends.filter(
    (weekend) => weekend.status === 'free' && !weekend.isLongWeekend,
  );
  const otherWeekends = weekends.filter(
    (weekend) => !weekend.isLongWeekend && weekend.status !== 'free',
  );
  const hasCalendarData = Boolean(accessToken);
  const canConnect = Boolean(googleClientId) && !isLoading;

  async function loadCalendarData(token: string) {
    const scanRange = getWeekendScanRange(today, WEEKEND_COUNT);
    const events = await fetchPlanningEvents(token, scanRange.start, scanRange.end);

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
      setAccessToken(token);
      await loadCalendarData(token);
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
      await loadCalendarData(accessToken);
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
    setCalendarEvents([]);
    setError(undefined);
  }

  return (
    <main className="atlas-map min-h-screen text-ink">
      <section className="border-b border-ink/10 bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center">
            <div className="flex flex-col gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-moss">
                  <Compass className="h-4 w-4" />
                  Weekend Scout
                </p>
                <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-normal text-ink md:text-5xl">
                  Make the most of your weekends.
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                {hasCalendarData ? (
                  <>
                    <button
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isLoading}
                      onClick={handleRefreshCalendar}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </button>
                    <button
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-ink/90"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border-l-4 border-moss bg-paper px-4 py-3">
                <p className="text-2xl font-semibold">{weekends.length}</p>
                <p className="text-sm text-ink/70">weekends scanned</p>
              </div>
              <div className="border-l-4 border-lake bg-paper px-4 py-3">
                <p className="text-2xl font-semibold">{openWeekends.length}</p>
                <p className="text-sm text-ink/70">open weekends</p>
              </div>
              <div className="border-l-4 border-clay bg-paper px-4 py-3">
                <p className="text-2xl font-semibold">{longWeekends.length}</p>
                <p className="text-sm text-ink/70">federal long weekends</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {hasCalendarData ? (
          <>
            <WeekendSection
              cardColumns="two"
              description="Weekends with calendar events already on the books."
              title="Scheduled Weekends"
              weekends={otherWeekends}
            />
            <div className="grid gap-5 border-t border-ink/10 py-5 lg:grid-cols-2">
              <WeekendSection
                cardColumns="one"
                description="Friday through Monday windows with nothing currently scheduled."
                title="Open Weekends"
                variant="trail"
                weekends={openWeekends}
              />
              <WeekendSection
                cardColumns="one"
                description="Federal holidays that create Friday or Monday planning windows."
                title="Long Weekends"
                variant="trail"
                weekends={longWeekends}
              />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-ink">
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
    </main>
  );
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

type WeekendSectionProps = {
  title: string;
  description: string;
  weekends: WeekendBlock[];
  cardColumns?: 'one' | 'two';
  variant?: 'plain' | 'trail';
};

function WeekendSection({
  title,
  description,
  weekends,
  cardColumns = 'two',
  variant = 'plain',
}: WeekendSectionProps) {
  return (
    <section
      className={
        variant === 'trail'
          ? 'border-l-4 border-trail/30 bg-white/60 p-4'
          : 'py-5'
      }
    >
      <div className="mb-3">
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        <p className="text-sm text-ink/60">{description}</p>
      </div>

      {weekends.length > 0 ? (
        <div
          className={`grid gap-4 ${
            cardColumns === 'two' ? 'lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {weekends.map((weekend) => (
            <WeekendCard key={weekend.id} weekend={weekend} />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-ink/20 bg-white px-4 py-3 text-sm text-ink/60">
          Nothing in this group for the current scan window.
        </p>
      )}
    </section>
  );
}
