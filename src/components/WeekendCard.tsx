import { CalendarClock, CheckCircle2, CircleAlert, Sparkles } from 'lucide-react';
import type { WeekendBlock } from '../types/weekend';

type WeekendCardProps = {
  weekend: WeekendBlock;
};

const statusStyles = {
  free: {
    label: 'Free',
    className: 'bg-moss/10 text-moss ring-moss/20',
    icon: CheckCircle2,
  },
  light: {
    label: 'Light',
    className: 'bg-lake/10 text-lake ring-lake/20',
    icon: CalendarClock,
  },
  busy: {
    label: 'Busy',
    className: 'bg-sun/15 text-ink ring-sun/30',
    icon: CircleAlert,
  },
};

export function WeekendCard({ weekend }: WeekendCardProps) {
  const status = statusStyles[weekend.status];
  const StatusIcon = status.icon;

  return (
    <article className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink/55">{weekend.rangeLabel}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-ink">{weekend.title}</h2>
            {weekend.isLongWeekend ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sun/15 px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-sun/30">
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

      <div className="mt-4 space-y-3">
        {weekend.events.length === 0 ? (
          <p className="rounded-md border border-dashed border-moss/35 bg-moss/5 px-3 py-3 text-sm text-ink/70">
            Nothing found Friday through Monday.
          </p>
        ) : (
          weekend.events.map((event) => (
            <div
              key={event.id}
              className={`grid grid-cols-[4.5rem_1fr] gap-3 rounded-md border px-3 py-2 ${
                event.kind === 'holiday'
                  ? 'border-sun/35 bg-sun/10'
                  : 'border-ink/10'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-ink">{event.day}</p>
                <p className="text-xs text-ink/55">{event.time}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{event.title}</p>
                <p className="text-xs text-ink/55">{event.calendarName}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
