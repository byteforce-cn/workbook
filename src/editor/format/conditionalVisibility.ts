/**
 * Read-only conditional presentation.
 *
 * Evaluation never writes back to `visible`: preview data changing must not
 * mutate the template. Hidden blocks stay in the document and are only styled
 * as dashed placeholders.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { type ConditionContext, evaluateBooleanLike } from "../../core/condition/evaluate";
import type { WorkbookData, WorkbookStyleCatalog } from "../../core/types";
import type { WorkbookPluginRegistry } from "../../react/registry";
import { styleHasConditionalRules } from "./textFormat";

export interface ConditionalVisibilityContext {
  data: WorkbookData;
  simulate: boolean;
  registry: WorkbookPluginRegistry;
  styles: WorkbookStyleCatalog | undefined;
  conditionContext?: ConditionContext;
}

const conditionalPluginKey = new PluginKey("wbConditionalVisibility");

export function createConditionalVisibilityExtension(getContext: () => ConditionalVisibilityContext): Extension {
  return Extension.create({
    name: "wbConditionalVisibility",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: conditionalPluginKey,
          props: {
            decorations(state) {
              const context = getContext();
              const decorations: Decoration[] = [];

              state.doc.descendants((node, pos) => {
                if (!("visible" in node.attrs) || node.attrs.visible == null) {
                  return;
                }

                const visible = evaluateBooleanLike(node.attrs.visible, context.data, context.registry, true);
                const attributes: Record<string, string> = {
                  "data-bf-conditional": "true",
                  class: "bf-editor-block--conditional",
                };

                if (!visible && context.simulate) {
                  attributes.class = "bf-editor-block--conditional bf-editor-block--condition-hidden";
                  attributes["data-bf-condition-hidden"] = "true";
                }

                decorations.push(Decoration.node(pos, pos + node.nodeSize, attributes, attributes));
              });

              return DecorationSet.create(state.doc, decorations);
            },
          },
        }),
      ];
    },
  });
}

export function createStyleBadgeExtension(getContext: () => Pick<ConditionalVisibilityContext, "styles">): Extension {
  return Extension.create({
    name: "wbStyleConditionalBadges",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("wbStyleConditionalBadges"),
          props: {
            decorations(state) {
              const { styles } = getContext();
              const decorations: Decoration[] = [];

              state.doc.descendants((node, pos) => {
                const group =
                  node.type.name === "wbParagraph"
                    ? "paragraphStyles"
                    : node.type.name === "wbTable"
                      ? "tableStyles"
                      : undefined;
                if (group == null) {
                  return;
                }

                if (styleHasConditionalRules(styles, group, node.attrs.style)) {
                  const attributes = {
                    class: "bf-editor-block--conditional-style",
                    "data-bf-conditional-style": "true",
                  };
                  decorations.push(Decoration.node(pos, pos + node.nodeSize, attributes, attributes));
                }
              });

              return DecorationSet.create(state.doc, decorations);
            },
          },
        }),
      ];
    },
  });
}
