import { Extension, type Extensions } from "@tiptap/core";
import { baseKeymap } from "@tiptap/pm/commands";
import { history } from "@tiptap/pm/history";
import { keymap } from "@tiptap/pm/keymap";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ConditionContext } from "../../core/condition/evaluate";
import type { WorkbookData, WorkbookStyleCatalog } from "../../core/types";
import type { WorkbookPluginRegistry } from "../../react/registry";
import {
  type ConditionalVisibilityContext,
  createConditionalVisibilityExtension,
  createStyleBadgeExtension,
} from "../format/conditionalVisibility";
import { BindNodeView } from "../nodes/bind/BindNodeView";
import { createColgroupNodeView, createTableNodeView } from "../nodes/table/TableNodeViews";
import { editorExtensions, WbBind, WbTable, WbTableColgroup } from "./extensions";

export interface EditorExtensionContext {
  data: WorkbookData;
  simulate: boolean;
  registry: WorkbookPluginRegistry;
  styles: WorkbookStyleCatalog | undefined;
  conditionContext?: ConditionContext;
}

const CoreKeymap = Extension.create({
  name: "wbCoreKeymap",
  addProseMirrorPlugins() {
    return [history(), keymap(baseKeymap)];
  },
});

export function createEditorExtensions(getContext: () => EditorExtensionContext): Extensions {
  const Table = WbTable.extend({
    addNodeView() {
      return createTableNodeView();
    },
  });
  const TableColgroup = WbTableColgroup.extend({
    addNodeView() {
      return createColgroupNodeView();
    },
  });
  const Bind = WbBind.extend({
    addNodeView() {
      return ReactNodeViewRenderer(BindNodeView);
    },
  });

  const replacements: Record<string, (typeof editorExtensions)[number] | undefined> = {
    wbTable: Table,
    wbTableColgroup: TableColgroup,
    wbBind: Bind,
  };

  return [
    ...editorExtensions.map((extension) => replacements[extension.name] ?? extension),
    CoreKeymap,
    createConditionalVisibilityExtension(() => getContext() satisfies ConditionalVisibilityContext),
    createStyleBadgeExtension(() => getContext()),
  ];
}
