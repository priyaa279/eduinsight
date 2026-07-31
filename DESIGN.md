# DESIGN — EduInsight AI

The source of truth for every visual decision. Read this before building UI.

**System: Academic Press.** Established 2026-07-31. Supersedes the earlier
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

Warm laid paper and warm ink. Ivy is the institution; brass is what has been
certified.

| Role | Token | Value |
|---|---|---|
| Page ground | `--paper` | `#faf7f1` |
| Panel | `--surface` | `#fffdf9` |
| Raised / alt row | `--surface-2` | `#f6f2ea` |
| Well, track | `--paper-sunken` | `#f1ece1` |
| Text | `--ink` | `#1c1a17` |
| Secondary text | `--ink-soft` | `#5b5449` |
| Tertiary text | `--ink-faint` | `#6e6559` |
| Hairline | `--rule` | `#ddd5c6` |
| Emphasis rule | `--rule-strong` | `#bcb2a0` |
| Institution / primary | `--ivy` | `#2a5245` |
| Pressed / dark panel | `--ivy-deep` | `#1e3c33` |
| Mid ivy | `--ivy-mid` | `#4d7a68` |
| Ivy tint | `--ivy-tint` | `#e8efea` |
| Certified / seal | `--brass` | `#7d6229` |
| Seal, on dark | `--brass-light` | `#d8c99a` |
| Brass tint | `--brass-tint` | `#faf5e8` |
| Critical | `--claret` | `#8c2f2f` |
| High / warning | `--terracotta` | `#a8501f` |
| Informational | `--info` | `#2f4f7a` |

Severity is one warm ramp — claret → terracotta → brass. Because Medium shares
brass with the emphasis role, **severity must never be encoded by colour
alone**; every chip carries its word.

### Verified contrast

Every text/ground pair across all six views was measured in the browser with
correct alpha compositing: **0 failures against WCAG AA**. `--ink-faint` is the
floor at 4.86–5.63:1 depending on ground; do not introduce anything lighter for
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
| `--font-serif` | **Newsreader** | Anything that speaks: headings, answer headlines |
| `--font-sans` | **Public Sans** | Anything read in bulk: body, UI, dense tables |
| `--font-mono` | **IBM Plex Mono** | Identifiers: rule codes, survey codes, query plans |

Scale: `--text-display` `clamp(2.5rem, 1.4rem + 3.6vw, 4rem)` · `--text-h1`
`clamp(1.75rem, 1.15rem + 1.9vw, 2.5rem)` · `--text-h2` `1.375rem` ·
`--text-h3` `1.0625rem` · `--text-body` `0.9375rem` · `--text-sm` `0.875rem` ·
`--text-xs` `0.75rem`.

**12px is the floor.** The stylesheet previously carried 48 rules at 10–11px;
they were lifted. Nothing smaller ships.

Never set `color` on the global heading rule — several panels are dark and set
light text on the container. Headings inherit; state only face, weight, fit.

## Shape and structure

Rules carry structure; shadows are for things that genuinely float (the audit
drawer, modals). Radii are small: `--radius-sm` 3px, `--radius` 5px,
`--radius-lg` 8px.

**Navigation is a masthead, not a sidebar.** A two-tier header — brand and
status above, a horizontal section rail below — replaced the fixed 264px dark
sidebar. It reads editorial rather than admin-console and returns the whole
page width to the data. The rail scrolls horizontally on narrow screens rather
than collapsing into a hamburger drawer. The active section is marked by a
2px ivy rule, not a filled pill.

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
