/**
 * RNWorkbookDocument —— page 视图（分页文档）便捷封装
 *
 * 与 RNWorkbookForm 对等：WorkbookRuntimeProvider + DataProvider + RNPageView。
 * 自动选择 page 视图（activeViewId 优先，否则取首个 page 视图）。
 *
 * 使用（业务侧）：
 * ```tsx
 * import { RNWorkbookDocument } from "@byteforce/workbook/react-native";
 *
 * <RNWorkbookDocument workbook={workbook} />
 * ```
 */

import { Text } from "react-native";
import type { PageViewDefinition } from "../core/types";
import { DataProvider } from "../react/DataProvider";
import { WorkbookRuntimeProvider } from "../react/RuntimeProvider";
import type { WorkbookPluginRegistry } from "../react/registry";
import { pluginRegistry } from "../react/registry";
import type { WorkbookDefinition } from "../schema/generated-types";
import { RNPageView } from "./RNPageView";

export interface RNWorkbookDocumentProps {
  workbook: WorkbookDefinition;
  registry?: WorkbookPluginRegistry;
  locale?: string;
  fallbackLocale?: string;
  /** 指定渲染的 page 视图 id；缺省取首个 page 视图 */
  activeViewId?: string;
}

export function RNWorkbookDocument({
  workbook,
  registry,
  locale,
  fallbackLocale,
  activeViewId,
}: RNWorkbookDocumentProps) {
  const pageView = workbook.views.find(
    (view): view is PageViewDefinition => view.type === "page" && (activeViewId == null || view.id === activeViewId),
  );

  return (
    <WorkbookRuntimeProvider
      workbook={workbook}
      registry={registry ?? pluginRegistry}
      locale={locale}
      fallbackLocale={fallbackLocale}
    >
      <DataProvider initialData={workbook.data}>
        {pageView != null ? (
          <RNPageView view={pageView} />
        ) : (
          <Text>当前 workbook 不包含 page 视图（RN 渲染器已实现：form/page；sheet 规划中）</Text>
        )}
      </DataProvider>
    </WorkbookRuntimeProvider>
  );
}
