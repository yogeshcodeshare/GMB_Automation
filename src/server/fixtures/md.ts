/** Tiny markdown helpers for the GMB Everywhere fixture exports. */

/** Split a markdown table row into trimmed cells (drops the outer empties). */
export function splitRow(line: string): string[] {
  const cells = line.split("|").map((c) => c.trim());
  // "| a | b |" → ["", "a", "b", ""]
  return cells.slice(1, cells.length - 1);
}

export function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "");
}

/** All data rows of the first table found at/after `startIndex`. */
export function parseTableAt(
  lines: string[],
  startIndex: number
): { rows: string[][]; endIndex: number } {
  let i = startIndex;
  while (i < lines.length && !isTableRow(lines[i])) i++;
  const rows: string[][] = [];
  let sawHeader = false;
  for (; i < lines.length && isTableRow(lines[i]); i++) {
    const cells = splitRow(lines[i]);
    if (isSeparatorRow(cells)) continue;
    if (!sawHeader) {
      sawHeader = true; // skip the header row
      continue;
    }
    rows.push(cells);
  }
  return { rows, endIndex: i };
}

/** Index of the first line matching `re` at/after `from` (-1 when absent). */
export function findLine(lines: string[], re: RegExp, from = 0): number {
  for (let i = from; i < lines.length; i++) {
    if (re.test(lines[i])) return i;
  }
  return -1;
}

/** Lines of one section: from the heading match until the next heading of the
 * same-or-higher level or a "---" rule. */
export function sectionLines(
  lines: string[],
  headingRe: RegExp,
  level: number
): string[] {
  const start = findLine(lines, headingRe);
  if (start === -1) return [];
  const out: string[] = [];
  const stopRe = new RegExp(`^#{1,${level}}\\s`);
  for (let i = start + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (stopRe.test(t) || t === "---") break;
    out.push(lines[i]);
  }
  return out;
}

export function stripBold(s: string): string {
  return s.replace(/\*\*/g, "").trim();
}

/** "**Business Name:** X" / "**Website:** Y" → value after the first colon. */
export function labeledValue(lines: string[], label: string): string | null {
  const re = new RegExp(`^\\*\\*${label}:?\\*\\*:?\\s*(.+)$`, "i");
  for (const line of lines) {
    const m = re.exec(line.trim());
    if (m) return m[1].trim();
  }
  return null;
}
