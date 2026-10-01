import type { ReactNode } from "react";

export interface StoryShellProps {
  /** data-testid root for e2e targeting */
  testId: string;
  /** Optional custom title (defaults to workbook view label) */
  title?: string;
  /** One-line description shown under the title */
  caption?: string;
  /** Capability badges displayed under the caption (e.g. "校验", "i18n", "插件") */
  capabilities?: string[];
  /** Optional source code snippet shown in a collapsible panel */
  code?: string;
  /** Content width (default "min(1280px, calc(100vw - 48px))") */
  width?: string;
  /** Main interactive content */
  children: ReactNode;
  /** Optional right-hand inspector panel */
  inspector?: ReactNode;
}

/**
 * StoryShell — unified container for all BF Workbook stories.
 *
 * Gives every story a consistent production-quality frame: header with
 * capability badges, collapsible source-code panel, and optional live
 * inspector, so evaluators can both *see* the capability and *reproduce*
 * it from the code snippet.
 */
export function StoryShell({
  testId,
  title,
  caption,
  capabilities,
  code,
  width = "min(1280px, calc(100vw - 48px))",
  children,
  inspector,
}: StoryShellProps) {
  return (
    <section
      data-testid={testId}
      style={{
        width,
        margin: "0 auto",
        display: "grid",
        gap: "18px",
        color: "#172033",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <header
        style={{
          display: "grid",
          gap: "10px",
          border: "1px solid #d7e0ea",
          borderRadius: "8px",
          background: "#ffffff",
          padding: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title != null ? <h2 style={{ margin: 0, fontSize: "22px", lineHeight: 1.25 }}>{title}</h2> : null}
            {caption != null ? (
              <p style={{ margin: "6px 0 0", color: "#526173", lineHeight: 1.55 }}>{caption}</p>
            ) : null}
          </div>
          {capabilities != null && capabilities.length > 0 ? (
            <ul
              aria-label="能力标签"
              style={{
                margin: 0,
                padding: 0,
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                listStyle: "none",
              }}
            >
              {capabilities.map((cap) => (
                <li
                  key={cap}
                  style={{
                    border: "1px solid #bfdbfe",
                    borderRadius: "999px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "3px 10px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cap}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {code != null ? (
          <details data-testid={`${testId}-code`}>
            <summary
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#2563eb",
                fontSize: "13px",
                fontWeight: 700,
                userSelect: "none",
              }}
            >
              查看示例代码
            </summary>
            <pre
              style={{
                margin: "10px 0 0",
                overflow: "auto",
                borderRadius: "8px",
                background: "#0f172a",
                color: "#e2e8f0",
                fontSize: "12.5px",
                lineHeight: 1.6,
                padding: "14px 16px",
                whiteSpace: "pre",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            >
              <code>{code}</code>
            </pre>
          </details>
        ) : null}
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: inspector != null ? "minmax(0, 1fr) 300px" : "minmax(0, 1fr)",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <section
          style={{
            border: "1px solid #d7e0ea",
            borderRadius: "8px",
            background: "#ffffff",
            padding: "18px",
            overflow: "auto",
            minWidth: 0,
          }}
        >
          {children}
        </section>
        {inspector != null ? (
          <aside
            style={{
              border: "1px solid #d7e0ea",
              borderRadius: "8px",
              background: "#ffffff",
              padding: "16px",
              minWidth: 0,
            }}
          >
            {inspector}
          </aside>
        ) : null}
      </main>
    </section>
  );
}

/** Renders a dark code block (used inside inspector panels). */
export function CodeBlock({ code, maxHeight = "420px" }: { code: string; maxHeight?: string }) {
  return (
    <pre
      style={{
        margin: 0,
        overflow: "auto",
        borderRadius: "8px",
        background: "#0f172a",
        color: "#e2e8f0",
        fontSize: "12px",
        lineHeight: 1.55,
        padding: "12px 14px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxHeight,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    >
      <code>{code}</code>
    </pre>
  );
}
