import type { QuadrantId, WidgetDataResponse } from "@/domain/schemas";
import {
  displayUnitLabel,
  formatFetchedAt,
  formatNumber,
  formatObservationDate,
  formatSignedNumber,
} from "./dashboardFormat";
import styles from "./MetricWidget.module.css";

export type MetricWidgetData = Omit<WidgetDataResponse, "releaseDate"> & {
  releaseDate?: WidgetDataResponse["releaseDate"] | null;
};

interface MetricWidgetProps {
  data: MetricWidgetData;
  description: string;
  onSelect?: () => void;
  quadrantId: QuadrantId;
  selectId?: string;
  selectLabel?: string;
  title: string;
}

export function MetricWidget({
  data,
  description,
  onSelect,
  quadrantId,
  selectId,
  selectLabel,
  title,
}: MetricWidgetProps) {
  const displayUnit = displayUnitLabel(data.unit);
  const changeUnit = displayUnitLabel(data.change.unit);
  const sourceLabel = formatSource(data.source.name, data.source.seriesId);
  const titleId = `${data.widgetId}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className={styles.card}
      data-quadrant={quadrantId}
      data-tone={data.status.tone}
    >
      <span className={styles.accent} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.kind}>Metric</p>
          <h3 className={styles.title} id={titleId}>
            {title}
          </h3>
        </div>
        <span className={styles.statusBadge}>{data.status.label}</span>
      </header>

      <p className={styles.description}>{description}</p>

      <div className={styles.metricBlock} aria-label={`${title} current value`}>
        <p className={styles.valueLine}>
          <span className={styles.value}>{formatNumber(data.currentValue)}</span>
          <span className={styles.unit}>{displayUnit}</span>
        </p>
      </div>

      <dl className={styles.details}>
        <div className={styles.detailRow}>
          <dt>Change</dt>
          <dd>
            <span className={styles.delta}>
              {formatSignedNumber(data.change.value)} {changeUnit}
            </span>
            <span className={styles.comparisonLabel}>{data.change.period}</span>
          </dd>
        </div>

        <div className={styles.detailRow}>
          <dt>Previous</dt>
          <dd>
            {formatNumber(data.previousValue)} {displayUnit}
          </dd>
        </div>

        <div className={styles.detailRow}>
          <dt>Observation</dt>
          <dd>as of {formatObservationDate(data.observationDate)}</dd>
        </div>

        {data.releaseDate ? (
          <div className={styles.detailRow}>
            <dt>Release</dt>
            <dd>Released {data.releaseDate}</dd>
          </div>
        ) : null}
      </dl>

      <footer className={styles.footer}>
        <span>{sourceLabel}</span>
        <span>
          Fetched {formatFetchedAt(data.fetchedAt)} · {data.cacheStatus}
        </span>
      </footer>

      {onSelect ? (
        <button
          aria-label={selectLabel ?? `Open details for ${title}`}
          className={styles.cardLink}
          id={selectId}
          onClick={onSelect}
          type="button"
        />
      ) : null}
    </article>
  );
}

const formatSource = (name: string, seriesId?: string): string =>
  seriesId ? `Source: ${name} · ${seriesId}` : `Source: ${name}`;
