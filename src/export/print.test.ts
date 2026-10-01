import { describe, expect, it } from "vitest";

import { createPluginRegistry } from "../react/registry";
import type { WorkbookDefinition } from "../schema/generated-types";
import { exportWorkbookPdf } from "./pdf";
import { collectWorkbookPrintablePages, createWorkbookPrintHtml } from "./print";

describe("workbook print export", () => {
  it("orders copies according to collate and emits print metadata", () => {
    const document = createWorkbookPrintHtml(
      [
        { width: 100, height: 200, title: "第一页", svg: '<svg width="100" height="200"></svg>' },
        { width: 100, height: 200, title: "第二页", svg: '<svg width="100" height="200"></svg>' },
      ],
      { copies: 2, collate: false, duplex: "duplexLong", orientation: "landscape", scale: "80%" },
    );

    expect(document.pages.map((page) => page.title)).toEqual(["第一页", "第一页", "第二页", "第二页"]);
    expect(document.css).toContain("@page { size: landscape; margin: 0; }");
    expect(document.css).toContain("transform: scale(0.8)");
    expect(document.html).toContain('data-duplex="duplexLong"');
    expect(document.html).toContain('data-copies="2"');
  });

  it("collects rendered page svgs from a workbook container", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="bf-workbook-page-view">
        <svg width="595" height="842" viewBox="0 0 595 842" aria-label="打印页"><text>hello</text></svg>
      </div>
    `;

    const pages = collectWorkbookPrintablePages(root);

    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ width: 595, height: 842, title: "打印页" });
    expect(pages[0]?.svg).toContain("hello");
  });

  it("runs print hooks around binary PDF export", async () => {
    const registry = createPluginRegistry();
    const calls: string[] = [];
    registry.hook.set("print:before", async () => calls.push("before"));
    registry.hook.set("print:after", async () => calls.push("after"));
    const workbook: WorkbookDefinition = {
      kind: "workbook",
      schemaVersion: "4.1.1",
      data: { title: "print hooks" },
      hooks: [
        { trigger: "onBeforePrint", type: "function", config: { name: "print:before" } },
        { trigger: "onAfterPrint", type: "function", config: { name: "print:after" } },
      ],
      views: [
        {
          type: "page",
          pageSettings: { width: 240, height: 160, marginTop: 16, marginRight: 16, marginBottom: 16, marginLeft: 16 },
          content: [{ type: "paragraph", runs: [{ type: "text", text: "hook pdf" }] }],
        },
      ],
    };

    const result = await exportWorkbookPdf({ workbook, registry });

    expect(calls).toEqual(["before", "after"]);
    expect(new TextDecoder().decode(result.bytes)).toContain("%PDF-1.7");
  });
});
