// Moshimo Box — Dashboard app

const { useState: useStateApp } = React;

// Data
const cpiSpark = [3.0, 3.0, 3.1, 3.2, 3.1, 3.1, 3.2];
const unempSpark = [3.5, 3.6, 3.7, 3.7, 3.8, 3.8, 3.8];
const fedSpark = [5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5];
const yieldSpark = [4.2, 4.3, 4.5, 4.4, 4.3, 4.4, 4.43];

const gdpSeries = [[2.4, 2.5, 2.3, 2.6, 2.8, 2.7, 2.5, 2.6, 2.4, 2.5, 2.3, 2.4, 2.5, 2.7, 2.6, 2.4, 2.3, 2.5, 2.6, 2.7, 2.5, 2.6, 2.4, 2.5]];
const ismSeries = [[48, 47, 46, 47, 49, 50, 51, 50, 49, 48, 47, 48, 49, 50, 51, 52, 51, 50, 49, 50, 51, 50, 49, 50]];
const cpiCompare = [
  [3.7, 3.5, 3.3, 3.2, 3.1, 3.0, 3.1, 3.2, 3.1, 3.0, 3.1, 3.2, 3.1, 3.0, 3.1, 3.2, 3.0, 3.0, 3.1, 3.2, 3.1, 3.1, 3.2, 3.2],
  [2.9, 2.8, 2.6, 2.5, 2.4, 2.3, 2.4, 2.4, 2.3, 2.4, 2.5, 2.4, 2.3, 2.4, 2.5, 2.4, 2.4, 2.3, 2.4, 2.5, 2.4, 2.4, 2.4, 2.4],
];
const m2Series = [[20.8, 20.7, 20.6, 20.7, 20.9, 21.0, 21.1, 21.2, 21.3, 21.4, 21.4, 21.5, 21.5, 21.6, 21.7, 21.8, 21.7, 21.8, 21.9, 22.0, 22.0, 22.1, 22.1, 22.2]];
const spxSeries = [[4800, 4850, 4900, 4950, 5000, 5050, 5100, 5050, 5080, 5100, 5150, 5200, 5180, 5220, 5250, 5300, 5280, 5310, 5340, 5360, 5380, 5400, 5420, 5430]];
const yieldCurveSeries = [[-0.5, -0.6, -0.7, -0.6, -0.5, -0.4, -0.3, -0.4, -0.3, -0.2, -0.3, -0.4, -0.5, -0.4, -0.3, -0.2, -0.1, -0.2, -0.3, -0.2, -0.1, 0.0, -0.1, -0.05]];

const App = () => {
  const [active, setActive] = useStateApp("growth");
  const [chatOpen, setChatOpen] = useStateApp(true);
  const [extraWidget, setExtraWidget] = useStateApp(null);
  const [layoutBanner, setLayoutBanner] = useStateApp(null);

  const handleApply = (proposal) => {
    if (proposal.target === "Inflation") {
      setExtraWidget("compare");
      setTimeout(() => document.getElementById("inflation")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } else if (proposal.target === "Layout") {
      setLayoutBanner("Switched to Recession watch layout. Growth and Policy promoted.");
      setTimeout(() => setLayoutBanner(null), 4000);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper-100)" }} data-screen-label="Dashboard">
      <TopBar onToggleChat={() => setChatOpen(o => !o)} chatOpen={chatOpen}/>
      <div style={{ display: "flex" }}>
        <Sidebar active={active} setActive={setActive}/>
        <main style={{
          flex: 1, padding: "24px 32px 64px", maxWidth: 1440, margin: "0 auto",
          display: "flex", flexDirection: "column", gap: 32,
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-500)",
            }}>Macro snapshot · as of Mar 2026</div>
            <h1 style={{
              margin: "8px 0 0", fontFamily: "var(--font-serif)", fontSize: 36,
              fontWeight: 500, letterSpacing: "-0.015em", color: "var(--ink-900)",
            }}>Late-cycle slowdown, sticky core inflation.</h1>
            <p style={{
              margin: "10px 0 0", maxWidth: "62ch",
              fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: 1.6, color: "var(--ink-700)",
            }}>
              Growth is decelerating but employment hasn't broken. Headline inflation is drifting higher on services. The Fed is on hold; the curve is normalizing slowly. Equities continue to grind up.
            </p>
            {layoutBanner && (
              <div style={{
                marginTop: 16, padding: "10px 14px",
                background: "var(--accent-ink-50)", border: "1px solid var(--accent-ink-100)",
                borderRadius: 8, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--accent-ink-800)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Icon name="check" size={14}/>
                {layoutBanner}
              </div>
            )}
          </div>

          <Quadrant id="growth" label="Growth" accent="var(--growth-600)" asset="quadrant-growth"
            blurb="Output, employment, activity">
            <MetricWidget accent="var(--growth-600)" title="US real GDP YoY" source="FRED · GDPC1"
              value="2.5" unit="%" delta={-0.1} deltaLabel="vs Q4" spark={cpiSpark}/>
            <MetricWidget accent="var(--growth-600)" title="US unemployment" source="FRED · UNRATE"
              value="3.8" unit="%" delta={0.1} deltaLabel="vs Feb" spark={unempSpark} sparkColor="good-down"/>
            <ChartWidget accent="var(--growth-600)" title="ISM manufacturing PMI" source="ISM"
              series={ismSeries} last="50.2" lastLabel="(neutral)"/>
            <ChartWidget accent="var(--growth-600)" title="US real GDP, % YoY" source="FRED · GDPC1"
              series={gdpSeries} last="2.5%" lastLabel="(Q1 26)"/>
          </Quadrant>

          <Quadrant id="inflation" label="Inflation" accent="var(--inflation-600)" asset="quadrant-inflation"
            blurb="Prices, wages, expectations">
            {extraWidget === "compare" && (
              <div style={{ gridColumn: "span 2" }}>
                <ChartWidget accent="var(--inflation-600)"
                  title="US CPI vs Eurozone HICP, YoY"
                  source="FRED · ECB"
                  series={cpiCompare}
                  last="3.2 / 2.4%" lastLabel="(Mar 26)"/>
              </div>
            )}
            <MetricWidget accent="var(--inflation-600)" title="US headline CPI YoY" source="FRED · CPIAUCSL"
              value="3.2" unit="%" delta={0.1} deltaLabel="vs Feb" spark={cpiSpark}/>
            <MetricWidget accent="var(--inflation-600)" title="US core PCE YoY" source="BEA"
              value="2.8" unit="%" delta={0.0} deltaLabel="vs Feb" spark={[2.8,2.8,2.9,2.8,2.8,2.8,2.8]}/>
            <MetricWidget accent="var(--inflation-600)" title="Eurozone HICP YoY" source="ECB"
              value="2.4" unit="%" delta={0.0} deltaLabel="vs Feb" spark={[2.5,2.4,2.4,2.4,2.4,2.4,2.4]}/>
            {extraWidget !== "compare" && (
              <ChartWidget accent="var(--inflation-600)" title="US CPI vs Eurozone HICP" source="FRED · ECB"
                series={cpiCompare} last="3.2 / 2.4" lastLabel="%"/>
            )}
          </Quadrant>

          <Quadrant id="policy" label="Policy / Liquidity" accent="var(--policy-600)" asset="quadrant-policy"
            blurb="Rates, balance sheet, money supply">
            <MetricWidget accent="var(--policy-600)" title="Fed funds (upper)" source="FRED · DFEDTARU"
              value="5.50" unit="%" delta={0.0} deltaLabel="last move: 23 Jul" spark={fedSpark}/>
            <MetricWidget accent="var(--policy-600)" title="ECB deposit rate" source="ECB"
              value="3.50" unit="%" delta={-0.25} deltaLabel="vs prev meeting" spark={[4,3.75,3.75,3.5,3.5,3.5,3.5]}/>
            <ChartWidget accent="var(--policy-600)" title="US M2, $tn" source="FRED · M2SL"
              series={m2Series} last="$22.2T" lastLabel="(Mar 26)"/>
            <ChartWidget accent="var(--policy-600)" title="10Y−2Y spread, %" source="FRED · T10Y2Y"
              series={yieldCurveSeries} last="−0.05" lastLabel="(near re-steepen)"/>
          </Quadrant>

          <Quadrant id="market" label="Market" accent="var(--market-600)" asset="quadrant-market"
            blurb="Equities, yields, FX, credit">
            <MetricWidget accent="var(--market-600)" title="S&P 500" source="Yahoo"
              value="5,431" unit="" delta={0.4} deltaLabel="% today" spark={spxSeries[0].slice(-7)}/>
            <MetricWidget accent="var(--market-600)" title="US 10Y yield" source="FRED · DGS10"
              value="4.43" unit="%" delta={-0.02} deltaLabel="vs yesterday" spark={yieldSpark}/>
            <MetricWidget accent="var(--market-600)" title="DXY" source="ICE"
              value="103.4" unit="" delta={0.2} deltaLabel="% today" spark={[102.8,103,103.1,103.2,103.3,103.2,103.4]}/>
            <ChartWidget accent="var(--market-600)" title="S&P 500, last 24m" source="Yahoo"
              series={spxSeries} last="5,431" lastLabel=""/>
          </Quadrant>
        </main>
        <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} onApplyProposal={handleApply}/>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
