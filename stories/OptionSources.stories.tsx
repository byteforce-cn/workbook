import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";

import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import {
  createOptionsCapabilityRegistry,
  createOptionsCapabilityWorkbook,
  createRemoteOptionsCapabilityWorkbook,
} from "./workbookCapabilityFixtures";

function createJsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

function RemoteOptionsStory() {
  const [isMockReady, setIsMockReady] = useState(false);
  const [requestLog, setRequestLog] = useState<{
    urlCalls: number;
    graphqlCalls: number;
    lastUrlBody?: unknown;
    lastGraphqlBody?: unknown;
  }>({
    urlCalls: 0,
    graphqlCalls: 0,
  });

  useEffect(() => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input, init) => {
      const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const requestBody = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;

      if (requestUrl === "https://workbook.example/api/cities") {
        const region = typeof requestBody?.context?.region === "string" ? requestBody.context.region : "east";
        const records =
          region === "west"
            ? [
                { id: "cd", name: "成都站" },
                { id: "cq", name: "重庆站" },
              ]
            : [
                { id: "sh", name: "上海站" },
                { id: "hz", name: "杭州站" },
              ];

        setRequestLog((current) => ({
          ...current,
          urlCalls: current.urlCalls + 1,
          lastUrlBody: requestBody,
        }));

        return createJsonResponse({ payload: { records } });
      }

      if (requestUrl === "https://workbook.example/graphql") {
        const mode = typeof requestBody?.variables?.mode === "string" ? requestBody.variables.mode : "standard";
        const nodes =
          mode === "rush"
            ? [
                { code: "u3", displayName: "赵六" },
                { code: "u4", displayName: "钱七" },
              ]
            : [
                { code: "u1", displayName: "张三" },
                { code: "u2", displayName: "李四" },
              ];

        setRequestLog((current) => ({
          ...current,
          graphqlCalls: current.graphqlCalls + 1,
          lastGraphqlBody: requestBody,
        }));

        return createJsonResponse({ data: { assignees: { nodes } } });
      }

      return originalFetch(input, init);
    }) as typeof globalThis.fetch;

    setIsMockReady(true);

    return () => {
      globalThis.fetch = originalFetch;
    };
  }, []);

  return (
    <div data-testid="workbook-story-remote-options">
      {isMockReady ? (
        <WorkbookStoryHarness
          testId="workbook-story-remote-options-harness"
          workbook={createRemoteOptionsCapabilityWorkbook()}
          caption="同时覆盖 url 与 graphql 两类远端 options source，右侧日志直接暴露请求次数、query/variables 与 $field 解析结果。"
          width="1080px"
          inspector={
            <div>
              <h3 style={{ marginTop: 0, marginBottom: "12px", fontSize: "16px", color: "#0f172a" }}>请求日志</h3>
              <pre
                data-testid="workbook-story-remote-options-log"
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "12px",
                  lineHeight: 1.6,
                  color: "#1e293b",
                }}
              >
                {JSON.stringify(requestLog, null, 2)}
              </pre>
            </div>
          }
        />
      ) : (
        <div style={{ padding: "24px", borderRadius: "16px", border: "1px solid #d9e1ec", background: "#ffffff" }}>
          正在安装远端选项源 mock...
        </div>
      )}
    </div>
  );
}

const meta = {
  title: "Workbook/Option Sources",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CustomDrivenOptions: Story = {
  args: {
    testId: "workbook-story-options",
    workbook: createOptionsCapabilityWorkbook(),
    caption: "同时展示静态 options 与基于 registry 的 custom optionSource，区域切换后城市选项会同步刷新。",
    width: "1080px",
  },
  render: (args) => <WorkbookStoryHarness {...args} registry={createOptionsCapabilityRegistry()} />,
};

export const UrlAndGraphqlRemoteOptions: Story = {
  args: {
    testId: "workbook-story-remote-options-harness",
    workbook: createRemoteOptionsCapabilityWorkbook(),
  },
  render: () => <RemoteOptionsStory />,
};
