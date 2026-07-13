/**
 * Placeholder for screens scheduled later in the sprint (docs/PLAN_7DAY.md).
 * Keeps every sidebar destination navigable while screens land day by day.
 */
export function StubPage({
  title,
  day,
}: {
  title: string;
  /** Sprint day the screen ships, e.g. "Day 3". */
  day: string;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-[rgba(27,35,33,0.22)] p-[18px] text-center">
      <div className="mb-1 text-[13.5px] font-bold">{title}</div>
      <div className="text-[12.5px] leading-relaxed text-ink-soft">
        This screen is being built on {day} of the sprint — the design is final
        in the handoff prototype.
      </div>
    </div>
  );
}
