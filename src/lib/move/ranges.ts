export type Range = { start: Date; end: Date };

/** Sorts and joins ranges that overlap or touch. */
export function mergeRanges(ranges: readonly Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Range[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start.getTime() <= last.end.getTime()) {
      if (range.end.getTime() > last.end.getTime()) last.end = range.end;
    } else {
      merged.push({ start: range.start, end: range.end });
    }
  }
  return merged;
}

/** Removes `cut` from every range, splitting a range when the cut falls inside it. */
export function subtractRange(ranges: readonly Range[], cut: Range): Range[] {
  const out: Range[] = [];
  for (const range of ranges) {
    const overlaps = range.start < cut.end && range.end > cut.start;
    if (!overlaps) {
      out.push(range);
      continue;
    }
    if (range.start < cut.start) out.push({ start: range.start, end: cut.start });
    if (range.end > cut.end) out.push({ start: cut.end, end: range.end });
  }
  return out;
}
