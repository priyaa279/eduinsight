# DESIGN — EduInsight AI

The source of truth for every visual decision. Read this before building UI.

**System: Scriptorium.** Established 2026-07-31. Supersedes the earlier
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

Warm cream paper and warm ink. **Terracotta leads** — it carries action and
voice: primary buttons, links, eyebrows, the seal, the active section marker.
Pine holds the ground and means *verified*. Gold marks what has been
*certified and sealed*.

Terracotta at `#a84a1c` measures only 2.4:1 on the pine sidebar, so dark
grounds use `--terracotta-light` (6.5:1). Never put mid-tone terracotta on pine.

Severity still runs claret → terracotta → gold. Brand and severity therefore
share terracotta, which is tolerable only because the treatments differ — a
solid fill is an action, a tinted pill is a state — and because severity always
carries its word. If that ever stops being true, split them. Token *names* are historical (`--ivy`,
`--brass`) and are kept because ~150 rules and 183 remapped aliases reference
them — only the values moved.

| Role | Token | Value |
|---|---|---|
| Page ground | `--paper` | `#faf6ee` |
| Panel | `--surface` | `#fffdf8` |
| Raised / alt row | `--surface-2` | `#f6f1e6` |
| Well, track | `--paper-sunken` | `#f0e9dc` |
| Text | `--ink` | `#221f1a` |
| Secondary text | `--ink-soft` | `#5c5347` |
| Tertiary text | `--ink-faint` | `#6e6455` |
| Hairline | `--rule` | `#e0d7c6` |
| Emphasis rule | `--rule-strong` | `#c2b7a1` |
| Institution / primary (pine) | `--ivy` | `#2c5a55` |
| Sidebar / dark panel | `--ivy-deep` | `#16302c` |
| Mid pine | `--ivy-mid` | `#4d7f78` |
| Pine tint | `--ivy-tint` | `#e6efec` |
| Certified / seal (gold) | `--brass` | `#8a6a1c` |
| Seal, on dark | `--brass-light` | `#d9c07f` |
| Gold tint | `--brass-tint` | `#faf3e0` |
| Critical | `--claret` | `#8c2f2f` |
| **Action, voice, brand** | `--terracotta` | `#a84a1c` |
| Action, pressed | `--terracotta-deep` | `#8a3b14` |
| Action, on dark ground | `--terracotta-light` | `#e8a06d` |
| Informational | `--info` | `#2f4f7a` |

Severity is one warm ramp — claret → terracotta → brass. Because Medium shares
brass with the emphasis role, **severity must never be encoded by colour
alone**; every chip carries its word.

### Verified contrast

Every text/ground pair across all six views was measured in the browser with
correct alpha compositing: **0 failures against WCAG AA**, sidebar included. `--ink-faint` is the
floor at 5.41:1 on paper (lowest ratio anywhere: 4.95:1); do not introduce anything lighter for
text. It is tuned against `--paper`, which is darker than `--surface` — check
new colours against paper, not white.

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
| `--font-serif` | **Instrument Serif** | Anything that speaks: headings, answer headlines |
| `--font-sans` | **Instrument Sans** | Anything read in bulk: body, UI, dense tables |
| `--font-mono` | **IBM Plex Mono** | Identifiers: rule codes, survey codes, query plans |

Scale: `--text-display` `clamp(2.5rem, 1.4rem + 3.6vw, 4rem)` · `--text-h1`
`clamp(1.75rem, 1.15rem + 1.9vw, 2.5rem)` · `--text-h2` `1.375rem` ·
`--text-h3` `1.0625rem` · `--text-body` `0.9375rem` · `--text-sm` `0.875rem` ·
`--text-xs` `0.75rem`.

Instrument Serif ships a **single weight by design**. Headings are 400 and
hierarchy comes from size, not weight — do not reach for a bold heading, there
isn't one. Its high stroke contrast carries the emphasis instead.

**12px is the floor.** The stylesheet previously carried 48 rules at 10–11px;
they were lifted. Nothing smaller ships.

Never set `color` on the global heading rule — several panels are dark and set
light text on the container. Headings inherit; state only face, weight, fit.

## Shape and structure

Rules carry structure; shadows are for things that genuinely float (the audit
drawer, modals). Radii are small: `--radius-sm` 3px, `--radius` 5px,
`--radius-lg` 8px.

**Navigation is a 268px pine sidebar**, treated as a designed object rather
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
