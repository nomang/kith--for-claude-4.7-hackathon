import Link from 'next/link';

/* ── The nine Opus 4.7 capabilities used in Kith ── */
const CAPS_LEGEND = [
  { n: 1, label: 'High-res vision',           color: 'gold'  },
  { n: 2, label: 'File-system memory',         color: 'green' },
  { n: 3, label: 'Self-verification',          color: 'coral' },
  { n: 4, label: 'Dissonant-data resistance',  color: 'coral' },
  { n: 5, label: 'Adaptive thinking',          color: 'coral' },
  { n: 6, label: 'Task budgets',               color: 'blue'  },
  { n: 7, label: 'Parallel subagents',         color: 'blue'  },
  { n: 8, label: '1M token context',           color: 'blue'  },
  { n: 9, label: 'Tool use · Agentic loop',    color: 'coral' },
  { n: 10, label: 'Routine analysis · Reminders', color: 'green' },
];

type Cap = { n: number; color: string };

type FlowNode = {
  icon: string;
  title: string;
  sub: string;
  caps: Cap[];
  href?: string;
  side: 'left' | 'right';
};

type FlowArrow = {
  label: string;
  color: 'coral' | 'gold' | 'blue' | 'green';
};

/* Capability numbers map directly to CAPS_LEGEND above */
const NODES: FlowNode[] = [
  {
    icon: '📷',
    title: 'Family Memory In',
    sub: 'Shoebox photos · Handwritten captions · Caregiver notes',
    caps: [{ n: 1, color: 'gold' }],
    href: '/caregiver-input',
    side: 'left',
  },
  {
    icon: '🗺',
    title: 'Personhood Map',
    sub: 'Every fact tagged known or inferred — nothing invented, ever.',
    caps: [
      { n: 3, color: 'coral' },
      { n: 2, color: 'green' },
    ],
    href: '/map-review',
    side: 'right',
  },
  {
    icon: '🎙',
    title: 'Safe Companionship',
    sub: 'Warm, grounded, dissonant-data resistant — in her voice.',
    caps: [
      { n: 8, color: 'blue'  },
      { n: 5, color: 'coral' },
      { n: 4, color: 'coral' },
    ],
    href: '/talk',
    side: 'left',
  },
  {
    icon: '📓',
    title: "Kith's Notebook",
    sub: 'Nightly reflection written to disk. Day 7 still knows Day 1.',
    caps: [
      { n: 2,  color: 'green' },
      { n: 6,  color: 'blue'  },
      { n: 10, color: 'green' },
    ],
    href: '/letter',
    side: 'right',
  },
  {
    icon: '👥',
    title: 'Five Parallel Agents',
    sub: 'Mood · Memory · Changes · Routines · Joy — all at once.',
    caps: [
      { n: 7, color: 'blue' },
      { n: 6, color: 'blue' },
    ],
    href: '/family-letter',
    side: 'left',
  },
  {
    icon: '🔍',
    title: 'Ask Kith — Investigator',
    sub: 'Reads its own notes, searches every conversation, cites every claim.',
    caps: [
      { n: 9, color: 'coral' },
    ],
    href: '/ask',
    side: 'right',
  },
  {
    icon: '💌',
    title: 'Family',
    sub: 'Weekly letter · On-demand investigator · Daily caregiver alerts',
    caps: [],
    href: '/family-letter',
    side: 'left',
  },
];

const ARROWS: FlowArrow[] = [
  { label: 'Opus 4.7 reads handwriting → builds structured map', color: 'gold'  },
  { label: 'Full Personhood Map loaded into every conversation turn', color: 'blue'  },
  { label: 'Kith writes observations nightly — grows across sessions', color: 'green' },
  { label: 'Notebook feeds 5 specialist agents simultaneously', color: 'green' },
  { label: 'Synthesizer produces weekly letter + caregiver alerts', color: 'coral' },
  { label: 'Family gets letter and can ask anything — sourced answers', color: 'coral' },
];

const colorVars: Record<string, string> = {
  coral: 'var(--coral)',
  gold:  '#d4a017',
  blue:  '#6ea8fe',
  green: '#5ecf8a',
};

/* Look up full label from capability number */
function capLabel(n: number) {
  return CAPS_LEGEND.find(c => c.n === n)?.label ?? '';
}

export default function KithFlow() {
  return (
    <section id="kf-flow" className="kf-section">
      <p className="hp-section-eyebrow">The pipeline</p>
      <h2 className="hp-section-title">Nine capabilities. One loop.</h2>
      <p className="kf-subtitle">
        Ten Claude Opus 4.7 capabilities shown in the exact order they fire.
      </p>

      {/* ── Capability legend ── */}
      <div className="kf-legend">
        {CAPS_LEGEND.map(c => (
          <span
            key={c.n}
            className="kf-legend-chip"
            style={{
              color: colorVars[c.color],
              borderColor: colorVars[c.color] + '55',
              background: colorVars[c.color] + '10',
            }}
          >
            <span className="kf-legend-num">{c.n}</span>
            {c.label}
          </span>
        ))}
      </div>

      {/* ── Flow nodes ── */}
      <div className="kf-flow">
        {NODES.map((node, i) => (
          <div key={i} className="kf-step">
            <div className={`kf-node-wrap kf-node-wrap--${node.side}`}>
              <NodeCard node={node} />
            </div>
            {i < NODES.length - 1 && (
              <ArrowRow arrow={ARROWS[i]} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function NodeCard({ node }: { node: FlowNode }) {
  const inner = (
    <div className="kf-node">
      <span className="kf-node-icon">{node.icon}</span>
      <div className="kf-node-body">
        <p className="kf-node-title">{node.title}</p>
        <p className="kf-node-sub">{node.sub}</p>
        {node.caps.length > 0 && (
          <div className="kf-node-caps">
            {node.caps.map((c, i) => (
              <span
                key={i}
                className="kf-cap"
                style={{
                  color: colorVars[c.color],
                  borderColor: colorVars[c.color] + '55',
                  background: colorVars[c.color] + '14',
                }}
              >
                <span className="kf-cap-num">{c.n}</span>
                {capLabel(c.n)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (node.href) {
    return (
      <Link href={node.href} className="kf-node-link">
        {inner}
        <span className="kf-node-open">Open →</span>
      </Link>
    );
  }
  return inner;
}

function ArrowRow({ arrow }: { arrow: FlowArrow }) {
  const col = colorVars[arrow.color];
  return (
    <div className="kf-arrow-row">
      <div
        className="kf-arrow-line"
        style={{ '--arrow-color': col } as React.CSSProperties}
      />
      <div className="kf-arrow-label" style={{ color: col }}>
        {arrow.label}
      </div>
    </div>
  );
}
