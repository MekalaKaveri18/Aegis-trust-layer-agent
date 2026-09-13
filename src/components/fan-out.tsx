import { formatTime } from "@/lib/format";
import type { IntegrationEvent } from "@/lib/trust/types";
import { AppPill } from "./badges";
import { FanoutMark } from "./status";

export function FanOut({ events }: { events: IntegrationEvent[] }) {
  if (!events.length) return null;
  return (
    <ul className="divide-y divide-[#eee] overflow-hidden rounded-md border border-[#e8e8e8]">
      {events.map((ev) => (
        <li key={ev.id} className="px-3 py-2">
          <div className="flex items-center gap-2">
            <AppPill app={ev.app} />
            <FanoutMark ok={ev.ok} />
            <span className="ml-auto text-[11px] text-[#a3a3a3]">{formatTime(ev.at)}</span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-[#333]">{ev.summary}</p>
          {ev.url ? (
            <a
              href={ev.url}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block truncate text-[11px] text-[#8a8a8a] underline-offset-2 hover:text-[#0c0c0c] hover:underline"
            >
              {ev.url}
            </a>
          ) : ev.detail ? (
            <p className="mt-0.5 truncate font-mono text-[11px] text-[#a3a3a3]">{ev.detail}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
