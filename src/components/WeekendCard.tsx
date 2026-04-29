import { CalendarClock, CheckCircle2, Sparkles } from 'lucide-react';
import type { WeekendBlock, WeekendEvent } from '../types/weekend';

type WeekendCardProps = {
  weekend: WeekendBlock;
  onSelectEvent: (event: WeekendEvent) => void;
  onMarkWeekend: (weekend: WeekendBlock) => void;
  onRenameWeekendScoutEvent: (weekend: WeekendBlock, event: WeekendEvent) => void;
  onDeleteWeekendScoutEvent: (weekend: WeekendBlock, event: WeekendEvent) => void;
};

const statusStyles = {
  free: {
    label: 'Open',
    className: 'bg-moss/15 text-moss ring-moss/25',
    icon: CheckCircle2,
  },
  accounted: {
    label: 'Accounted',
    className: 'bg-clay/20 text-ink ring-clay/30',
    icon: CalendarClock,
  },
};

export function WeekendCard({
  weekend,
  onSelectEvent,
  onMarkWeekend,
  onRenameWeekendScoutEvent,
  onDeleteWeekendScoutEvent,
}: WeekendCardProps) {
  const status = statusStyles[weekend.status];
  const StatusIcon = status.icon;

  return (
    <article className="rounded-md border border-ink/10 bg-canopy/85 p-3 shadow-sm shadow-soil/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink/50">{weekend.rangeLabel}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <h2 className="text-base font-semibold text-ink">{weekend.title}</h2>
            {weekend.isLongWeekend ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sun/15 px-1.5 py-0.5 text-[11px] font-semibold text-ink ring-1 ring-sun/30">
                <Sparkles className="h-3 w-3" />
                3-day weekend
              </span>
            ) : null}
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.className}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {weekend.weekendScoutEvent ? (
          <>
            <button
              className="rounded-md border border-ink/10 bg-soil/45 px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-ink/10"
              onClick={() =>
                onRenameWeekendScoutEvent(weekend, weekend.weekendScoutEvent!)
              }
              type="button"
            >
              Rename
            </button>
            <button
              className="rounded-md border border-clay/35 bg-clay/10 px-2.5 py-1 text-xs font-semibold text-clay transition hover:bg-clay/20"
              onClick={() =>
                onDeleteWeekendScoutEvent(weekend, weekend.weekendScoutEvent!)
              }
              type="button"
            >
              Clear
            </button>
          </>
        ) : (
          <button
            className="rounded-md border border-moss/35 bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss transition hover:bg-moss/20"
            onClick={() => onMarkWeekend(weekend)}
            type="button"
          >
            Mark accounted for
          </button>
        )}
      </div>

      <div className="mt-3 max-h-[10.5rem] space-y-2 overflow-y-auto pr-1">
        {weekend.events.length === 0 ? (
          <p className="rounded-md border border-dashed border-moss/35 bg-moss/10 px-3 py-2 text-xs text-ink/65">
            Nothing found Friday through Monday.
          </p>
        ) : (
          weekend.events.map((event) => {
            const canOpenDetails = event.kind === 'calendar' && event.calendarId && event.googleEventId;

            return (
            <button
              key={event.id}
              type="button"
              disabled={!canOpenDetails}
              onClick={() => canOpenDetails && onSelectEvent(event)}
              className={`grid w-full grid-cols-[3.4rem_1fr] gap-2 rounded-md border px-2.5 py-2 ${
                event.kind === 'holiday'
                  ? 'border-sun/35 bg-sun/10 text-left'
                  : event.isWeekendScoutEvent
                    ? 'border-clay/40 bg-clay/15 text-left transition hover:border-clay/60 hover:bg-clay/20'
                  : 'border-ink/10 bg-soil/35 text-left transition hover:border-lake/45 hover:bg-lake/10 disabled:cursor-default disabled:hover:border-sun/35 disabled:hover:bg-sun/10'
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-ink">{event.day}</p>
                <p className="text-[11px] leading-4 text-ink/45">{event.time}</p>
              </div>
              <div>
                <p className="line-clamp-1 text-xs font-medium text-ink">
                  {event.isWeekendScoutEvent
                    ? event.weekendScoutName
                    : event.title}
                </p>
                <p className="line-clamp-1 text-[11px] text-ink/45">{event.calendarName}</p>
              </div>
            </button>
            );
          })
        )}
      </div>
    </article>
  );
}
