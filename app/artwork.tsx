/**
 * Artwork for the EduInsight workspace.
 *
 * All imagery is generated SVG rather than raster assets: it themes from
 * `currentColor` and the palette tokens, scales without artefacts, adds no
 * network requests, and carries no licensing question. The motifs are
 * deliberately institution-agnostic — arches, a quadrangle plan, an engraved
 * seal — so nothing reads as one particular school.
 */

/** Engraved seal used as the brand mark. Concentric rules, ticked rim, and a
 *  geometric centre that suggests an open book without illustrating one. */
export function SealMark({ className }: { className?: string }) {
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label="EduInsight seal"
      fill="none"
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
      <circle cx="32" cy="32" r="25.5" stroke="currentColor" strokeWidth="1" opacity=".35" />
      <g stroke="currentColor" strokeWidth="1" opacity=".45">
        {ticks.map((deg) => (
          <line
            key={deg}
            x1="32"
            y1="3.5"
            x2="32"
            y2={deg % 90 === 0 ? "8.5" : "6.5"}
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>
      {/* Open book / ledger spread, reduced to three strokes. */}
      <path
        d="M15 38V23c5-2.6 10-2.6 15 0v15c-5-2.6-10-2.6-15 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M49 38V23c-5-2.6-10-2.6-15 0v15c5-2.6 10-2.6 15 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <line x1="32" y1="23" x2="32" y2="41" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** Colonnade of arches. Sits at the foot of the sidebar as a horizon line —
 *  the one piece of straightforwardly architectural imagery in the product. */
export function ArchColonnade({ className }: { className?: string }) {
  const arches = [0, 1, 2, 3, 4, 5];
  return (
    <svg
      className={className}
      viewBox="0 0 240 72"
      preserveAspectRatio="none"
      aria-hidden="true"
      fill="none"
    >
      {arches.map((i) => {
        const x = i * 40 + 4;
        return (
          <g key={i} stroke="currentColor" strokeWidth="1.25">
            <path d={`M${x} 72V34a16 16 0 0 1 32 0v38`} opacity={0.5 - i * 0.03} />
            <path d={`M${x + 6} 72V35a10 10 0 0 1 20 0v37`} opacity={0.28 - i * 0.02} />
          </g>
        );
      })}
      <line x1="0" y1="71.5" x2="240" y2="71.5" stroke="currentColor" strokeWidth="1" opacity=".6" />
    </svg>
  );
}

/** Quadrangle drawn in plan: nested courts with crossing paths. Used as a
 *  faint backdrop behind hero panels. */
export function QuadPlan({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 320"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <rect x="20" y="20" width="280" height="280" strokeWidth="1.1" opacity=".5" />
      <rect x="54" y="54" width="212" height="212" strokeWidth="1" opacity=".38" />
      <rect x="92" y="92" width="136" height="136" strokeWidth="1" opacity=".28" />
      <rect x="130" y="130" width="60" height="60" strokeWidth="1" opacity=".2" />
      <g strokeWidth=".9" opacity=".3">
        <line x1="160" y1="20" x2="160" y2="300" />
        <line x1="20" y1="160" x2="300" y2="160" />
        <line x1="54" y1="54" x2="266" y2="266" />
        <line x1="266" y1="54" x2="54" y2="266" />
      </g>
      <g opacity=".5">
        <circle cx="160" cy="160" r="4" fill="currentColor" stroke="none" />
        <circle cx="160" cy="160" r="11" strokeWidth="1" />
      </g>
    </svg>
  );
}

/** Ruled paper edge used to close long sections, like the foot of a page. */
export function PageRule({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      aria-hidden="true"
      stroke="currentColor"
      fill="none"
    >
      <line x1="0" y1="1" x2="200" y2="1" strokeWidth="1.4" opacity=".55" />
      <line x1="0" y1="5" x2="200" y2="5" strokeWidth=".8" opacity=".3" />
      <line x1="70" y1="10" x2="130" y2="10" strokeWidth="1.4" opacity=".45" />
    </svg>
  );
}

/** Illustration for empty and ready states: a cohort of marks resolving into
 *  an ordered series. Reads as "nothing calculated yet", not as decoration. */
export function EmptyPlot({ className }: { className?: string }) {
  const bars = [26, 42, 34, 58, 48, 70];
  return (
    <svg
      className={className}
      viewBox="0 0 180 96"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <line x1="10" y1="86" x2="170" y2="86" strokeWidth="1.2" opacity=".5" />
      <line x1="10" y1="10" x2="10" y2="86" strokeWidth="1.2" opacity=".5" />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={24 + i * 24}
          y={86 - h}
          width="13"
          height={h}
          strokeWidth="1.1"
          strokeDasharray="3 3"
          opacity={0.55 - i * 0.05}
        />
      ))}
    </svg>
  );
}
