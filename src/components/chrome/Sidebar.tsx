import { QUADRANTS, type QuadrantId } from "./QUADRANTS";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  activeId?: QuadrantId;
}

export function Sidebar({ activeId }: SidebarProps) {
  return (
    <aside
      role="navigation"
      aria-label="Quadrants"
      className={styles.aside}
    >
      <h2 className={styles.sectionHeader}>Quadrants</h2>
      <ul className={styles.list}>
        {QUADRANTS.map((item) => {
          const isActive = item.id === activeId;
          const linkClass = isActive
            ? `${styles.link} ${styles.linkActive}`
            : styles.link;
          return (
            <li key={item.id}>
              <a
                href={item.anchor}
                className={linkClass}
                aria-current={isActive ? "location" : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- brand chrome, fixed-size static asset; next/image adds runtime overhead */}
                <img
                  src={item.asset}
                  alt=""
                  width={22}
                  height={22}
                  className={styles.glyph}
                />
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
