# DESIGN — EduInsight AI

The source of truth for every visual decision. Read this before building UI.

**System: Terracotta.** Established 2026-07-31. Supersedes the earlier
navy/ochre attempt, which was rejected for being a palette swap over unchanged
structure — the lesson worth keeping is that **structure carries more of a
design's identity than colour does**.

## The idea

This product is about records, definitions, and evidence. Every number cites
its sources; every definition is versioned; every submission is sealed and
handed to a named human. That maps onto scholarly publishing, not onto SaaS
analytics. So: findings are set like an article, provenance reads as a
footnote, definitions are a register, approvals are seals.

Education-coded without being a university homepage — no crest, no campus
photography, no single school's colours.

## Colour

An entirely earthen palette — **no green anywhere in the system**. Built from a
supplied terracotta set. Token *names* are historical (`--ivy`, `--brass`) and
kept deliberately: ~150 rules and 183 remapped aliases reference them, so only
values moved. `--ivy` no longer means green; it means the mauve-clay secondary.

**The supplied swatches could not carry text or solid buttons.** Measured on
cream, the best of the nine reached only 3.87:1, and none reached 4.5:1 with
white on top. So the mid-tones are used where they excel — as fills, chart
series, and light cuts on dark ground — and the text/action values are darker
cuts derived from them. That split is the whole structure of this palette.

### Used directly from the supplied set

| Swatch | Hex | Where |
|---|---|---|
| Pale Terracotta | `#e3a680` | `--terracotta-light` — action on dark ground (6.7:1 on the sidebar) |
| Mauve Terracotta | `#b16b5e` | `--ivy-mid`, and `--rail-rule` as a hairline |
| **Canyon Clay** | `#d3927c` | `--rail` — the navigation rail itself. Deep ink on it is 6.5:1 |
| Terracotta Pot | `#e27b34` | `--brass-light` — the seal on dark |
| Terracotta / Brick / Dusty | `#d87348` `#d7704c` `#d2886a` | ordered chart ramp |

### Why Canyon Clay is the rail and Mauve is not

Canyon Clay is the only supplied swatch large enough to be a *surface*: deep
ink on it measures 6.5:1, soft ink 5.2:1. But **no coloured accent survives on
it** — terracotta is 2.9:1, the seal colour 4.0:1 — so the rail carries its
hierarchy in ink weight rather than hue. The active marker is an ink bar, the
seal and colonnade are ink at low opacity. That restraint is the point, not a
compromise.

Mauve Terracotta is a dead-zone mid-tone: 4.07:1 against ink, 3.81:1 on cream,
3.40:1 on the deep ground. It cannot carry small text on anything in this
system. It is used only as a hairline (`--rail-rule`) and in the chart ramp,
where 4.5:1 does not apply.

Hero panels stay deep sienna so the composition keeps a dark anchor rather than
sitting entirely in the mid-tones.

### Derived, because the set has no dark end

| Role | Token | Value | Ratio |
|---|---|---|---|
| Page ground | `--paper` | `#fbf6f2` | — |
| Panel | `--surface` | `#fffcf9` | — |
| Text | `--ink` | `#2b1a14` | 15.5:1 |
| Secondary text | `--ink-soft` | `#6e4d40` | 7.0:1 |
| Tertiary text | `--ink-faint` | `#7a5648` | 6.0:1 on paper, 5.3:1 on the tightest tint |
| Hairline | `--rule` | `#ecd8cb` | — |
| Emphasis rule | `--rule-strong` | `#d5b5a2` | — |
| **Action / brand** | `--terracotta` | `#a8402f` | 5.7:1; 6.0:1 with cream on it |
| Action pressed | `--terracotta-deep` | `#8f3a2c` | 7.0:1 |
| Hero panel ground | `--ivy-deep` | `#43241e` | 11.5:1 with cream text |
| Rail ink | `--rail-ink` | `#2b1a14` | 6.5:1 on clay |
| Rail ink, soft | `--rail-ink-soft` | `#42291f` | 5.2:1 on clay |
| Secondary brand | `--ivy` | `#8a4636` | 6.5:1 |
| Certified / seal | `--brass` | `#a34a1a` | 5.5:1 |
| Critical | `--claret` | `#8f2f28` | — |
| Informational | `--info` | `#8a4636` | mauve, not blue — nothing foreign to the palette |

Severity runs claret → terracotta → brass, all warm. Since brand and severity
share the family, **status must never be encoded by colour alone**; every chip
carries its word. Treatments differ too: a solid fill is an action, a tinted
pill is a state.

### Dark panels

`.ask-card`, `.analyst-context`, `.ipeds-banner`, `.memory-search` and
`.scenario-hero` sit on `--ivy-deep`. They **re-base the palette tokens on
themselves**, so descendants that already say `var(--ink-soft)` resolve to the
light equivalent.

One trap: the legacy `--color-*` aliases are declared on `:root`, and a custom
property substitutes its `var()` references **where it is declared, not where
it is used**. Those aliases froze to the root values and never see the
re-basing, so descendant text inside dark panels is also set directly (and at
raised specificity, since existing descendant rules would otherwise win).

## Typography

Self-hosted in `app/fonts.css`; regenerate with `scratchpad/fonts.mjs`.
**`next/font/google` does not work under vinext** — it downloads the woff2
files but emits `@font-face` with no `src:`, so the browser registers zero
faces and silently falls back to a system font. Always verify with
`document.fonts.size` and by measuring rendered width against the generic
fallback.

| Variable | Face | Used for |
|---|---|---|
| `--font-serif` | **Alegreya** | Anything that speaks: headings, answer headlines |
| `--font-sans` | **Alegreya Sans** | Anything read in bulk: body, UI, dense tables |
| `--font-mono` | **IBM Plex Mono** | Identifiers: rule codes, survey codes, query plans |

Scale: `--text-display` `clamp(2.5rem, 1.4rem + 3.6vw, 4rem)` · `--text-h1`
`clamp(1.75rem, 1.15rem + 1.9vw, 2.5rem)` · `--text-h2` `1.375rem` ·
`--text-h3` `1.0625rem` · `--text-body` `0.9375rem` · `--text-sm` `0.875rem` ·
`--text-xs` `0.75rem`.

Alegreya is a superfamily drawn for literature and long-form reading, and it
has a full weight range — headings are 600. It pairs with Alegreya Sans by
construction, so the two share proportions and colour on the page.

**12px is the floor.** The stylesheet previously carried 48 rules at 10–11px;
they were lifted. Nothing smaller ships.

Never set `color` on the global heading rule — several panels are dark and set
light text on the container. Headings inherit; state only face, weight, fit.

## Shape and structure

Rules carry structure; shadows are for things that genuinely float (the audit
drawer, modals). Radii are small: `--radius-sm` 3px, `--radius` 5px,
`--radius-lg` 8px.

**Navigation is a 268px Canyon Clay rail**, treated as a designed object rather
than a slab: pressed-paper grain (inlined `feTurbulence`, no request), the
engraved seal as the brand mark, and a colonnade along its foot. The active
section is marked by a brass rule at the leading edge, the way a ledger marks
the open page. Below 1020px it becomes a drawer behind a hamburger, and
navigating closes it.

## Imagery

All artwork is generated SVG in `app/artwork.tsx` — it themes from
`currentColor`, scales cleanly, adds no request, and raises no licensing
question. Motifs are deliberately institution-agnostic:

| Component | Where | What it is |
|---|---|---|
| `SealMark` | Sidebar brand | Engraved seal: ticked rim, concentric rules, an open ledger spread reduced to three strokes |
| `ArchColonnade` | Sidebar foot | Receding arches as a horizon line — the one plainly architectural image |
| `QuadPlan` | Hero panels | A quadrangle in plan, sunk to 14% as a watermark |
| `EmptyPlot` | Empty / ready states | A dashed series that has not been calculated yet |
| `PageRule` | Section ends | A ruled page-foot ornament |

Imagery must never compete with data. Watermarks stay under 0.15 opacity;
nothing decorative may sit inside a panel that is reporting a number.

Grid and flex children need `min-width: 0`; the default `auto` lets a wide
table push the page sideways (`.issue-detail` overhung 333px at 375px).

## Do

- Set the one big number in `--text-display`; spend it once per screen.
- Show confidence with its component checks visible.
- Name sources and mark certified ones in brass.
- Render a fail-closed result as a *result*, with an answer's visual weight.
- `tabular-nums` on every figure in a column.
- Give focus a visible 2px `--ivy` ring at 2px offset.
- Left-align text; right-align numbers.

## Don't

- Don't encode severity or status by colour alone.
- Don't use Arial, Georgia, Inter, Roboto, or a bare system stack.
- Don't put a gradient behind anything.
- Don't add shadows to panels sitting in a grid.
- Don't use Unicode glyphs as icons — inline SVG only.
- Don't ship text below 12px.
- Don't let a chart appear when the result is a clarification, limitation, or
  refusal. An empty-state explanation is correct; a decorative chart is a lie.
- Don't draw a ring, dial, or bar whose geometry isn't bound to the value. A
  hardcoded arc that never moves is worse than plain text.
