"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type {
  ComparisonChartWidgetConfig,
  ComparisonResponse,
  Frequency,
  IndicatorMetadata,
  LineChartWidgetConfig,
  MetricWidgetConfig,
  QuadrantId,
  SingleSeriesResponse,
  Source,
  WidgetConfig,
  WidgetDataResponse,
} from "@/domain/schemas";
import { ComparisonSeriesDetailChart, SingleSeriesDetailChart } from "./ChartWidget";
import {
  displayUnitLabel,
  formatFetchedAt,
  formatNumber,
  formatObservationDate,
  formatSignedNumber,
} from "./dashboardFormat";
import { latestObservedPoint } from "./dashboardData";
import { useIndicatorDetail, type IndicatorDetailState } from "./useIndicatorDetail";
import styles from "./IndicatorDetailPanel.module.css";

export type DetailPanelLoaded =
  | { kind: "widget"; data: WidgetDataResponse }
  | { kind: "series"; data: SingleSeriesResponse }
  | { kind: "comparison"; data: ComparisonResponse };

interface IndicatorDetailPanelProps {
  widget: WidgetConfig;
  loaded: DetailPanelLoaded;
  quadrantId: QuadrantId;
  onClose: () => void;
}

const QUADRANT_LABELS: Record<QuadrantId, string> = {
  growth: "Growth",
  inflation: "Inflation",
  policy: "Policy / Liquidity",
  market: "Market",
};

export function IndicatorDetailPanel({
  widget,
  loaded,
  onClose,
  quadrantId,
}: IndicatorDetailPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  const detail = useIndicatorDetail(widget);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        trapFocus(event, containerRef.current);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  const headingText = headingFor(widget, loaded);

  const body = (
    <div className={styles.root} role="presentation">
      <div
        aria-hidden="true"
        className={styles.backdrop}
        data-testid="indicator-detail-backdrop"
        onClick={onClose}
      />
      <aside
        aria-labelledby={headingId}
        aria-modal="true"
        className={styles.panel}
        data-quadrant={quadrantId}
        data-testid="indicator-detail-panel"
        ref={containerRef}
        role="dialog"
      >
        <header className={styles.header}>
          <span className={styles.quadrantChip} data-quadrant={quadrantId}>
            {QUADRANT_LABELS[quadrantId]}
          </span>
          <button
            aria-label="Close indicator details"
            className={styles.closeButton}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.5} />
          </button>
        </header>

        <div className={styles.body}>
          <h2 className={styles.heading} id={headingId}>
            {headingText}
          </h2>

          {loaded.kind === "comparison" ? (
            <ComparisonBody
              detail={detail}
              quadrantId={quadrantId}
              series={loaded.data.series}
              title={headingText}
              widget={widget as ComparisonChartWidgetConfig}
              widgetDescription={widget.description}
              cacheStatus={loaded.data.cacheStatus}
              fetchedAt={loaded.data.fetchedAt}
            />
          ) : loaded.kind === "widget" ? (
            <MetricBody
              detail={detail}
              loaded={loaded.data}
              quadrantId={quadrantId}
              widget={widget as MetricWidgetConfig}
              widgetDescription={widget.description}
            />
          ) : (
            <SeriesBody
              detail={detail}
              loaded={loaded.data}
              quadrantId={quadrantId}
              widget={widget as LineChartWidgetConfig}
              widgetDescription={widget.description}
            />
          )}
        </div>
      </aside>
    </div>
  );

  return createPortal(body, document.body);
}

function MetricBody({
  detail,
  loaded,
  quadrantId,
  widget,
  widgetDescription,
}: {
  detail: IndicatorDetailState;
  loaded: WidgetDataResponse;
  quadrantId: QuadrantId;
  widget: MetricWidgetConfig;
  widgetDescription: string;
}) {
  const indicator = loaded.indicator;
  const definition = definitionFor(indicator, widgetDescription);
  const unit = displayUnitLabel(loaded.unit);
  const changeUnit = displayUnitLabel(loaded.change.unit);

  return (
    <>
      <p className={styles.subheading}>
        {indicator.source.name} · {frequencyLabel(indicator.frequency)}
      </p>

      <div className={styles.headlineBlock}>
        <p className={styles.headlineValue}>
          <span className={styles.headlineNumber}>{formatNumber(loaded.currentValue)}</span>
          <span className={styles.headlineUnit}>{unit}</span>
        </p>
        <p className={styles.headlineMeta}>as of {formatObservationDate(loaded.observationDate)}</p>
        <p className={styles.changeLine}>
          <span className={styles.changeValue}>
            {formatSignedNumber(loaded.change.value)} {changeUnit}
          </span>
          <span className={styles.changeContext}>{loaded.change.period}</span>
        </p>
      </div>

      <DefinitionBlock definition={definition} />

      <ChartBlock detail={detail} quadrantId={quadrantId} title={widget.title} />

      <MetadataList
        items={[
          { term: "Source", value: sourceLabel(indicator.source) },
          { term: "Unit", value: unit },
          { term: "Frequency", value: frequencyLabel(indicator.frequency) },
          { term: "Observation date", value: formatObservationDate(loaded.observationDate) },
          { term: "Release date", value: releaseDateLabel(loaded.releaseDate) },
          {
            term: "Fetched",
            value: `${formatFetchedAt(loaded.fetchedAt)} · ${loaded.cacheStatus}`,
          },
        ]}
      />
    </>
  );
}

function SeriesBody({
  detail,
  loaded,
  quadrantId,
  widget,
  widgetDescription,
}: {
  detail: IndicatorDetailState;
  loaded: SingleSeriesResponse;
  quadrantId: QuadrantId;
  widget: LineChartWidgetConfig;
  widgetDescription: string;
}) {
  const indicator = loaded.indicator;
  const definition = definitionFor(indicator, widgetDescription);
  const unit = displayUnitLabel(loaded.unit);
  const latest = latestObservedPoint(loaded.points);

  return (
    <>
      <p className={styles.subheading}>
        {indicator.source.name} · {frequencyLabel(loaded.frequency)}
      </p>

      {latest ? (
        <div className={styles.headlineBlock}>
          <p className={styles.headlineValue}>
            <span className={styles.headlineNumber}>{formatNumber(latest.value)}</span>
            <span className={styles.headlineUnit}>{unit}</span>
          </p>
          <p className={styles.headlineMeta}>as of {formatObservationDate(latest.date)}</p>
        </div>
      ) : (
        <p className={styles.headlineMeta}>No observed values returned in this series.</p>
      )}

      <DefinitionBlock definition={definition} />

      <ChartBlock detail={detail} quadrantId={quadrantId} title={widget.title} />

      <MetadataList
        items={[
          { term: "Source", value: sourceLabel(indicator.source) },
          { term: "Unit", value: unit },
          { term: "Frequency", value: frequencyLabel(loaded.frequency) },
          { term: "Observation date", value: formatObservationDate(loaded.observationDate) },
          { term: "Release date", value: releaseDateLabel(loaded.releaseDate) },
          {
            term: "Fetched",
            value: `${formatFetchedAt(loaded.fetchedAt)} · ${loaded.cacheStatus}`,
          },
        ]}
      />
    </>
  );
}

function ComparisonBody({
  cacheStatus,
  detail,
  fetchedAt,
  quadrantId,
  series,
  title,
  widget,
  widgetDescription,
}: {
  cacheStatus: "fresh" | "stale";
  detail: IndicatorDetailState;
  fetchedAt: string;
  quadrantId: QuadrantId;
  series: readonly SingleSeriesResponse[];
  title: string;
  widget: ComparisonChartWidgetConfig;
  widgetDescription: string;
}) {
  return (
    <>
      <p className={styles.subheading}>{widgetDescription}</p>

      <ChartBlock detail={detail} quadrantId={quadrantId} title={widget.title} />

      <section aria-label={`${title} constituent indicators`} className={styles.constituents}>
        <h3 className={styles.sectionHeading}>Constituent indicators</h3>
        <ul className={styles.constituentList}>
          {series.map((entry) => (
            <ConstituentItem entry={entry} key={entry.indicator.id} />
          ))}
        </ul>
      </section>

      <p className={styles.sourceFooter}>
        Fetched {formatFetchedAt(fetchedAt)} · {cacheStatus}
      </p>
    </>
  );
}

function ConstituentItem({ entry }: { entry: SingleSeriesResponse }) {
  const latest = latestObservedPoint(entry.points);
  const unit = displayUnitLabel(entry.unit);
  const definition = definitionFor(entry.indicator, "");

  return (
    <li className={styles.constituentItem}>
      <h4 className={styles.constituentName}>{entry.indicator.name}</h4>
      <p className={styles.constituentMeta}>
        {entry.indicator.source.name} · {frequencyLabel(entry.frequency)} · {unit}
      </p>
      {latest ? (
        <p className={styles.constituentValue}>
          {formatNumber(latest.value)} {unit} as of {formatObservationDate(latest.date)}
        </p>
      ) : (
        <p className={styles.constituentValue}>No observed values returned.</p>
      )}
      <p className={styles.constituentDefinition}>{definition}</p>
      <dl className={styles.constituentMetadata}>
        <div className={styles.constituentMetadataRow}>
          <dt>Series id</dt>
          <dd>{sourceLabel(entry.indicator.source)}</dd>
        </div>
        <div className={styles.constituentMetadataRow}>
          <dt>Release date</dt>
          <dd>{releaseDateLabel(entry.releaseDate)}</dd>
        </div>
      </dl>
    </li>
  );
}

function DefinitionBlock({ definition }: { definition: string }) {
  return (
    <section className={styles.definition} aria-label="Definition">
      <h3 className={styles.sectionHeading}>Definition</h3>
      <p className={styles.definitionText}>{definition}</p>
    </section>
  );
}

function ChartBlock({
  detail,
  quadrantId,
  title,
}: {
  detail: IndicatorDetailState;
  quadrantId: QuadrantId;
  title: string;
}) {
  return (
    <section className={styles.chartBlock} aria-label={`${title} historical series`}>
      <h3 className={styles.sectionHeading}>Historical series</h3>
      {detail.status === "loading" ? (
        <ChartSkeleton />
      ) : detail.status === "error" ? (
        <p className={styles.chartError}>Series unavailable. {detail.message}</p>
      ) : detail.data.kind === "single" ? (
        <SingleSeriesDetailChart data={detail.data.data} quadrantId={quadrantId} />
      ) : (
        <ComparisonSeriesDetailChart
          data={detail.data.data}
          quadrantId={quadrantId}
          title={title}
        />
      )}
    </section>
  );
}

function ChartSkeleton() {
  return (
    <div aria-busy="true" className={styles.chartSkeleton} role="status">
      <span className={styles.skeletonBar} aria-hidden="true" />
      <span className={styles.skeletonBar} aria-hidden="true" />
      <span className={styles.skeletonBar} aria-hidden="true" />
      <span className={styles.visuallyHidden}>Loading historical series</span>
    </div>
  );
}

interface MetadataItem {
  term: string;
  value: string;
}

function MetadataList({ items }: { items: readonly MetadataItem[] }) {
  return (
    <dl className={styles.metadata}>
      {items.map((item) => (
        <div className={styles.metadataRow} key={item.term}>
          <dt>{item.term}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const trapFocus = (event: KeyboardEvent, container: HTMLDivElement | null) => {
  if (!container) return;
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("aria-hidden"));

  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

const definitionFor = (indicator: IndicatorMetadata, fallback: string): string => {
  const candidate = indicator.description?.trim();
  if (candidate) return candidate;
  const widgetCandidate = fallback.trim();
  if (widgetCandidate) return widgetCandidate;
  return "No definition available.";
};

const releaseDateLabel = (releaseDate: string | null | undefined): string => {
  if (!releaseDate) return "Release date unavailable";
  return releaseDate;
};

const sourceLabel = (source: Source): string =>
  source.seriesId ? `${source.name} · ${source.seriesId}` : source.name;

const frequencyLabel = (frequency: Frequency): string => {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "annual":
      return "Annual";
  }
};

const headingFor = (widget: WidgetConfig, loaded: DetailPanelLoaded): string => {
  if (loaded.kind === "widget") return loaded.data.indicator.name;
  if (loaded.kind === "series") return loaded.data.indicator.name;
  return widget.title;
};
