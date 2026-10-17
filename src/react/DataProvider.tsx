/**
 * React DataProvider — wraps the core path utilities with React Context + immer.
 * Provides reactive data tree access to all workbook components.
 */

import { produce } from "immer";
import { createContext, type PropsWithChildren, useContext, useMemo, useState } from "react";
import { deleteValueAtPath, getValueAtPath, setValueAtPath } from "../core/data/pathUtils";
import type { WorkbookData, WorkbookRowContext } from "../core/types";

export interface DataContextValue {
  data: WorkbookData;
  replaceData(nextData: WorkbookData): void;
  setValue(path: string, value: unknown, rowContext?: WorkbookRowContext): void;
  removeValue(path: string, rowContext?: WorkbookRowContext): void;
}

const DataContext = createContext<DataContextValue | null>(null);

export interface DataProviderProps extends PropsWithChildren {
  /** Data tree for an uncontrolled provider (snapshot taken on mount). */
  initialData?: WorkbookData;
  /**
   * Controlled data tree.
   *
   * When set, the provider stores nothing internally: what you pass is what
   * renders, and every edit is reported through `onDataChange` so you can feed
   * the next tree back in. This is what makes "load the data asynchronously,
   * then fill the form" a first-class flow — swap the object and the form
   * follows. `initialData` is ignored while `data` is set.
   */
  data?: WorkbookData;
  /**
   * Called with the next data tree for every edit.
   *
   * Required in controlled mode (`data`): without it an edit has nowhere to go
   * and is dropped with a warning. In uncontrolled mode the provider keeps the
   * data itself and `DocumentRenderer` reports changes through its own
   * `onDataChange` prop instead.
   */
  onDataChange?: (data: WorkbookData) => void;
}

let warnedDroppedControlledEdit = false;

/** Warn once when a controlled provider has no way to report an edit. */
function warnDroppedControlledEdit(): void {
  if (warnedDroppedControlledEdit) {
    return;
  }
  warnedDroppedControlledEdit = true;
  console.warn(
    "[workbook] <DataProvider data={…}> is controlled but received no onDataChange handler, so this edit was dropped. " +
      "Pass onDataChange and feed the value back, or use initialData for an uncontrolled form.",
  );
}

export function DataProvider({ children, initialData = {}, data: controlledData, onDataChange }: DataProviderProps) {
  const [internalData, setInternalData] = useState<WorkbookData>(initialData);
  const isControlled = controlledData !== undefined;
  const data = isControlled ? controlledData : internalData;

  const value = useMemo<DataContextValue>(() => {
    const applyEdit = (mutate: (draft: WorkbookData) => void) => {
      if (isControlled) {
        if (onDataChange == null) {
          warnDroppedControlledEdit();
          return;
        }

        onDataChange(produce(data, mutate));
        return;
      }

      // Uncontrolled: compose on the latest internal value so two edits in the
      // same tick both land.
      setInternalData((currentData: WorkbookData) => produce(currentData, mutate));
    };

    return {
      data,
      replaceData(nextData) {
        if (isControlled) {
          if (onDataChange == null) {
            warnDroppedControlledEdit();
            return;
          }

          onDataChange(nextData);
          return;
        }

        setInternalData(nextData);
      },
      setValue(path, nextValue, rowContext) {
        applyEdit((draft: WorkbookData) => {
          setValueAtPath(draft, path, nextValue, rowContext);
        });
      },
      removeValue(path, rowContext) {
        applyEdit((draft: WorkbookData) => {
          deleteValueAtPath(draft, path, rowContext);
        });
      },
    };
  }, [data, isControlled, onDataChange]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useWorkbookData(): DataContextValue {
  const context = useContext(DataContext);
  if (context == null) {
    throw new Error("useWorkbookData must be used inside <DataProvider>.");
  }
  return context;
}

export function useDataValue(path: string, rowContext?: WorkbookRowContext): unknown {
  const { data } = useWorkbookData();
  return getValueAtPath(data, path, rowContext);
}

export function useDataDispatch() {
  const { setValue, removeValue, replaceData } = useWorkbookData();
  return { setValue, removeValue, replaceData };
}
