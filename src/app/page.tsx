import { QUADRANTS } from "@/components/chrome/QUADRANTS";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.placeholder}>
      {QUADRANTS.map((item) => (
        <section key={item.id} id={item.id} className={styles.section}>
          <h2 className={styles.sectionTitle}>{item.label}</h2>
          <p className={styles.empty}>No widgets yet.</p>
        </section>
      ))}
    </div>
  );
}
