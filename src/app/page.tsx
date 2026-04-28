import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.shell}>
      <div className={styles.frame}>
        <h1 className={styles.wordmark}>Moshimo Box</h1>
        <p className={styles.subtitle}>Dashboard workspace</p>
        <p className={styles.empty}>No widgets yet.</p>
      </div>
    </main>
  );
}
