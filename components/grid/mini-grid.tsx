/** Small before/after rank-matrix thumbnail (history compare artifact). */
export function MiniGrid({ matrix }: { matrix: number[][] }) {
  const color = (r: number) =>
    r <= 3 ? "#177B4B" : r <= 10 ? "#C77D00" : r <= 19 ? "#B3372B" : "#8A928D";
  return (
    <div className="relative aspect-square overflow-hidden rounded-[10px] border border-[rgba(27,35,33,0.08)] bg-[#E9EBE3]">
      {matrix.flatMap((row, ri) =>
        row.map((r, ci) => (
          <span
            key={`${ri}-${ci}`}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-pin"
            style={{
              left: `${12 + ci * 19}%`,
              top: `${12 + ri * 19}%`,
              background: color(r),
            }}
          />
        )),
      )}
    </div>
  );
}
