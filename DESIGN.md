# DESIGN — EduInsight AI

The source of truth for every visual decision. Read this before building UI.

**System: Regalia.** Established 2026-07-31. Supersedes the earlier
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

**Regalia** — deep plum on parchment, with muted gold for what has been
certified. Academic regalia purple is genuinely education-coded (doctoral
hoods, old university crests) and is rare in software, so it does not read as
a stock dashboard. No green, no terracotta, no navy.

### Role tokens

Named by what they do, not by hue — so the next palette change edits values in
one place. The legacy `--terracotta` / `--ivy` / `--brass` names are aliases
onto these; ~150 rules and 183 remapped variables still reference them, which
is why they were aliased rather than renamed.

| Role | Token | Value | On parchment |
|---|---|---|---|
| Action, voice | `--accent` | `#5b3a7a` | 8.2:1 |
| Action pressed | `--accent-deep` | `#4a2d66` | 10.3:1 |
| Action on dark | `--accent-on-dark` | `#b79ed0` | 6.2:1 on the rail |
| Certified / seal | `--seal` | `#7d6216` | 5.3:1 |
| Seal on dark | `--seal-on-dark` | `#d9be74` | 8.2:1 on the rail |

### Grounds and ink

| Role | Token | Value | Ratio |
|---|---|---|---|
| Page | `--paper` | `#f7f4ef` | — |
| Panel | `--surface` | `#fdfbf8` | — |
| Text | `--ink` | `#221a26` | 15.4:1 |
| Secondary | `--ink-soft` | `#514758` | 8.0:1 |
| Tertiary | `--ink-faint` | `#6b5f74` | 5.5:1 |
| Hairline | `--rule` | `#e0d9d0` | — |
| Rail ground | `--rail` | `#2f2140` | 12.5:1 with parchment text |
| Rail secondary | `--ink-soft-on-ivy` | `#c9bfd4` | 8.4:1 on the rail |
| Critical | `--claret` | `#8f2f4a` | 7.2:1 |
| Informational | `--info` | `#41497f` | 7.7:1 |

Buttons measure 8.7:1 with parchment on plum. **Lowest ratio anywhere in the
product is 5.0:1** — the palette has real headroom, unlike the terracotta pass
it replaces, where the rail sat at 4.66:1 and forbade any fade at all.

Severity is claret → plum → seal. Status must still never be encoded by colour
alone; every chip carries its word.

### Why a dark rail

The previous rail used mid-tone swatches and had no room: only near-black
cleared AA on them, secondary text could not recede, and raised blocks sat at
1.59:1 against the ground. A dark plum ground restores the full range —
parchment at 12.5:1, a faint tier at 5.8:1 — so secondary text can fade
properly and blocks can lift. Prefer a dark anchor over a mid-tone one.

## Typography

Self-hosted in `app/fonts.css`; regenerate with `scratchpad/fonts.mjs`.
**`next/font/google` does not work under vinext** — it downloads the woff2
files but emits `@font-face` with no `src:`, so the browser registers zero
faces and silently falls back to a system font. Always verify with
`document.fonts.size` and by measuring rendered width against the generic
fallback.

| Variable | Face | Used for |
|---|---|---|
| `--font-serif` | **Spectral** | Anything that speaks: headings, answer headlines |
| `--font-sans` | **Source Sans 3** | Anything read in bulk: body, UI, dense tables |
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

**Navigation is a 268px deep-plum rail**, treated as a designed object rather
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
