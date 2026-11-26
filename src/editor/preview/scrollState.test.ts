import { afterEach, describe, expect, it } from "vitest";
import { captureScroll, findScrollContainer, restoreScroll } from "./scrollState";

afterEach(() => {
  document.body.innerHTML = "";
});

function mount(markup: string): void {
  document.body.innerHTML = markup;
}

describe("preview scroll preservation", () => {
  it("finds the nearest scrollable ancestor", () => {
    mount(
      '<div id="host" style="overflow: auto"><div id="middle"><div id="start"></div></div></div><div id="plain"></div>',
    );
    expect(findScrollContainer(document.getElementById("start"))?.id).toBe("host");
    expect(findScrollContainer(document.getElementById("plain"))).toBe(document.documentElement);
  });

  it("captures and restores both scroll axes", () => {
    mount('<div id="host" style="overflow: scroll"><div id="start"></div></div>');
    const host = document.getElementById("host") as HTMLElement;
    host.scrollTop = 120;
    host.scrollLeft = 7;

    const snapshot = captureScroll(document.getElementById("start"));
    host.scrollTop = 0;
    host.scrollLeft = 0;

    restoreScroll(snapshot);
    expect(host.scrollTop).toBe(120);
    expect(host.scrollLeft).toBe(7);
  });

  it("captures the document scroll element when nothing else scrolls", () => {
    mount('<div id="start"></div>');
    document.documentElement.scrollTop = 42;
    const snapshot = captureScroll(document.getElementById("start"));
    document.documentElement.scrollTop = 0;
    restoreScroll(snapshot);
    expect(document.documentElement.scrollTop).toBe(42);
  });

  it("ignores a snapshot without an element", () => {
    expect(() => restoreScroll({ element: null, top: 10, left: 10 })).not.toThrow();
  });
});
