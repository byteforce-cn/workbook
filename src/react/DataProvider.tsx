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
  initialData?: WorkbookData;
}

export function DataProvider({ children, initialData = {} }: DataProviderProps) {
  const [data, setData] = useState<WorkbookData>(initialData);

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      replaceData(nextData) {
        setData(nextData);
      },
      setValue(path, nextValue, rowContext) {
        setData((currentData: WorkbookData) =>
          produce(currentData, (draft: WorkbookData) => {
            setValueAtPath(draft, path, nextValue, rowContext);
          }),
        );
      },
      removeValue(path, rowContext) {
        setData((currentData: WorkbookData) =>
          produce(currentData, (draft: WorkbookData) => {
            deleteValueAtPath(draft, path, rowContext);
          }),
        );
      },
    }),
    [data],
  );

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
