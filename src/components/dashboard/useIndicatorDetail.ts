"use client";

import { useEffect, useState } from "react";
import type {
  ComparisonResponse,
  LineChartWidgetConfig,
  SingleSeriesResponse,
  WidgetConfig,
} from "@/domain/schemas";
import { DashboardDataError, fetchDashboardWidgetData } from "./dashboardData";

export type IndicatorDetailSeries =
  | { kind: "single"; data: SingleSeriesResponse }
  | { kind: "comparison"; data: ComparisonResponse };

export type IndicatorDetailState =
  | { status: "loading" }
  | { status: "success"; data: IndicatorDetailSeries }
  | { status: "error"; message: string };

export function useIndicatorDetail(widget: WidgetConfig): IndicatorDetailState {
  const [state, setState] = useState<IndicatorDetailState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    void fetchHistoricalSeries(widget, controller.signal)
      .then((data) => {
        setState({ status: "success", data });
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return;
        setState({
          status: "error",
          message:
            cause instanceof DashboardDataError
              ? cause.message
              : "The historical series could not be loaded.",
        });
      });

    return () => {
      controller.abort();
    };
  }, [widget]);

  return state;
}

const fetchHistoricalSeries = async (
  widget: WidgetConfig,
  signal: AbortSignal,
): Promise<IndicatorDetailSeries> => {
  if (widget.type === "comparison_chart") {
    const result = await fetchDashboardWidgetData(widget, { signal });
    if (result.kind !== "comparison") {
      throw new Error("Expected comparison series response.");
    }
    return { kind: "comparison", data: result.data };
  }

  const seriesWidget: LineChartWidgetConfig =
    widget.type === "line_chart"
      ? widget
      : {
          type: "line_chart",
          id: `${widget.id}--detail`,
          title: widget.title,
          description: widget.description,
          indicatorId: widget.indicatorId,
          transform: "level",
        };

  const result = await fetchDashboardWidgetData(seriesWidget, { signal });
  if (result.kind !== "series") {
    throw new Error("Expected single series response.");
  }
  return { kind: "single", data: result.data };
};

const isAbortError = (cause: unknown): boolean =>
  (cause instanceof DOMException && cause.name === "AbortError") ||
  (cause instanceof Error && cause.name === "AbortError");
