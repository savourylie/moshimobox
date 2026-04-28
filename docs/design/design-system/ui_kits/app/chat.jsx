// Moshimo Box — Chat panel (scripted copilot)

const { useState: useStateChat, useRef: useRefChat, useEffect: useEffectChat } = React;

const SCRIPT = [
  {
    user: "How is US inflation trending?",
    agent: "US headline CPI rose to 3.2% in March, the third consecutive monthly increase. Core services are still the dominant driver; goods disinflation has stalled.",
    proposal: null,
  },
  {
    user: "Compare with the eurozone.",
    agent: "Eurozone HICP held at 2.4% in March, flat for two months. The US−eurozone inflation gap has widened to ~80bps, the largest since mid-2024.",
    proposal: {
      title: "Add comparison chart",
      detail: "US CPI YoY vs Eurozone HICP YoY — last 24 months. Place at the top of Inflation.",
      target: "Inflation",
    },
  },
  {
    user: "What's the recession signal looking like?",
    agent: "10Y−2Y has been inverted for 14 months. Unemployment is at 3.8%, up 0.3 from the cycle low — Sahm rule trigger is at 0.5. No firm signal yet.",
    proposal: {
      title: "Switch to Recession watch layout",
      detail: "Promotes Growth + Policy quadrants and surfaces 10Y-2Y, Sahm, and ISM up top.",
      target: "Layout",
    },
  },
];

const ChatPanel = ({ open, onClose, onApplyProposal }) => {
  const [step, setStep] = useStateChat(0);
  const [history, setHistory] = useStateChat([
    { role: "agent", text: "I can pull macro data, compare series, or rearrange your dashboard. Try a question, or ask me to change the layout." },
  ]);
  const [draft, setDraft] = useStateChat("");
  const [pendingProposal, setPendingProposal] = useStateChat(null);
  const scrollRef = useRefChat(null);

  useEffectChat(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, pendingProposal]);

  const sendNext = () => {
    if (step >= SCRIPT.length) return;
    const turn = SCRIPT[step];
    setHistory(h => [...h, { role: "user", text: turn.user }]);
    setDraft("");
    setTimeout(() => {
      setHistory(h => [...h, { role: "agent", text: turn.agent }]);
      if (turn.proposal) setPendingProposal(turn.proposal);
      setStep(s => s + 1);
    }, 500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step < SCRIPT.length) sendNext();
  };

  const dismissProposal = () => setPendingProposal(null);
  const applyProposal = () => {
    if (pendingProposal) onApplyProposal(pendingProposal);
    setPendingProposal(null);
  };

  if (!open) return null;

  return (
    <aside style={{
      width: 420, flexShrink: 0,
      background: "var(--paper-50)", borderLeft: "1px solid var(--ink-150)",
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 56px)",
    }}>
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid var(--ink-100)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <Icon name="sparkles" size={16}/>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>Research copilot</div>
        <button onClick={onClose} className="iconbtn" style={{ marginLeft: "auto" }}><Icon name="x" size={16}/></button>
      </div>
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14,
      }}>
        {history.map((m, i) => (
          <div key={i} style={{
            maxWidth: "85%",
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            background: m.role === "user" ? "var(--accent-ink-700)" : "var(--paper-50)",
            color: m.role === "user" ? "var(--paper-50)" : "var(--ink-800)",
            border: m.role === "user" ? "none" : "1px solid var(--ink-150)",
            borderRadius: 14,
            borderBottomRightRadius: m.role === "user" ? 4 : 14,
            borderBottomLeftRadius: m.role === "agent" ? 4 : 14,
            padding: "12px 14px",
            fontFamily: "var(--font-serif)", fontSize: 14.5, lineHeight: 1.55,
          }}>
            {m.text}
          </div>
        ))}
        {pendingProposal && (
          <div style={{
            alignSelf: "stretch",
            background: "var(--accent-ink-50)",
            border: "1px solid var(--accent-ink-100)",
            borderRadius: 12, padding: 14,
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{
              fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-ink-700)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Icon name="sparkles" size={12}/>
              Proposed action · {pendingProposal.target}
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 500, color: "var(--ink-900)" }}>
              {pendingProposal.title}
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-600)", lineHeight: 1.5 }}>
              {pendingProposal.detail}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={applyProposal} style={{
                fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
                background: "var(--accent-ink-700)", color: "var(--paper-50)",
                border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Icon name="check" size={13}/> Apply
              </button>
              <button onClick={dismissProposal} style={{
                fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
                background: "transparent", color: "var(--ink-700)",
                border: "1px solid var(--ink-200)", borderRadius: 8, padding: "7px 14px", cursor: "pointer",
              }}>Dismiss</button>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{
        padding: 16, borderTop: "1px solid var(--ink-100)",
        background: "rgba(251,248,243,0.85)", backdropFilter: "blur(12px) saturate(140%)",
      }}>
        <div style={{
          background: "var(--paper-50)", border: "1px solid var(--ink-200)", borderRadius: 14,
          padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10,
        }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={step < SCRIPT.length ? `Try: "${SCRIPT[step].user}"` : "End of demo script."}
            style={{
              border: "none", outline: "none", background: "transparent",
              fontFamily: "var(--font-serif)", fontSize: 14.5, color: "var(--ink-900)", width: "100%",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-500)" }}>
              Demo · {Math.min(step + 1, SCRIPT.length)} of {SCRIPT.length}
            </div>
            <button type="submit" disabled={step >= SCRIPT.length} style={{
              background: step >= SCRIPT.length ? "var(--ink-200)" : "var(--accent-ink-700)",
              color: "var(--paper-50)", border: "none",
              borderRadius: 8, padding: "6px 12px", cursor: step >= SCRIPT.length ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
            }}>
              <Icon name="send" size={12}/> Send
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
};

window.ChatPanel = ChatPanel;
