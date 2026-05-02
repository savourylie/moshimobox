"use client";

import { useCallback, useState } from "react";
import type { QuadrantId, WidgetConfig } from "@/domain/schemas";
import { useLayout } from "@/components/layout/LayoutProvider";
import {
  metadataFromDashboardWidgetData,
  type DashboardFetchMetadata,
  type DashboardWidgetData,
} from "./dashboardData";
import {
  formatFetchedAt,
  formatNumber,
  formatObservationDate,
  formatSignedNumber,
} from "./dashboardFormat";
import { ComparisonChartWidget, LineChartWidget } from "./ChartWidget";
import { IndicatorDetailPanel, type DetailPanelLoaded } from "./IndicatorDetailPanel";
import { MetricWidget } from "./MetricWidget";
import { useDashboardData, type DashboardWidgetLoadState } from "./useDashboardData";
import styles from "./DashboardDataView.module.css";

interface SelectedDetail {
  widget: WidgetConfig;
  loaded: DetailPanelLoaded;
  quadrantId: QuadrantId;
  originId: string;
}

export function DashboardDataView() {
  const { layout } = useLayout();
  const { reloadWidget, sections } = useDashboardData(layout);
  const [selected, setSelected] = useState<SelectedDetail | null>(null);

  const handleClose = useCallback(() => {
    if (!selected) return;
    document.getElementById(selected.originId)?.focus();
    setSelected(null);
  }, [selected]);

  return (
    <div className={styles.dashboard} data-testid="dashboard-data-view">
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={styles.section}
          data-quadrant={section.id}
        >
          <header className={styles.sectionHeader}>
            <span className={styles.sectionAccent} aria-hidden="true" />
            <div>
              <h2 className={styles.sectionTitle}>{section.label}</h2>
              <p className={styles.sectionMeta}>
                {visibleWidgetCountLabel(section.widgets.length)}
              </p>
            </div>
          </header>

          {section.widgets.length > 0 ? (
            <div className={styles.widgetGrid}>
              {section.widgets.map(({ widget, state }) => (
                <WidgetEntryView
                  key={widget.id}
                  onRetry={() => reloadWidget(widget)}
                  onSelect={(loaded) =>
                    setSelected({
                      widget,
                      loaded,
                      quadrantId: section.id,
                      originId: widgetSelectId(widget.id),
                    })
                  }
                  quadrantId={section.id}
                  state={state}
                  widget={widget}
                />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>No widgets in this section yet.</p>
          )}
        </section>
      ))}

      {selected ? (
        <IndicatorDetailPanel
          loaded={selected.loaded}
          onClose={handleClose}
          quadrantId={selected.quadrantId}
          widget={selected.widget}
        />
      ) : null}
    </div>
  );
}

const widgetSelectId = (widgetId: string): string => `widget-select-${widgetId}`;

interface WidgetEntryViewProps {
  onRetry: () => void;
  onSelect: (loaded: DetailPanelLoaded) => void;
  quadrantId: QuadrantId;
  state: DashboardWidgetLoadState;
  widget: WidgetConfig;
}

function WidgetEntryView({ onRetry, onSelect, quadrantId, state, widget }: WidgetEntryViewProps) {
  if (state.status === "success" && widget.type === "metric_card" && state.data.kind === "widget") {
    const loaded = state.data.data;
    return (
      <MetricWidget
        data={loaded}
        description={widget.description}
        onSelect={() => onSelect({ kind: "widget", data: loaded })}
        quadrantId={quadrantId}
        selectId={widgetSelectId(widget.id)}
        title={widget.title}
      />
    );
  }

  if (state.status === "success" && widget.type === "line_chart" && state.data.kind === "series") {
    const loaded = state.data.data;
    return (
      <LineChartWidget
        data={loaded}
        description={widget.description}
        onSelect={() => onSelect({ kind: "series", data: loaded })}
        quadrantId={quadrantId}
        selectId={widgetSelectId(widget.id)}
        title={widget.title}
      />
    );
  }

  if (
    state.status === "success" &&
    widget.type === "comparison_chart" &&
    state.data.kind === "comparison"
  ) {
    const loaded = state.data.data;
    return (
      <ComparisonChartWidget
        data={loaded}
        description={widget.description}
        onSelect={() => onSelect({ kind: "comparison", data: loaded })}
        quadrantId={quadrantId}
        selectId={widgetSelectId(widget.id)}
        title={widget.title}
      />
    );
  }

  return (
    <article
      className={styles.widget}
      data-state={state.status}
      aria-busy={state.status === "loading"}
    >
      <header className={styles.widgetHeader}>
        <p className={styles.widgetKind}>{widgetKindLabel(widget)}</p>
        <h3 className={styles.widgetTitle}>{widget.title}</h3>
      </header>
      <p className={styles.widgetDescription}>{widget.description}</p>
      <WidgetLoadStateView state={state} widget={widget} onRetry={onRetry} />
    </article>
  );
}

interface WidgetLoadStateViewProps {
  onRetry: () => void;
  state: DashboardWidgetLoadState;
  widget: WidgetConfig;
}

function WidgetLoadStateView({ onRetry, state, widget }: WidgetLoadStateViewProps) {
  if (state.status === "loading") {
    return <WidgetLoadingState state={state} />;
  }

  if (state.status === "error") {
    return <WidgetErrorState onRetry={onRetry} state={state} />;
  }

  return <WidgetSuccessState data={state.data} widget={widget} />;
}

function WidgetLoadingState({
  state,
}: {
  state: Extract<DashboardWidgetLoadState, { status: "loading" }>;
}) {
  return (
    <div className={styles.loadingState}>
      <div className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressBar} />
      </div>
      <p className={styles.stateText}>{state.label}</p>
      <div className={styles.skeletonStack} aria-hidden="true">
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonLineShort} />
      </div>
      {state.lastSuccessful ? <LastSuccessfulMetadata metadata={state.lastSuccessful} /> : null}
    </div>
  );
}

function WidgetErrorState({
  onRetry,
  state,
}: {
  onRetry: () => void;
  state: Extract<DashboardWidgetLoadState, { status: "error" }>;
}) {
  return (
    <div className={styles.errorState} role="status">
      <p className={styles.errorTitle}>{state.label}</p>
      <p className={styles.errorMessage}>{state.message}</p>
      {state.code ? <p className={styles.errorMeta}>Code: {state.code}</p> : null}
      {state.requestId ? <p className={styles.errorMeta}>Request ID: {state.requestId}</p> : null}
      {state.lastSuccessful ? <LastSuccessfulMetadata metadata={state.lastSuccessful} /> : null}
      <button className={styles.retryButton} type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function WidgetSuccessState({ data, widget }: { data: DashboardWidgetData; widget: WidgetConfig }) {
  if (data.kind === "comparison" || data.kind === "series") {
    return (
      <div className={styles.successState}>
        <p className={styles.empty}>
          {widget.title} returned chart data, but the widget renderer did not match it.
        </p>
        <SuccessMetadata metadata={metadataFromDashboardWidgetData(data)} />
      </div>
    );
  }

  return (
    <div className={styles.successState}>
      <p className={styles.valueLine}>
        <span className={styles.value}>{formatNumber(data.data.currentValue)}</span>
        <span className={styles.unit}>{data.data.unit}</span>
      </p>
      <p className={styles.observation}>as of {formatObservationDate(data.data.observationDate)}</p>
      <p className={styles.change}>
        Change {formatSignedNumber(data.data.change.value)} {data.data.change.unit},{" "}
        {data.data.change.period}
      </p>
      <SuccessMetadata metadata={metadataFromDashboardWidgetData(data)} />
    </div>
  );
}

function SuccessMetadata({ metadata }: { metadata: DashboardFetchMetadata }) {
  return (
    <p className={styles.sourceMeta}>
      Source: {metadata.sourceLabel} - fetched {formatFetchedAt(metadata.fetchedAt)} -{" "}
      {metadata.cacheStatus}
    </p>
  );
}

function LastSuccessfulMetadata({ metadata }: { metadata: DashboardFetchMetadata }) {
  return (
    <p className={styles.lastSuccessful}>
      Last successful fetch: {metadata.sourceLabel} - {formatFetchedAt(metadata.fetchedAt)}
    </p>
  );
}

const visibleWidgetCountLabel = (count: number): string =>
  count === 1 ? "1 visible widget" : `${count} visible widgets`;

const widgetKindLabel = (widget: WidgetConfig): string => {
  switch (widget.type) {
    case "metric_card":
      return "Metric";
    case "line_chart":
      return "Series";
    case "comparison_chart":
      return "Comparison";
  }
};
