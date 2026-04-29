"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardLayout, QuadrantId, WidgetConfig } from "@/domain/schemas";
import {
  DashboardDataError,
  fetchDashboardWidgetData,
  metadataFromDashboardWidgetData,
  type DashboardFetchMetadata,
  type DashboardWidgetData,
  visibleWidgetFetchLabel,
} from "./dashboardData";

export type DashboardWidgetLoadState =
  | {
      status: "loading";
      label: string;
      lastSuccessful?: DashboardFetchMetadata;
    }
  | {
      status: "success";
      data: DashboardWidgetData;
    }
  | {
      status: "error";
      code?: string;
      label: string;
      lastSuccessful?: DashboardFetchMetadata;
      message: string;
      requestId?: string;
      statusCode?: number;
    };

export interface DashboardWidgetEntry {
  widget: WidgetConfig;
  state: DashboardWidgetLoadState;
}

export interface DashboardSectionEntry {
  id: QuadrantId;
  label: string;
  widgets: DashboardWidgetEntry[];
}

export const getVisibleWidgets = (layout: DashboardLayout): WidgetConfig[] =>
  dashboardSections(layout).flatMap((section) => section.widgets);

export const dashboardSections = (
  layout: DashboardLayout,
): Array<{ id: QuadrantId; label: string; widgets: WidgetConfig[] }> => [
  layout.quadrants.growth,
  layout.quadrants.inflation,
  layout.quadrants.policy,
  layout.quadrants.market,
];

export const createLoadingStates = (
  widgets: readonly WidgetConfig[],
): Record<string, DashboardWidgetLoadState> =>
  Object.fromEntries(
    widgets.map((widget) => [
      widget.id,
      {
        status: "loading",
        label: visibleWidgetFetchLabel(widget),
      } satisfies DashboardWidgetLoadState,
    ]),
  );

export function useDashboardData(layout: DashboardLayout) {
  const visibleWidgets = useMemo(() => getVisibleWidgets(layout), [layout]);
  const [states, setStates] = useState<Record<string, DashboardWidgetLoadState>>(() =>
    createLoadingStates(visibleWidgets),
  );

  const loadWidget = useCallback((widget: WidgetConfig, signal?: AbortSignal) => {
    setStates((current) => ({
      ...current,
      [widget.id]: {
        status: "loading",
        label: visibleWidgetFetchLabel(widget),
        lastSuccessful: lastSuccessfulMetadata(current[widget.id]),
      },
    }));

    void fetchDashboardWidgetData(widget, { signal })
      .then((data) => {
        setStates((current) => ({
          ...current,
          [widget.id]: {
            status: "success",
            data,
          },
        }));
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return;

        setStates((current) => ({
          ...current,
          [widget.id]: errorStateFor(widget, cause, current[widget.id]),
        }));
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setStates((current) => {
      const next = createLoadingStates(visibleWidgets);
      for (const widget of visibleWidgets) {
        const previous = lastSuccessfulMetadata(current[widget.id]);
        if (previous) {
          next[widget.id] = {
            status: "loading",
            label: visibleWidgetFetchLabel(widget),
            lastSuccessful: previous,
          };
        }
      }
      return next;
    });

    for (const widget of visibleWidgets) {
      loadWidget(widget, controller.signal);
    }

    return () => {
      controller.abort();
    };
  }, [loadWidget, visibleWidgets]);

  const sections = useMemo<DashboardSectionEntry[]>(
    () =>
      dashboardSections(layout).map((section) => ({
        id: section.id,
        label: section.label,
        widgets: section.widgets.map((widget) => ({
          widget,
          state:
            states[widget.id] ??
            ({
              status: "loading",
              label: visibleWidgetFetchLabel(widget),
            } satisfies DashboardWidgetLoadState),
        })),
      })),
    [layout, states],
  );

  return {
    reloadWidget: loadWidget,
    sections,
  };
}

const lastSuccessfulMetadata = (
  state: DashboardWidgetLoadState | undefined,
): DashboardFetchMetadata | undefined => {
  if (!state) return undefined;
  if (state.status === "success") return metadataFromDashboardWidgetData(state.data);
  return state.lastSuccessful;
};

const errorStateFor = (
  widget: WidgetConfig,
  cause: unknown,
  previousState: DashboardWidgetLoadState | undefined,
): DashboardWidgetLoadState => {
  const lastSuccessful = lastSuccessfulMetadata(previousState);

  if (cause instanceof DashboardDataError) {
    return {
      status: "error",
      code: cause.code,
      label: `Could not fetch ${widget.title}`,
      lastSuccessful,
      message: cause.message,
      requestId: cause.requestId,
      statusCode: cause.status,
    };
  }

  return {
    status: "error",
    label: `Could not fetch ${widget.title}`,
    lastSuccessful,
    message: "The dashboard data request could not be completed.",
  };
};

const isAbortError = (cause: unknown): boolean =>
  (cause instanceof DOMException && cause.name === "AbortError") ||
  (cause instanceof Error && cause.name === "AbortError");
