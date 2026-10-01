export interface VisibleRange {
  start: number;
  end: number;
  offset: number;
}

export function computeVisibleRange(
  sizes: number[],
  scrollOffset: number,
  viewportSize: number,
  overscan = 1,
): VisibleRange {
  const viewportStart = Math.max(0, scrollOffset);
  const viewportEnd = viewportStart + Math.max(0, viewportSize);
  let offset = 0;
  let start = 0;

  while (start < sizes.length && offset + sizes[start] <= viewportStart) {
    offset += sizes[start];
    start += 1;
  }

  let end = start;
  let cursor = offset;
  while (end < sizes.length && cursor < viewportEnd) {
    cursor += sizes[end];
    end += 1;
  }

  const overscannedStart = Math.max(0, start - overscan);
  const overscannedOffset = sizes.slice(0, overscannedStart).reduce((sum, size) => sum + size, 0);

  return {
    start: overscannedStart,
    end: Math.min(sizes.length, end + overscan),
    offset: overscannedOffset,
  };
}
