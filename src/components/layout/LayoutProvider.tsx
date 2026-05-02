"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { DashboardLayout } from "@/domain/schemas";

interface LayoutContextValue {
  layout: DashboardLayout;
  setLayout: (next: DashboardLayout) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

interface LayoutProviderProps {
  initialLayout: DashboardLayout;
  children: ReactNode;
}

export function LayoutProvider({ initialLayout, children }: LayoutProviderProps) {
  const [layout, setLayoutState] = useState<DashboardLayout>(initialLayout);
  const setLayout = useCallback((next: DashboardLayout) => {
    setLayoutState(next);
  }, []);
  return (
    <LayoutContext.Provider value={{ layout, setLayout }}>{children}</LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error("useLayout must be used within a LayoutProvider.");
  }
  return ctx;
}
