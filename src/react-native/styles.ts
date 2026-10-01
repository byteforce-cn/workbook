/**
 * RN 渲染器默认样式（浅色主题，与 Web workbook-theme 视觉基调对齐）。
 * 业务侧可完全自绘字段组件，此处仅提供开箱即用的基线样式。
 */

import { StyleSheet } from "react-native";

export const rnStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    padding: 16,
    paddingBottom: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  group: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  required: {
    color: "#dc2626",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  inputDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 13,
  },
  error: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 4,
  },
  unregistered: {
    color: "#9ca3af",
    fontSize: 13,
    fontStyle: "italic",
  },
  picker: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    fontSize: 15,
    color: "#111827",
    flex: 1,
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: "#9ca3af",
    flex: 1,
  },
  pickerChevron: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 8,
  },
  booleanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    maxHeight: "70%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  modalClose: {
    fontSize: 14,
    color: "#2563eb",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionText: {
    fontSize: 15,
    color: "#111827",
  },
  optionCheck: {
    fontSize: 15,
    color: "#2563eb",
  },
  confirmBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
  },
  tabs: {
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  tabText: {
    fontSize: 14,
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
  steps: {
    marginBottom: 16,
  },
  stepBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  stepChipActive: {
    backgroundColor: "#2563eb",
  },
  stepChipText: {
    fontSize: 13,
    color: "#6b7280",
  },
  stepChipTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  repeatItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },
  repeatActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  linkBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
  },
  linkTextDanger: {
    color: "#dc2626",
  },
});
