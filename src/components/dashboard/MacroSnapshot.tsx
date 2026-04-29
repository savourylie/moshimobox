import { formatMonthYear } from "./dashboardFormat";
import styles from "./MacroSnapshot.module.css";

export interface MacroSnapshotProps {
  asOf: Date;
  headline?: string;
  body?: string;
}

export const DEFAULT_MACRO_SNAPSHOT_HEADLINE =
  "US macro overview across growth, inflation, policy, and market.";

export const DEFAULT_MACRO_SNAPSHOT_BODY =
  "This dashboard reads four quadrants of macroeconomic data from FRED and the World Bank. Each widget shows the latest observed value with its unit, observation date, and source. Use it as a reading frame; it is not investment advice.";

export function MacroSnapshot({ asOf, headline, body }: MacroSnapshotProps) {
  return (
    <section
      aria-labelledby="macro-snapshot-title"
      className={styles.snapshot}
      data-testid="macro-snapshot"
    >
      <p className={styles.eyebrow}>Macro snapshot · as of {formatMonthYear(asOf)}</p>
      <h1 id="macro-snapshot-title" className={styles.headline}>
        {headline ?? DEFAULT_MACRO_SNAPSHOT_HEADLINE}
      </h1>
      <p className={styles.body}>{body ?? DEFAULT_MACRO_SNAPSHOT_BODY}</p>
    </section>
  );
}
