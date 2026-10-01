import { type ReactNode, useState } from "react";
import type { WorkbookData } from "../src/core/types";
import { DocumentRenderer } from "../src/DocumentRenderer";
import type { WorkbookPluginRegistry } from "../src/react/registry";
import type { WorkbookDefinition } from "../src/schema/generated-types";

export interface WorkbookStoryHarnessProps {
  workbook: WorkbookDefinition;
  testId: string;
  registry?: WorkbookPluginRegistry;
  width?: string;
  caption?: string;
  inspector?: ReactNode;
}

export function WorkbookStoryHarness({
  workbook,
  testId,
  registry,
  width = "1200px",
  caption,
  inspector,
}: WorkbookStoryHarnessProps) {
  const [workbookDocument] = useState<WorkbookDefinition>(() => structuredClone(workbook));
  const [initialData] = useState<WorkbookData>(() => structuredClone(workbook.data as WorkbookData));
  const [data, setData] = useState<WorkbookData>(() => structuredClone(initialData));

  const title = workbookDocument.views[0]?.label ?? "Workbook Story";

  return (
    <section
      data-testid={testId}
      style={{
        width,
        margin: "0 auto",
        background: "#ffffff",
        border: "1px solid #d9e1ec",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
      }}
    >
      <header style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "24px", color: "#0f172a" }}>{title}</h2>
        {caption != null ? <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.6 }}>{caption}</p> : null}
      </header>

      <div
        style={{
          display: "grid",
          gap: "24px",
          alignItems: "start",
          gridTemplateColumns: "minmax(0, 2fr) minmax(300px, 1fr)",
        }}
      >
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", background: "#f8fafc" }}>
          <DocumentRenderer
            workbook={workbookDocument}
            registry={registry}
            initialData={structuredClone(initialData)}
            onDataChange={setData}
          />
        </div>

        <aside style={{ border: "1px solid #dbe4f0", borderRadius: "16px", padding: "16px", background: "#f8fafc" }}>
          <h3 style={{ marginTop: 0, marginBottom: "12px", fontSize: "16px", color: "#0f172a" }}>实时数据树</h3>
          <pre
            data-testid={`${testId}-state`}
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "12px",
              lineHeight: 1.6,
              color: "#1e293b",
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
          {inspector != null ? <div style={{ marginTop: "16px" }}>{inspector}</div> : null}
        </aside>
      </div>
    </section>
  );
}
