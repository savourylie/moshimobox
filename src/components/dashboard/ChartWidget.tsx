import type { CSSProperties, ReactNode } from "react";
import type {
  ComparisonResponse,
  Frequency,
  QuadrantId,
  SingleSeriesResponse,
  Source,
} from "@/domain/schemas";
import {
  analyzeChartSeries,
  buildChartLayout,
  hasMixedFrequencies,
  type ChartLayout,
  type ChartSeriesAnalysis,
  type ChartSeriesInput,
  type ObservedChartPoint,
} from "./chartScale";
import {
  displayUnitLabel,
  formatFetchedAt,
  formatNumber,
  formatObservationDate,
} from "./dashboardFormat";
import styles from "./ChartWidget.module.css";

interface LineChartWidgetProps {
  data: SingleSeriesResponse;
  description: string;
  quadrantId: QuadrantId;
  title: string;
}

interface ComparisonChartWidgetProps {
  data: ComparisonResponse;
  description: string;
  quadrantId: QuadrantId;
  title: string;
}

interface ChartSeriesModel extends ChartSeriesInput {
  frequency: Frequency;
  sourceLabel: string;
  unit: string;
}

type SeriesColorStyle = CSSProperties & {
  "--series-color": string;
};

interface SelectableChartProps {
  onSelect?: () => void;
  selectId?: string;
  selectLabel?: string;
}

export function LineChartWidget({
  data,
  description,
  onSelect,
  quadrantId,
  selectId,
  selectLabel,
  title,
}: LineChartWidgetProps & SelectableChartProps) {
  const series = seriesModelFromResponse(data);
  const analysis = analyzeChartSeries(series);
  const layout = buildRenderableLineLayout([series]);
  const latest = analysis.observedPoints.at(-1);
  const titleId = `${series.id}-line-chart-title`;
  const chartId = `${series.id}-line-chart`;

  return (
    <ChartCard
      cadenceLabel={frequencyLabel(data.frequency)}
      description={description}
      kind="Line chart"
      onSelect={onSelect}
      quadrantId={quadrantId}
      selectId={selectId}
      selectLabel={selectLabel ?? `Open details for ${title}`}
      title={title}
      titleId={titleId}
    >
      <LatestValueSummary latest={latest} unit={series.unit} />
      <ChartSurface
        chartId={chartId}
        description={lineChartDescription(title, series.unit, analysis)}
        emptyMessage={lineSuppressionReason(analysis, title, layout)}
        layout={layout}
        seriesColors={[seriesColorFor(quadrantId, 0)]}
        title={`${title} chart`}
      />
      <QualityNotes notes={qualityNotes([analysis])} />
      <ChartFooter
        cacheStatus={data.cacheStatus}
        fetchedAt={data.fetchedAt}
        rangeLabel={rangeLabel(data.range)}
        releaseDate={data.releaseDate}
        sourceIntro="Source"
        sources={[series.sourceLabel]}
      />
    </ChartCard>
  );
}

export function ComparisonChartWidget({
  data,
  description,
  onSelect,
  quadrantId,
  selectId,
  selectLabel,
  title,
}: ComparisonChartWidgetProps & SelectableChartProps) {
  const series = data.series.map(seriesModelFromResponse);
  const analyses = series.map(analyzeChartSeries);
  const mixedFrequency = hasMixedFrequencies(series.map((item) => item.frequency));
  const layout = mixedFrequency ? null : buildRenderableComparisonLayout(series);
  const seriesColors = series.map((_, index) => seriesColorFor(quadrantId, index));
  const chartId = `${series.map((item) => item.id).join("-")}-comparison-chart`;
  const titleId = `${chartId}-title`;

  return (
    <ChartCard
      cadenceLabel={comparisonCadenceLabel(series)}
      description={description}
      kind="Comparison chart"
      onSelect={onSelect}
      quadrantId={quadrantId}
      selectId={selectId}
      selectLabel={selectLabel ?? `Open details for ${title}`}
      title={title}
      titleId={titleId}
    >
      <ComparisonLegend analyses={analyses} series={series} seriesColors={seriesColors} />
      <ChartSurface
        chartId={chartId}
        description={comparisonChartDescription(title, analyses, series)}
        emptyMessage={comparisonSuppressionReason(analyses, series, layout, mixedFrequency)}
        layout={layout}
        seriesColors={seriesColors}
        title={`${title} comparison chart`}
      />
      <QualityNotes notes={mixedFrequency ? [] : qualityNotes(analyses)} />
      <ChartFooter
        cacheStatus={data.cacheStatus}
        fetchedAt={data.fetchedAt}
        rangeLabel={rangeLabel(data.range)}
        sourceIntro="Sources"
        sources={uniqueLabels(series.map((item) => item.sourceLabel))}
      />
    </ChartCard>
  );
}

export function SingleSeriesDetailChart({
  data,
  quadrantId,
}: {
  data: SingleSeriesResponse;
  quadrantId: QuadrantId;
}) {
  const series = seriesModelFromResponse(data);
  const analysis = analyzeChartSeries(series);
  const layout = buildRenderableLineLayout([series]);
  const chartId = `${series.id}-detail-chart`;

  return (
    <>
      <ChartSurface
        chartId={chartId}
        description={lineChartDescription(series.label, series.unit, analysis)}
        emptyMessage={lineSuppressionReason(analysis, series.label, layout)}
        layout={layout}
        seriesColors={[seriesColorFor(quadrantId, 0)]}
        title={`${series.label} historical chart`}
      />
      <QualityNotes notes={qualityNotes([analysis])} />
    </>
  );
}

export function ComparisonSeriesDetailChart({
  data,
  quadrantId,
  title,
}: {
  data: ComparisonResponse;
  quadrantId: QuadrantId;
  title: string;
}) {
  const series = data.series.map(seriesModelFromResponse);
  const analyses = series.map(analyzeChartSeries);
  const mixedFrequency = hasMixedFrequencies(series.map((item) => item.frequency));
  const layout = mixedFrequency ? null : buildRenderableComparisonLayout(series);
  const seriesColors = series.map((_, index) => seriesColorFor(quadrantId, index));
  const chartId = `${series.map((item) => item.id).join("-")}-detail-comparison-chart`;

  return (
    <>
      <ChartSurface
        chartId={chartId}
        description={comparisonChartDescription(title, analyses, series)}
        emptyMessage={comparisonSuppressionReason(analyses, series, layout, mixedFrequency)}
        layout={layout}
        seriesColors={seriesColors}
        title={`${title} historical comparison chart`}
      />
      <QualityNotes notes={mixedFrequency ? [] : qualityNotes(analyses)} />
    </>
  );
}

function ChartCard({
  cadenceLabel,
  children,
  description,
  kind,
  onSelect,
  quadrantId,
  selectId,
  selectLabel,
  title,
  titleId,
}: {
  cadenceLabel: string;
  children: ReactNode;
  description: string;
  kind: string;
  onSelect?: () => void;
  quadrantId: QuadrantId;
  selectId?: string;
  selectLabel?: string;
  title: string;
  titleId: string;
}) {
  return (
    <article aria-labelledby={titleId} className={styles.card} data-quadrant={quadrantId}>
      <span className={styles.accent} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.kind}>{kind}</p>
          <h3 className={styles.title} id={titleId}>
            {title}
          </h3>
        </div>
        <span className={styles.cadenceBadge}>{cadenceLabel}</span>
      </header>

      <p className={styles.description}>{description}</p>
      {children}

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

function LatestValueSummary({
  latest,
  unit,
}: {
  latest: ObservedChartPoint | undefined;
  unit: string;
}) {
  if (!latest) return null;

  return (
    <dl className={styles.latestGrid}>
      <div className={styles.latestItem}>
        <dt>Latest</dt>
        <dd className={styles.latestValue}>
          <span className={styles.value}>{formatNumber(latest.value)}</span>
          <span className={styles.unit}>{unit}</span>
        </dd>
      </div>
      <div className={styles.latestItem}>
        <dt>Observation</dt>
        <dd>as of {formatObservationDate(latest.date)}</dd>
      </div>
    </dl>
  );
}

function ComparisonLegend({
  analyses,
  series,
  seriesColors,
}: {
  analyses: ChartSeriesAnalysis[];
  series: ChartSeriesModel[];
  seriesColors: string[];
}) {
  return (
    <ul className={styles.legendList}>
      {series.map((item, index) => {
        const latest = analyses[index].observedPoints.at(-1);
        return (
          <li
            className={styles.legendItem}
            key={item.id}
            style={seriesColorStyle(seriesColors[index])}
          >
            <span className={styles.legendSwatch} aria-hidden="true" />
            <span className={styles.legendName}>{item.label}</span>
            <span className={styles.legendValue}>
              {latest
                ? `${formatNumber(latest.value)} ${item.unit} as of ${formatObservationDate(
                    latest.date,
                  )}`
                : "No observed values returned."}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ChartSurface({
  chartId,
  description,
  emptyMessage,
  layout,
  seriesColors,
  title,
}: {
  chartId: string;
  description: string;
  emptyMessage: string;
  layout: ChartLayout | null;
  seriesColors: string[];
  title: string;
}) {
  if (!layout) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>{emptyMessage}</p>
      </div>
    );
  }

  const titleId = `${chartId}-svg-title`;
  const descriptionId = `${chartId}-svg-description`;
  const plotEndX = layout.plot.x + layout.plot.width;

  return (
    <div className={styles.chartSurface}>
      <svg
        aria-labelledby={`${titleId} ${descriptionId}`}
        className={styles.chartSvg}
        role="img"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
      >
        <title id={titleId}>{title}</title>
        <desc id={descriptionId}>{description}</desc>

        {layout.yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              className={styles.gridLine}
              x1={layout.plot.x}
              x2={plotEndX}
              y1={tick.y}
              y2={tick.y}
            />
            <text
              className={styles.axisText}
              dominantBaseline="middle"
              textAnchor="end"
              x={layout.plot.x - 10}
              y={tick.y}
            >
              {tick.label}
            </text>
          </g>
        ))}

        {layout.xTicks.map((tick, index) => (
          <text
            className={styles.axisText}
            key={tick.date}
            textAnchor={xTickAnchor(index, layout.xTicks.length)}
            x={tick.x}
            y={layout.height - 8}
          >
            {tick.label}
          </text>
        ))}

        {layout.series.map((item, index) => (
          <g key={item.id} style={seriesColorStyle(seriesColors[index])}>
            {item.pathSegments.map((path, pathIndex) => (
              <path
                className={styles.chartPath}
                d={path}
                data-testid="chart-path"
                key={`${item.id}-${pathIndex}`}
              />
            ))}
            {item.latestPoint ? (
              <circle
                className={styles.latestPoint}
                cx={item.latestPoint.x}
                cy={item.latestPoint.y}
                data-testid="chart-latest-point"
                r="4"
              />
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function QualityNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;

  return (
    <ul className={styles.notes}>
      {notes.map((note) => (
        <li className={styles.note} key={note}>
          {note}
        </li>
      ))}
    </ul>
  );
}

function ChartFooter({
  cacheStatus,
  fetchedAt,
  rangeLabel,
  releaseDate,
  sourceIntro,
  sources,
}: {
  cacheStatus: "fresh" | "stale";
  fetchedAt: string;
  rangeLabel: string;
  releaseDate?: string;
  sourceIntro: "Source" | "Sources";
  sources: string[];
}) {
  return (
    <footer className={styles.footer}>
      <span>{rangeLabel}</span>
      {releaseDate ? <span>Released {releaseDate}</span> : null}
      <span>
        {sourceIntro}: {sources.join("; ")}
      </span>
      <span>
        Fetched {formatFetchedAt(fetchedAt)} - {cacheStatus}
      </span>
    </footer>
  );
}

const seriesModelFromResponse = (response: SingleSeriesResponse): ChartSeriesModel => ({
  id: response.indicator.id,
  label: response.indicator.name,
  points: response.points,
  unit: displayUnitLabel(response.unit),
  frequency: response.frequency,
  sourceLabel: formatSource(response.source),
});

const buildRenderableLineLayout = (series: readonly ChartSeriesModel[]): ChartLayout | null => {
  const layout = buildChartLayout(series);
  if (!layout) return null;
  return layout.series.some((item) => item.pathSegments.length > 0) ? layout : null;
};

const buildRenderableComparisonLayout = (
  series: readonly ChartSeriesModel[],
): ChartLayout | null => {
  const layout = buildChartLayout(series);
  if (!layout) return null;
  const renderableSeriesCount = layout.series.filter((item) => item.pathSegments.length > 0).length;
  return renderableSeriesCount >= 2 ? layout : null;
};

const lineSuppressionReason = (
  analysis: ChartSeriesAnalysis,
  title: string,
  layout: ChartLayout | null,
): string => {
  if (analysis.observedPoints.length === 0) {
    return `No observed values returned for ${title}.`;
  }
  if (analysis.observedPoints.length === 1) {
    return "Chart is withheld because only one observed value was returned.";
  }
  if (!layout) {
    return "Chart is withheld because observed values do not form a continuous line segment.";
  }
  return "";
};

const comparisonSuppressionReason = (
  analyses: readonly ChartSeriesAnalysis[],
  series: readonly ChartSeriesModel[],
  layout: ChartLayout | null,
  mixedFrequency: boolean,
): string => {
  if (mixedFrequency) {
    return `Series use mixed frequencies (${uniqueLabels(
      series.map((item) => frequencyLabel(item.frequency)),
    ).join(", ")}); chart is withheld to avoid implying a shared observation cadence.`;
  }

  if (analyses.filter((analysis) => analysis.observedPoints.length >= 2).length < 2) {
    return "Comparison chart is withheld because fewer than two series returned at least two observed values.";
  }

  if (!layout) {
    return "Comparison chart is withheld because fewer than two series form continuous line segments.";
  }

  return "";
};

const qualityNotes = (analyses: readonly ChartSeriesAnalysis[]): string[] =>
  analyses.flatMap((analysis) => {
    if (analysis.missingCount === 0) return [];
    const observation = analysis.missingCount === 1 ? "observation" : "observations";
    return [
      `${analysis.label}: ${analysis.missingCount} missing ${observation} omitted without interpolation.`,
    ];
  });

const lineChartDescription = (
  title: string,
  unit: string,
  analysis: ChartSeriesAnalysis,
): string => {
  const latest = analysis.observedPoints.at(-1);
  if (!latest) return `${title} has no observed values in the returned range.`;
  return `${title} latest value is ${formatNumber(latest.value)} ${unit} as of ${formatObservationDate(
    latest.date,
  )}.`;
};

const comparisonChartDescription = (
  title: string,
  analyses: readonly ChartSeriesAnalysis[],
  series: readonly ChartSeriesModel[],
): string => {
  const latestLabels = series.flatMap((item, index) => {
    const latest = analyses[index].observedPoints.at(-1);
    if (!latest) return [];
    return `${item.label}: ${formatNumber(latest.value)} ${item.unit} as of ${formatObservationDate(
      latest.date,
    )}`;
  });

  return `${title} comparison. ${latestLabels.join("; ")}.`;
};

const rangeLabel = (range: { start: string; end?: string }): string =>
  range.end
    ? `Range ${formatObservationDate(range.start)} to ${formatObservationDate(range.end)}`
    : `Range from ${formatObservationDate(range.start)}`;

const formatSource = (source: Source): string =>
  source.seriesId ? `${source.name} - ${source.seriesId}` : source.name;

const uniqueLabels = (values: readonly string[]): string[] => Array.from(new Set(values));

const frequencyLabel = (frequency: Frequency): string => {
  switch (frequency) {
    case "daily":
      return "daily";
    case "weekly":
      return "weekly";
    case "monthly":
      return "monthly";
    case "quarterly":
      return "quarterly";
    case "annual":
      return "annual";
  }
};

const comparisonCadenceLabel = (series: readonly ChartSeriesModel[]): string => {
  const labels = uniqueLabels(series.map((item) => frequencyLabel(item.frequency)));
  return labels.length === 1 ? labels[0] : "mixed frequency";
};

const seriesColorFor = (quadrantId: QuadrantId, index: number): string => {
  const quadrantColor = `var(--${quadrantId}-600)`;
  if (index === 0) return quadrantColor;

  const palette = [
    "var(--accent-ink-600)",
    "var(--inflation-600)",
    "var(--policy-600)",
    "var(--market-600)",
    "var(--growth-600)",
  ].filter((color) => color !== quadrantColor);

  return palette[(index - 1) % palette.length];
};

const seriesColorStyle = (color: string): SeriesColorStyle => ({
  "--series-color": color,
});

const xTickAnchor = (index: number, count: number): "start" | "middle" | "end" => {
  if (index === 0) return "start";
  if (index === count - 1) return "end";
  return "middle";
};
