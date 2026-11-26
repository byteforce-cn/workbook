import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { docsLink, sourceLink, storyNote } from "./storyDocs";
import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import {
  createOptionsCapabilityRegistry,
  createOptionsCapabilityWorkbook,
  createRemoteOptionsCapabilityWorkbook,
} from "./workbookCapabilityFixtures";

const componentDocs = `### 适用场景
下拉/多选的选项来自静态常量、远程接口或插件时，用 \`optionSource\` 统一声明，而不是把选项硬编码到组件里。

### 最小可运行示例
\`\`\`tsx
// 静态
options: [{ value: "east", label: "华东" }]

// 远程
options: {
  type: "url",
  endpoint: "/api/cities",
  params: { region: "east" },
  dependsOn: ["region"],
  cache: "memory",
  cacheKey: "cities",
  dataPath: "data.items",
  valueKey: "code",
  labelKey: "name",
}
\`\`\`

### API
- 形式一：\`{ value, label, disabled?, group? }[]\`。
- 形式二：\`{ type: "url" | "graphql" | "custom", endpoint?, method?, params?, query?, dataPath?, valueKey?, labelKey?, cache?, cacheKey?, dependsOn?, searchDebounce? }\`。
- \`custom\` 类型由 \`registry.registerOptionSource\` 注册；\`dependsOn\` 中的字段变化会重拉。

### 边界与错误
- 请求失败时字段保留旧选项并进入错误态，不会清空已选值。
- \`dataPath\` 写错时拿到空数组，不会抛错——表现为「没有选项」。
- \`cache: "memory"\` 需配合 \`cacheKey\` 才能在数据变更时主动失效（\`clearOptionCache\`）。

### 源码
${sourceLink("src/core/options/fetchOptions.ts", "src/core/options/fetchOptions.ts")} · ${docsLink("guides/custom-option-source", "guides/custom-option-source")}`;

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
  parameters: { docs: { description: { component: componentDocs } } },
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CustomDrivenOptions: Story = {
  parameters: storyNote(
    "先改「所属区域」，再看「城市」：选项来自 registry 注册的 custom optionSource，会随区域重新解析，而不是一次写死。",
  ),
  args: {
    testId: "workbook-story-options",
    workbook: createOptionsCapabilityWorkbook(),
    caption: "同时展示静态 options 与基于 registry 的 custom optionSource，区域切换后城市选项会同步刷新。",
    width: "1080px",
  },
  render: (args) => <WorkbookStoryHarness {...args} registry={createOptionsCapabilityRegistry()} />,
};

export const UrlAndGraphqlRemoteOptions: Story = {
  parameters: storyNote(
    "右侧面板提供 url / graphql 两个开关（本 demo 用本地 mock 响应）：切换后下拉选项改由远程拉取，输入关键字会走 searchDebounce。",
  ),
  args: {
    testId: "workbook-story-remote-options-harness",
    workbook: createRemoteOptionsCapabilityWorkbook(),
  },
  render: () => <RemoteOptionsStory />,
};
