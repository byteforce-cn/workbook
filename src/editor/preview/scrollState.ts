/**
 * Scroll preservation for the edit ↔ preview switch.
 *
 * The editor is usually hosted inside an application scroll container (or the
 * page itself). Toggling the panes must not send the reader back to the top, so
 * the switch captures the nearest scrollable ancestor and restores its offset
 * once React has laid the other pane out.
 */

export interface ScrollSnapshot {
  element: HTMLElement | null;
  top: number;
  left: number;
}

function allowsScroll(overflow: string): boolean {
  return overflow === "auto" || overflow === "scroll" || overflow === "overlay";
}

function isScrollContainer(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  // jsdom does not expand the `overflow` shorthand into `overflowX/Y`.
  return [style.overflow, style.overflowX, style.overflowY].some(allowsScroll);
}

/**
 * Nearest scrollable ancestor of `start`, falling back to the document scroll
 * element so page-level scrolling is restored too.
 */
export function findScrollContainer(start: Element | null): HTMLElement | null {
  let current = start?.parentElement ?? null;

  while (current != null) {
    if (current instanceof HTMLElement && isScrollContainer(current)) {
      return current;
    }
    current = current.parentElement;
  }

  const root = document.scrollingElement;
  return root instanceof HTMLElement ? root : document.documentElement;
}

export function captureScroll(start: Element | null): ScrollSnapshot {
  const element = findScrollContainer(start);
  return {
    element,
    top: element?.scrollTop ?? 0,
    left: element?.scrollLeft ?? 0,
  };
}

export function restoreScroll(snapshot: ScrollSnapshot): void {
  if (snapshot.element == null) {
    return;
  }

  snapshot.element.scrollTop = snapshot.top;
  snapshot.element.scrollLeft = snapshot.left;
}
