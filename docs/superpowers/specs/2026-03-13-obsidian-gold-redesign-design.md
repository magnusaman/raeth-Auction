# Raeth Arena Frontend Redesign: "Obsidian & Gold"

**Date:** 2026-03-13
**Status:** Reviewed & Updated (v3)
**Approach:** Full visual overhaul (Approach A) — same architecture, new skin

## Context

Raeth Arena is an AI cricket auction + prediction platform targeting startup founders and investors for demo purposes. The current frontend uses a generic Vercel/Linear dark theme (purple gradients, glass cards) that lacks distinctive personality. The backend (26 API endpoints, Prisma/PostgreSQL, Socket.io) is production-grade and untouched by this redesign.

## Design Philosophy

**"Cinematic Mission Control"** — Two modes:
1. **Story mode** (homepage, about): Spacious, cinematic, large typography, generous whitespace. The pitch deck in a URL.
2. **Operations mode** (auctions, tournaments, leaderboard, trends): Dense, data-forward, live feeds, status indicators. The "this actually works" moment.

**Color identity:** Obsidian & Gold — warm luxury palette that maps to cricket (trophies, money, stakes) and immediately differentiates from every purple/cyan AI clone.

## Color System

### Core Palette

These are conceptual token names for this spec. **Implementation notes:**
- The existing CSS variable names (`--color-bg-deep`, `--color-bg-base`, `--color-bg-surface`, `--color-text-primary`, etc.) and their corresponding Tailwind classes (`bg-bg-deep`, `text-text-primary`, etc.) are preserved — only their values change to the new palette. This keeps the redesign as a "same architecture, new skin" change.
- The project uses Tailwind CSS v4 with `@theme inline` in `globals.css` (no `tailwind.config.ts`) — all token changes go through this mechanism.
- Some semantic colors are deliberately retuned (e.g., success green shifts from `#10B981` to `#4ADE80`, info blue from `#3B82F6` to `#60A5FA`) for better contrast against the warmer palette.
- Variables marked "**new**" in the table below must be added to `@theme inline`.

| Conceptual Token | Hex | Maps To (existing CSS var) | Usage |
|-------|-----|-------|-------|
| `bg-void` | `#050505` | `--color-bg-deep` | Page background |
| `bg-obsidian` | `#0a0a0a` | `--color-bg-base` | Card backgrounds |
| `bg-onyx` | `#111111` | `--color-bg-surface` / `--color-bg-elevated` | Elevated surfaces, table headers |
| `bg-slate` | `#1a1a1a` | `--color-bg-card` | Hover states, inputs, dropdowns |
| `text-ivory` | `#F5F0E8` | `--color-text-primary` | Primary text (warm white) |
| `text-stone` | `#A09888` | `--color-text-secondary` | Secondary text |
| `text-ash` | `#6B6560` | `--color-text-muted` | Muted/disabled text |
| `gold` | `#D4A853` | `--color-accent-gold` | Primary accent |
| `gold-bright` | `#F5C842` | `--color-accent-gold-bright` **new** | Hover states, active elements |
| `gold-dim` | `#8B7A4A` | `--color-accent-gold-dim` **new** | Borders, subtle accents |
| `gold-glow` | `rgba(212,168,83,0.15)` | `--color-accent-gold-glow` **new** | Box shadows, glows |
| `success` | `#4ADE80` | `--color-success` | Sold, completed, wins |
| `danger` | `#EF4444` | `--color-danger` | Live indicator, stopped, errors |
| `info` | `#60A5FA` | `--color-info` | Links, informational |

### Border System

| Context | Value |
|---------|-------|
| Default | `rgba(212,168,83,0.06)` |
| Subtle | `rgba(255,255,255,0.04)` |
| Hover | `rgba(212,168,83,0.2)` |
| Active/Focus | `rgba(212,168,83,0.4)` |

### Team Colors (unchanged)

MI: #004BA0, CSK: #FDB913, RCB: #EC1C24, KKR: #3A225D, SRH: #FF822A, RR: #EA1A85, DC: #004C93, PBKS: #DD1F2D, GT: #1C1C2B, LSG: #A72056

## Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Hero headline | Inter | 56-72px | 900 | `text-ivory`, key words in gold gradient |
| Page title | Inter | 36-42px | 800 | `text-ivory` |
| Section label | Inter | 11px, tracking 0.2em, uppercase | 700 | `gold` |
| Body | Inter | 15px | 400 | `text-stone` |
| Data/stats | JetBrains Mono | varies | 700 | `gold` or `text-ivory` |
| Mono IDs | JetBrains Mono | 13px | 400 | `text-ash` |

## Component Specifications

### Navbar
- Transparent background with warm-tinted backdrop blur: `rgba(5,5,5,0.85)` + `blur(16px)`
- Brand text "RAETH" in gold (#D4A853), "ARENA" in ivory
- Active nav item: gold underline (2px), not a colored blob
- Mobile hamburger: gold icon, slide-out drawer with dark bg

### Buttons
- **Primary (CTA):** Gold gradient background (`linear-gradient(135deg, #D4A853, #F5C842)`), black text, weight 700. Hover: brighten + translateY(-1px) + gold box-shadow
- **Secondary:** Transparent bg, gold border (1px solid rgba(212,168,83,0.25)), gold text. Hover: bg rgba(212,168,83,0.06)
- **Danger:** Red bg tint, red text, red border (keep existing pattern)
- **Ghost:** No border, gold text only. Hover: subtle bg

### Cards
- Background: `bg-obsidian` (#0a0a0a)
- Border: 1px solid `rgba(212,168,83,0.06)`
- Border-radius: 16px
- Hover: border brightens to `rgba(212,168,83,0.15)`, translateY(-2px), gold box-shadow `0 8px 32px rgba(212,168,83,0.08)`
- Top accent line variant: 1px gold gradient across top

### StatusBadge
| Status | Colors |
|--------|--------|
| RUNNING / PREDICTING | Gold bg tint, gold text, pulsing gold dot |
| COMPLETED / EVALUATED | Green bg tint, green text |
| STOPPED / CANCELLED | Red bg tint, red text |
| LOBBY / PENDING | Warm amber bg tint, amber text |

### Tables
- Header row: `bg-onyx` (#111111), uppercase tracking text in `text-ash`
- Row hover: `rgba(212,168,83,0.03)`
- Row border: `rgba(255,255,255,0.03)`
- Active/selected row: left gold border accent

### Inputs & Selects
- Background: `bg-slate` (#1a1a1a)
- Border: 1px solid `rgba(255,255,255,0.08)`
- Focus: border `rgba(212,168,83,0.4)` + gold ring `0 0 0 3px rgba(212,168,83,0.1)`
- Text: `text-ivory`
- Placeholder: `text-ash`

### AnimatedBackground
- Replace purple/blue aurora blurs with warm gold/amber blurs
- Colors: `rgba(212,168,83,0.04)`, `rgba(180,140,60,0.03)`, `rgba(245,200,66,0.02)`
- Much more subtle than current — barely visible, adds warmth
- Dot grid overlay stays but with warm tint

## Page Designs

### 1. Homepage — "The Pitch"

**Hero Section (full viewport):**
- Large headline: "AI Agents. Real Cricket. **Live Auctions.**" — "Live Auctions" in gold gradient
- Subtitle: "Benchmark LLM strategic reasoning with real IPL data. Auctions, predictions, and head-to-head evaluation."
- Single gold CTA: "Launch an Auction" (arrow icon)
- Animated stat counter below: "X auctions · Y predictions · Z agents" — numbers animate up on scroll

**Social Proof Ticker:**
- Thin horizontal strip below hero
- Scrolling: recent completions, agent names, scores
- Warm amber border top/bottom

**Two Benchmarks Section:**
- Side-by-side bento cards (equal width)
- Left: **AuctionBench** — icon, description, key stat, "Explore" button
- Right: **TourBench** — same format
- Cards have gold top-accent line, hover glow

**How It Works:**
- 3 numbered steps in a horizontal row
- Gold circle numbers (1, 2, 3)
- Each step: icon + title + one-line description
- Subtle connecting lines between steps

**Recent Activity:**
- Last 3-4 completed auctions as compact cards
- Shows: date, agent count, winner, score
- Click to view results

**Footer:**
- Minimal. "Built by Raeth.ai" + GitHub icon
- Gold divider line above

### 2. Arena Page — Auction Setup + History

- Title: "AuctionBench" with gold section label
- Setup card: model selector grid with gold active borders
- Agent count +/- with gold buttons
- Launch button: gold gradient, full-width at bottom of setup card
- History table below: same structure, gold accents on status/actions

### 3. Live Auction Page — "Mission Control"

**Layout:** Full-width, dense, operational.

- **Top bar:** Progress indicator (lot X/Y as gold progress bar), timer with gold countdown, status badge
- **Left panel (60%):** Current player card (name, role badge, base price, career stats). Below: live bid feed — team-colored entries slide in from right. Current highest bid prominently displayed in gold.
- **Right panel (40%):** Team standings stack — each team card shows purse bar, squad count, last acquisition. Active bidder gets gold border pulse.
- **Bottom:** Optional ticker of all recent bids

### 4. Tournaments Page

- Same structure as current
- Gold active states on mode picker (Real/Synthetic)
- Gold season selector pills
- Model selector with gold borders
- Tournament table with gold accents
- Search/filter controls stay (recently added)

### 5. Leaderboard

- Rank #1: Gold badge, gold row background tint, gold score bar
- Rank #2: Silver badge (#C0C0C0)
- Rank #3: Bronze badge (#CD7F32)
- Rest: neutral
- Score bars: gold gradient instead of cyan
- Sparklines: gold stroke
- Expanded detail: gold accent on key metrics

### 6. Trends/Analytics

- Chart primary color: gold (#D4A853) for main model, warm secondary tones for others
- Chart grid lines: warm `rgba(212,168,83,0.06)`
- Tooltip: dark bg with gold border
- Radar chart: gold fill for top performer
- Summary cards: gold left-border accent

### 7. Results Page

- Winning team card: gold border + subtle gold glow
- Player prices: gold for sold, muted for unsold
- Bid transcript: team-colored with gold highlights for winning bids
- Evaluation section: gold gradient on top scorer

### 8. About Page

- Clean editorial layout
- Gold section dividers (gradient lines)
- Large typography with generous spacing
- Gold accent on key terms

### 9. Compare Page

- Recolor all chart accent colors from cyan/purple (`#22D3EE`, `#A855F7`) to gold palette
- Replace hardcoded `ACCENT.cyan` constants with gold equivalents
- Recharts colors: primary gold (#D4A853), secondary warm tones for comparison models
- Gradient borders: gold instead of purple/cyan
- Keep comparison layout structure unchanged

## Animations

| Animation | Spec |
|-----------|------|
| Page enter | 200ms fade + translateY(8px) — keep existing |
| Card hover | 250ms: translateY(-2px) + border brighten + gold shadow |
| Gold shimmer | On hero CTA hover: light-streak animation across button |
| Bid entry | 320ms slide from right (keep existing, recolor gold) |
| Number count-up | Stats animate 0→value on viewport entry, 600ms ease-out |
| Live pulse | Gold dot: scale 1→1.08→1 with gold shadow expand, 1.5s infinite |
| Ticker scroll | 30s linear infinite (keep existing) |
| Reduced motion | All animations → 0.01ms duration (keep existing) |

## What Does NOT Change

- Next.js App Router structure (same routes, same pages)
- All API endpoints and data shapes
- Prisma schema and database
- Socket.io WebSocket integration
- Framer Motion, Recharts, Lucide icons (same libraries)
- Mobile responsive breakpoints (same approach)
- All backend code (zero changes)
- Authentication (agent API keys, admin auth)
- Loading skeletons (recolor via CSS `.shimmer` class change in `globals.css` — no per-file edits needed except `not-found.tsx` which has hardcoded `#7877C6`)
- SEO (robots.txt, sitemap, metadata)

## File Change Summary

| File | Change Type |
|------|-------------|
| `src/app/globals.css` | Major rewrite — new color token values, remove all `[data-theme="light"]` overrides (~100 lines), new component styles |
| `src/app/layout.tsx` | Minor — remove light theme class if present |
| `src/app/page.tsx` | Major rewrite — new homepage design |
| `src/app/arena/page.tsx` | Moderate — recolor, minor layout tweaks |
| `src/app/auction/[id]/page.tsx` | Moderate — recolor panels |
| `src/app/tournaments/page.tsx` | Moderate — recolor accents |
| `src/app/tournaments/[id]/page.tsx` | Moderate — recolor |
| `src/app/leaderboard/page.tsx` | Moderate — recolor, gold rank badges |
| `src/app/trends/page.tsx` | Moderate — recolor charts |
| `src/app/compare/page.tsx` | Moderate — recolor charts, replace cyan/purple accent constants with gold |
| `src/app/results/[id]/page.tsx` | Moderate — recolor, gold winner highlight |
| `src/app/about/page.tsx` | Moderate — recolor, typography update |
| `src/app/not-found.tsx` | Minor — update hardcoded `#7877C6` gradient to gold |
| `src/components/Navbar.tsx` | Moderate — gold brand, replace animated pill (`layoutId="nav-pill"`) with gold underline (2px), gold active states |
| `src/components/AnimatedBackground.tsx` | Moderate — warm gold blurs |
| `src/components/ReplayViewer.tsx` | Minor — recolor progress bar gradient from `#7877C6` to gold |
| `src/components/ui/StatusBadge.tsx` | Minor — new color map |
| `src/components/ui/GlowCard.tsx` | Minor — gold glow |
| `src/components/ui/NeonBadge.tsx` | Minor — change default cyan glow (`#00f0ff`) to gold |
| `src/components/ui/EmptyState.tsx` | Minor — update hardcoded text colors to use CSS token references |
| `src/contexts/ThemeContext.tsx` | Minor — remove light theme toggle (dark-only) |

## Success Criteria

1. An investor landing on the homepage immediately understands: "AI agents compete in cricket auctions"
2. The gold palette feels intentional and premium, not garish
3. Every page feels cohesive — same visual language throughout
4. Live auction page feels like mission control — dense but readable
5. Data is the star — numbers, charts, scores are prominent and beautiful
6. The site looks like nothing else in the AI/ML benchmark space
