// Moshimo Box dashboard — components
// All components attach to window for cross-script access.

const { useState, useEffect, useRef } = React;

// ---------- Icons (Lucide-style inline SVG) ----------
const Icon = ({ name, size = 18, ...rest }) => {
  const paths = {
    menu: <path d="M3 12h18M3 6h18M3 18h18"/>,
    search: <g><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></g>,
    plus: <path d="M12 5v14M5 12h14"/>,
    "trending-up": <g><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></g>,
    "trending-down": <g><path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/></g>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>,
    info: <g><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></g>,
    chart: <g><path d="M3 3v18h18"/><path d="M7 14l3-3 3 2 5-6"/></g>,
    settings: <g><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2.8-1.6L13 2h-2l-.6 2.8a7 7 0 0 0-2.8 1.6l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .2 1.6l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.8 1.6L11 22h2l.6-2.8a7 7 0 0 0 2.8-1.6l2.4 1 2-3.4-2-1.6c.1-.5.2-1 .2-1.6z"/></g>,
    send: <g><path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></g>,
    sparkles: <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>,
    x: <path d="M18 6L6 18M6 6l12 12"/>,
    check: <path d="M5 12l5 5L20 7"/>,
    grid: <g><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></g>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>,
    layers: <g><path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></g>,
    chevron: <path d="m9 18 6-6-6-6"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name]}
    </svg>
  );
};

// ---------- Top bar ----------
const TopBar = ({ onToggleChat, chatOpen }) => (
  <div style={{
    height: 56, borderBottom: "1px solid var(--ink-150)",
    background: "var(--paper-50)",
    display: "flex", alignItems: "center", padding: "0 24px", gap: 24,
    position: "sticky", top: 0, zIndex: 10,
  }}>
    <img src="../../assets/logo-lockup.svg" height="28" alt="Moshimo Box"/>
    <div style={{
      marginLeft: 24, flex: 1, maxWidth: 480,
      display: "flex", alignItems: "center", gap: 8,
      background: "var(--paper-100)", border: "1px solid var(--ink-150)",
      borderRadius: 8, padding: "7px 12px",
      fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink-500)",
    }}>
      <Icon name="search" size={15}/>
      <span>Search indicators, sources, or layouts…</span>
      <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.7 }}>⌘K</span>
    </div>
    <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
      <button className="iconbtn" title="Settings"><Icon name="settings"/></button>
      <button
        onClick={onToggleChat}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
          padding: "8px 14px", borderRadius: 8,
          border: "1px solid " + (chatOpen ? "var(--accent-ink-700)" : "var(--ink-200)"),
          background: chatOpen ? "var(--accent-ink-700)" : "var(--paper-50)",
          color: chatOpen ? "var(--paper-50)" : "var(--ink-900)",
          cursor: "pointer",
        }}>
        <Icon name="sparkles" size={15}/>
        Copilot
      </button>
    </div>
  </div>
);

// ---------- Sidebar ----------
const Sidebar = ({ active, setActive }) => {
  const items = [
    { id: "growth", label: "Growth", asset: "quadrant-growth" },
    { id: "inflation", label: "Inflation", asset: "quadrant-inflation" },
    { id: "policy", label: "Policy", asset: "quadrant-policy" },
    { id: "market", label: "Market", asset: "quadrant-market" },
  ];
  return (
    <div style={{
      width: 240, borderRight: "1px solid var(--ink-150)",
      background: "var(--paper-100)", padding: "20px 12px",
      display: "flex", flexDirection: "column", gap: 4,
      flexShrink: 0,
    }}>
      <div style={{
        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--ink-500)", padding: "8px 12px",
      }}>Quadrants</div>
      {items.map(it => (
        <a key={it.id}
          href={`#${it.id}`}
          onClick={() => setActive(it.id)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "8px 10px", borderRadius: 8,
            background: active === it.id ? "var(--paper-50)" : "transparent",
            border: "1px solid " + (active === it.id ? "var(--ink-150)" : "transparent"),
            fontFamily: "var(--font-serif)", fontSize: 15,
            color: "var(--ink-900)", textDecoration: "none",
            cursor: "pointer",
          }}>
          <img src={`../../assets/${it.asset}.svg`} width="22" height="22" alt=""/>
          {it.label}
        </a>
      ))}
      <div style={{ height: 1, background: "var(--ink-100)", margin: "16px 8px" }}/>
      <div style={{
        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--ink-500)", padding: "8px 12px",
      }}>Saved layouts</div>
      {["Default · Mar 2026", "Recession watch", "Reflation tilt"].map((l, i) => (
        <a key={i} href="#" onClick={e => e.preventDefault()} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px", borderRadius: 8,
          fontFamily: "var(--font-sans)", fontSize: 13,
          color: "var(--ink-700)", textDecoration: "none",
        }}>
          <Icon name="bookmark" size={14}/>
          {l}
        </a>
      ))}
    </div>
  );
};

// ---------- Sparkline ----------
const Sparkline = ({ data, color = "#4A4339", height = 28, width = 100 }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// ---------- LineChart (bigger) ----------
const LineChart = ({ series, height = 140, color = "#2C3E64", showGrid = true }) => {
  const width = 360;
  const all = series.flat();
  const max = Math.max(...all), min = Math.min(...all);
  const range = max - min || 1;
  const padY = 12;
  const pad = 0;
  const pathFor = (data, c) => {
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * (width - pad * 2) + pad;
      const y = height - padY - ((v - min) / range) * (height - padY * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    return <path d={pts} fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>;
  };
  const colors = [color, "#B66A45"];
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {showGrid && [0, 0.5, 1].map(p => (
        <line key={p} x1="0" x2={width} y1={padY + p * (height - padY * 2)} y2={padY + p * (height - padY * 2)}
          stroke="var(--ink-100)" strokeWidth="1" strokeDasharray="2 4"/>
      ))}
      {series.map((s, i) => <g key={i}>{pathFor(s, colors[i] || color)}</g>)}
    </svg>
  );
};

// ---------- Widget ----------
const Widget = ({ accent, title, source, children, footer }) => (
  <div style={{
    background: "var(--paper-50)", border: "1px solid var(--ink-150)",
    borderRadius: 12, padding: 20, position: "relative", overflow: "hidden",
    boxShadow: "0 1px 2px rgba(40,30,20,0.04), 0 1px 1px rgba(40,30,20,0.03)",
    display: "flex", flexDirection: "column", gap: 12,
  }}>
    <div style={{
      position: "absolute", top: 0, left: 8, right: 8, height: 3,
      background: accent, borderRadius: "0 0 2px 2px",
    }}/>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--ink-700)" }}>{title}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-500)" }}>{source}</div>
    </div>
    {children}
    {footer}
  </div>
);

// ---------- MetricWidget ----------
const MetricWidget = ({ accent, title, source, value, unit, delta, deltaLabel, spark, sparkColor }) => {
  const positive = delta >= 0;
  // For unemployment-style metrics, the caller flips the color via sparkColor convention
  const deltaColor = sparkColor === "good-down"
    ? (positive ? "#B25A5A" : "#2F8267")
    : (positive ? "#2F8267" : "#B25A5A");
  return (
    <Widget accent={accent} title={title} source={source} footer={
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{
          fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
          color: deltaColor, fontFeatureSettings: '"tnum"',
        }}>
          {positive ? "+" : "−"}{Math.abs(delta)} {deltaLabel}
        </div>
        <Sparkline data={spark} color={deltaColor} width={72} height={24}/>
      </div>
    }>
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 44, fontWeight: 500, lineHeight: 1,
        letterSpacing: "-0.02em", color: "var(--ink-900)",
        fontFeatureSettings: '"tnum","lnum"',
      }}>
        {value}<span style={{ fontSize: 22, marginLeft: 2, color: "var(--ink-600)" }}>{unit}</span>
      </div>
    </Widget>
  );
};

// ---------- ChartWidget ----------
const ChartWidget = ({ accent, title, source, series, last, lastLabel }) => (
  <Widget accent={accent} title={title} source={source} footer={
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-500)",
    }}>
      <span>last 24m</span>
      <span><span style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ink-900)", fontFeatureSettings: '"tnum"' }}>{last}</span> {lastLabel}</span>
    </div>
  }>
    <LineChart series={series}/>
  </Widget>
);

// ---------- Quadrant ----------
const Quadrant = ({ id, label, accent, asset, blurb, children }) => (
  <section id={id} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <img src={`../../assets/${asset}.svg`} width="28" height="28" alt=""/>
      <div>
        <h2 style={{
          margin: 0, fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 500,
          letterSpacing: "-0.01em", color: "var(--ink-900)",
        }}>{label}</h2>
        <div style={{
          fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-600)",
          marginTop: 2,
        }}>{blurb}</div>
      </div>
      <button style={{
        marginLeft: "auto",
        fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
        background: "transparent", border: "1px solid var(--ink-150)",
        color: "var(--ink-700)", padding: "6px 10px", borderRadius: 8,
        display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
      }}>
        <Icon name="plus" size={13}/>
        Add widget
      </button>
    </header>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>{children}</div>
  </section>
);

Object.assign(window, {
  Icon, TopBar, Sidebar, Sparkline, LineChart, Widget,
  MetricWidget, ChartWidget, Quadrant,
});
