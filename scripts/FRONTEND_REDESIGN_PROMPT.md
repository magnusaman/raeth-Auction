# Raeth.ai Frontend Redesign Specification
## Premium IPL-Themed AI Benchmarking Platform
### Complete Frontend Implementation Prompt for Next.js 16 + Tailwind CSS 4 + Framer Motion 12.35

Build a complete frontend redesign for **Raeth.ai**, an AI agent benchmarking platform themed around **IPL cricket**, with a **premium dark sports-broadcast aesthetic**, **glassmorphism surfaces**, **neon accents**, **team-color energy**, and **high-information-density dashboards** that still feel elegant and cinematic.

The result should feel like:
- **ESPN / JioCinema IPL broadcast package meets high-end AI terminal**
- dark, glossy, layered, animated
- premium, competitive, intelligent, data-rich
- sporty, energetic, and visually dramatic
- not corporate SaaS
- not generic dashboard UI
- unmistakably **cricket + live auction + AI benchmark**

Use the existing stack exactly:
- **Next.js 16 App Router**
- **React 19**
- **Tailwind CSS 4**
- **PostCSS**
- **Framer Motion 12.35**
- **Recharts 3.8**
- **Prisma + SQLite**
- **Lucide React**

Do **not** change the architecture or stack. This is a complete frontend redesign only.

---

# 1. Core Design Direction

## 1.1 Visual Identity
The entire application should feel like a **live IPL control room** fused with a **premium AI competition arena**.

Primary design principles:
- **Deep layered dark backgrounds**
- **Translucent glass panels**
- **Neon edge lighting**
- **Team-tinted gradients**
- **Data overlays like sports broadcast graphics**
- **Crisp typography with strong hierarchy**
- **Aggressive but refined motion**
- **Bright focal colors on otherwise dark interfaces**

The UI should communicate:
- real-time competition
- premium analytics
- high stakes
- sportsmanship
- intelligent strategy evaluation

## 1.2 Overall Mood
- Backgrounds should feel atmospheric, not flat
- Cards should float above the background with blur and subtle glow
- Interactive states should feel alive: hover glow, subtle tilt, pulse, shimmer
- Live events should have urgency: timers, red LIVE pulse, breaking-news style SOLD banners
- Each AI agent and each IPL team must feel distinctive through color accents and visual identity cues

---

# 2. Color System & Theme

## 2.1 Base Background Palette
Create a dark palette with stronger tonal separation than the current design.

```css
--bg-deep: #060913;
--bg-base: #0A0E17;
--bg-surface: #0F1623;
--bg-elevated: #131C2B;
--bg-card: #162133;
--bg-card-2: #1A2740;
--bg-overlay: rgba(6, 9, 19, 0.72);
--bg-glass: rgba(255, 255, 255, 0.06);
--bg-glass-strong: rgba(255, 255, 255, 0.1);
--bg-glass-dark: rgba(10, 14, 23, 0.6);
```

Use `bg-deep` for page root backgrounds.  
Use `bg-surface` and `bg-elevated` for large layout regions.  
Use `bg-card` for primary cards and `bg-card-2` for highlighted cards.

## 2.2 Text Hierarchy
Define four explicit levels:

```css
--text-primary: #F8FAFC;
--text-secondary: #CBD5E1;
--text-muted: #94A3B8;
--text-disabled: #64748B;
```

Usage:
- `text-primary`: headings, values, hero copy
- `text-secondary`: body text, labels
- `text-muted`: helper text, metadata
- `text-disabled`: inactive or unavailable states

## 2.3 Semantic Neon Accent Colors
```css
--accent-brand-start: #22D3EE;
--accent-brand-end: #A855F7;

--accent-live: #FF3040;
--accent-success: #22C55E;
--accent-warning: #F59E0B;
--accent-info: #38BDF8;
--accent-pink: #EC4899;
--accent-gold: #FDB913;
--accent-purple: #8B5CF6;
```

State mappings:
- **live**: red, pulsing
- **success**: green for won / completed / above benchmark
- **warning**: amber for pending, timer low, volatile outcomes
- **info**: cyan for analytics, neutral metric callouts
- **pink/purple**: premium highlights, compare page, animated glows
- **gold**: hero highlights, auction moments, premium rank indicators

## 2.4 IPL Team Colors
Use prominently across cards, bars, borders, gradients, badges, score strips, and selection states.

```css
--team-csk: #FDB913;
--team-mi: #004BA0;
--team-rcb: #EC1C24;
--team-kkr: #3A225D;
--team-srh: #FF822A;
--team-rr: #EA1A85;
--team-dc: #004C93;
--team-pbks: #DD1F2D;
--team-gt: #1C1C2B;
--team-lsg: #A72056;
```

### Team tint logic
Each team color should appear in:
- left border accent on cards
- glow ring on hover
- subtle glass tint in background
- team-colored badge/pill
- progress bars / purse bars
- chart series if team-specific
- scoreboard strips
- selected state outlines
- header underline gradients

### Team gradient definitions
Create subtle premium gradients, not flat fills:

```css
--gradient-csk: linear-gradient(135deg, rgba(253,185,19,0.28) 0%, rgba(253,185,19,0.06) 100%);
--gradient-mi: linear-gradient(135deg, rgba(0,75,160,0.32) 0%, rgba(56,189,248,0.08) 100%);
--gradient-rcb: linear-gradient(135deg, rgba(236,28,36,0.3) 0%, rgba(255,90,95,0.08) 100%);
--gradient-kkr: linear-gradient(135deg, rgba(58,34,93,0.38) 0%, rgba(168,85,247,0.1) 100%);
--gradient-srh: linear-gradient(135deg, rgba(255,130,42,0.3) 0%, rgba(251,146,60,0.08) 100%);
--gradient-rr: linear-gradient(135deg, rgba(234,26,133,0.3) 0%, rgba(236,72,153,0.08) 100%);
--gradient-dc: linear-gradient(135deg, rgba(0,76,147,0.32) 0%, rgba(59,130,246,0.08) 100%);
--gradient-pbks: linear-gradient(135deg, rgba(221,31,45,0.3) 0%, rgba(248,113,113,0.08) 100%);
--gradient-gt: linear-gradient(135deg, rgba(28,28,43,0.45) 0%, rgba(71,85,105,0.1) 100%);
--gradient-lsg: linear-gradient(135deg, rgba(167,32,86,0.32) 0%, rgba(244,63,94,0.08) 100%);
```

## 2.5 Brand Gradients
Use throughout hero sections, section dividers, chart highlights, CTA buttons:

```css
--gradient-brand: linear-gradient(135deg, #22D3EE 0%, #3B82F6 35%, #8B5CF6 70%, #EC4899 100%);
--gradient-brand-soft: linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(139,92,246,0.12) 50%, rgba(236,72,153,0.16) 100%);
--gradient-gold-live: linear-gradient(135deg, #FDB913 0%, #F59E0B 50%, #FFEDD5 100%);
--gradient-live-alert: linear-gradient(90deg, #FF3040 0%, #F97316 100%);
```

## 2.6 Surface Interaction Colors
Hover/active/selected states:
```css
--surface-hover: rgba(255,255,255,0.08);
--surface-active: rgba(255,255,255,0.12);
--surface-selected: rgba(56,189,248,0.14);
--surface-border: rgba(255,255,255,0.10);
--surface-border-soft: rgba(255,255,255,0.06);
```

---

# 3. Glassmorphism System

Implement a reusable glass design language with utility classes and component tokens.

## 3.1 Core Glass Classes

### `.glass`
Base card surface for most panels:
```css
background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
backdrop-filter: blur(18px) saturate(160%);
-webkit-backdrop-filter: blur(18px) saturate(160%);
border: 1px solid rgba(255,255,255,0.10);
box-shadow:
  0 8px 32px rgba(0,0,0,0.32),
  inset 0 1px 0 rgba(255,255,255,0.08);
```

### `.glass-hover`
Applied to interactive cards:
```css
transition: transform 220ms cubic-bezier(0.22,1,0.36,1),
            box-shadow 220ms cubic-bezier(0.22,1,0.36,1),
            border-color 220ms ease,
            background 220ms ease;
```

Hover:
```css
transform: translateY(-2px);
border-color: rgba(255,255,255,0.18);
box-shadow:
  0 12px 40px rgba(0,0,0,0.42),
  0 0 0 1px rgba(255,255,255,0.06) inset,
  0 0 24px rgba(34,211,238,0.10);
background: linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%);
```

### `.glass-dark`
For heavy overlays and modal surfaces:
```css
background: linear-gradient(180deg, rgba(15,22,35,0.82) 0%, rgba(10,14,23,0.72) 100%);
backdrop-filter: blur(24px) saturate(140%);
border: 1px solid rgba(255,255,255,0.08);
box-shadow:
  0 20px 60px rgba(0,0,0,0.55),
  inset 0 1px 0 rgba(255,255,255,0.05);
```

### `.glass-team`
A team-tinted glass panel. This should accept CSS vars:
```css
background:
  linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%),
  radial-gradient(circle at top left, color-mix(in srgb, var(--team-color) 22%, transparent) 0%, transparent 55%);
border: 1px solid color-mix(in srgb, var(--team-color) 30%, rgba(255,255,255,0.08));
box-shadow:
  0 8px 32px rgba(0,0,0,0.32),
  0 0 24px color-mix(in srgb, var(--team-color) 16%, transparent),
  inset 0 1px 0 rgba(255,255,255,0.06);
```

## 3.2 Blur Scale Utilities
Implement utilities:
- `.blur-glass-sm` = `backdrop-filter: blur(8px) saturate(140%)`
- `.blur-glass-md` = `backdrop-filter: blur(14px) saturate(150%)`
- `.blur-glass-lg` = `backdrop-filter: blur(20px) saturate(160%)`
- `.blur-glass-xl` = `backdrop-filter: blur(28px) saturate(180%)`

## 3.3 Border Treatments
### Standard border
`border: 1px solid rgba(255,255,255,0.10)`

### Soft border
`border: 1px solid rgba(255,255,255,0.05)`

### Gradient border
Use wrapper with `padding: 1px` and inner glass card:
```css
background: linear-gradient(135deg, rgba(34,211,238,0.35), rgba(168,85,247,0.18), rgba(236,72,153,0.35));
border-radius: inherit;
```

### Team gradient border
```css
background: linear-gradient(135deg, color-mix(in srgb, var(--team-color) 80%, white 10%), transparent 65%);
```

## 3.4 Neon Border Animation
Implement `.neon-border` using pseudo-element.

```css
position: relative;
isolation: isolate;
```

Pseudo-element:
```css
content: "";
position: absolute;
inset: -1px;
border-radius: inherit;
padding: 1px;
background: linear-gradient(120deg, rgba(34,211,238,0.0), rgba(34,211,238,0.9), rgba(168,85,247,0.9), rgba(236,72,153,0.0));
-webkit-mask:
  linear-gradient(#000 0 0) content-box,
  linear-gradient(#000 0 0);
-webkit-mask-composite: xor;
mask-composite: exclude;
animation: neon-border-shift 3.4s linear infinite;
opacity: 0.85;
pointer-events: none;
```

Keyframes:
```css
@keyframes neon-border-shift {
  0% { background-position: 0% 50%; filter: hue-rotate(0deg); }
  50% { background-position: 100% 50%; filter: hue-rotate(12deg); }
  100% { background-position: 0% 50%; filter: hue-rotate(0deg); }
}
```

## 3.5 Glow Shadow System
Implement these utility classes:

```css
.glow-sm { box-shadow: 0 0 12px rgba(255,255,255,0.08), 0 0 24px rgba(34,211,238,0.06); }
.glow { box-shadow: 0 0 18px rgba(34,211,238,0.12), 0 0 42px rgba(34,211,238,0.08); }
.glow-lg { box-shadow: 0 0 24px rgba(34,211,238,0.18), 0 0 64px rgba(34,211,238,0.12); }
.glow-cyan { box-shadow: 0 0 18px rgba(34,211,238,0.22), 0 0 52px rgba(34,211,238,0.12); }
.glow-pink { box-shadow: 0 0 18px rgba(236,72,153,0.22), 0 0 52px rgba(236,72,153,0.12); }
.glow-gold { box-shadow: 0 0 18px rgba(253,185,19,0.24), 0 0 56px rgba(253,185,19,0.14); }
.glow-live { box-shadow: 0 0 18px rgba(255,48,64,0.26), 0 0 56px rgba(255,48,64,0.16); }
```

## 3.6 Glass + Team Interaction
Whenever a team-specific card is rendered:
- apply a subtle top-left radial tint using team color at 18–24% opacity
- add a 3px left accent bar in the team color
- on hover, team color glow increases to 20% blur
- selected state gets 1px outer ring in team color at 45% opacity
- use team color for progress bars and badges, but keep text readable against dark surfaces

---

# 4. Typography

## 4.1 Fonts
Use:
- **Inter** for all headings, body, labels, buttons
- **JetBrains Mono** for numbers, currencies, stats, timers, tables, scoreboard figures, over-by-over style metrics

## 4.2 Type Scale
Use these exact values:

```css
--text-xs: 12px; line-height: 16px;
--text-sm: 14px; line-height: 20px;
--text-base: 16px; line-height: 24px;
--text-lg: 18px; line-height: 28px;
--text-xl: 20px; line-height: 28px;
--text-2xl: 24px; line-height: 32px;
--text-3xl: 30px; line-height: 38px;
--text-4xl: 36px; line-height: 44px;
--text-5xl: 48px; line-height: 56px;
--text-6xl: 60px; line-height: 68px;
```

## 4.3 Weight Hierarchy
- 500: labels, pills
- 600: subheads, stat labels
- 700: cards, section titles
- 800: hero titles
- 900: auction moment banners, winner announcements

## 4.4 Mono Usage
JetBrains Mono should be used for:
- player price values (`₹12.50 Cr`)
- purse remaining
- countdown timer
- scores and overs
- match IDs / season identifiers
- Brier score / accuracy metrics
- rank deltas
- stat table values
- scrolling ticker

## 4.5 Text Gradients
### Hero title gradient
```css
background: linear-gradient(135deg, #FFFFFF 0%, #CFFAFE 35%, #C4B5FD 70%, #FBCFE8 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

### Metric highlight gradient
```css
background: linear-gradient(135deg, #22D3EE 0%, #A855F7 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

### Winner / champion gradient
```css
background: linear-gradient(135deg, #FFF7CC 0%, #FDB913 45%, #F59E0B 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

# 5. Spacing, Radius, Layout Rhythm

## 5.1 Spacing Scale
Use a consistent 4px base:
- 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120

## 5.2 Radius System
- `rounded-sm`: 10px
- `rounded-md`: 14px
- `rounded-lg`: 18px
- `rounded-xl`: 24px
- `rounded-2xl`: 32px
- pill: 999px

Main cards should feel premium: default to **18px or 24px** radius.

## 5.3 Max Widths
- global page content max width: `1440px`
- hero content max width: `1280px`
- reading content (About): `860px`
- charts: allow full width in dashboard containers

---

# 6. Animation System

## 6.1 Global CSS Keyframes
Implement all of the following.

### Float
```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```

### Pulse live
```css
@keyframes pulse-live {
  0% { transform: scale(1); opacity: 0.85; box-shadow: 0 0 0 0 rgba(255,48,64,0.45); }
  70% { transform: scale(1.08); opacity: 1; box-shadow: 0 0 0 10px rgba(255,48,64,0); }
  100% { transform: scale(1); opacity: 0.85; box-shadow: 0 0 0 0 rgba(255,48,64,0); }
}
```

### Shimmer
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Gradient drift
```css
@keyframes gradient-drift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### Particle rise
```css
@keyframes particle-rise {
  0% { transform: translate3d(0, 24px, 0) scale(0.8); opacity: 0; }
  20% { opacity: 0.45; }
  80% { opacity: 0.2; }
  100% { transform: translate3d(0, -120px, 0) scale(1.15); opacity: 0; }
}
```

### Light streak sweep
```css
@keyframes light-streak {
  0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
  20% { opacity: 0.18; }
  50% { opacity: 0.28; }
  100% { transform: translateX(120%) skewX(-18deg); opacity: 0; }
}
```

### Timer warning pulse
```css
@keyframes timer-warning {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(245,158,11,0)); }
  50% { transform: scale(1.04); filter: drop-shadow(0 0 12px rgba(245,158,11,0.35)); }
}
```

### Sold flash
```css
@keyframes sold-flash {
  0% { opacity: 0; transform: scale(0.96); }
  20% { opacity: 1; transform: scale(1.02); }
  100% { opacity: 0; transform: scale(1.08); }
}
```

### Unsold fade
```css
@keyframes unsold-fade {
  0% { opacity: 0; filter: blur(16px); }
  20% { opacity: 1; filter: blur(0); }
  100% { opacity: 0; filter: blur(6px); }
}
```

### Ticker scroll
```css
@keyframes ticker-scroll {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}
```

### Purse drain
```css
@keyframes purse-drain {
  0% { transform: scaleX(1); filter: brightness(1); }
  50% { filter: brightness(1.2); }
  100% { transform: scaleX(var(--target-scale)); filter: brightness(0.96); }
}
```

## 6.2 Framer Motion Patterns

### Standard springs
Use these exact configs.

#### Bouncy buttons
```ts
{
  type: "spring",
  stiffness: 420,
  damping: 24,
  mass: 0.7
}
```

#### Smooth panels
```ts
{
  type: "spring",
  stiffness: 180,
  damping: 22,
  mass: 0.95
}
```

#### Snappy modals
```ts
{
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.85
}
```

#### Gentle page transitions
```ts
{
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1]
}
```

## 6.3 Motion Variants

### Fade up
```ts
hidden: { opacity: 0, y: 18, filter: "blur(8px)" }
show: {
  opacity: 1,
  y: 0,
  filter: "blur(0px)",
  transition: { duration: 0.5, ease: [0.22,1,0.36,1] }
}
```

### Card hover
```ts
rest: { y: 0, scale: 1, rotateX: 0, rotateY: 0 }
hover: {
  y: -4,
  scale: 1.01,
  transition: { type: "spring", stiffness: 320, damping: 22 }
}
```

### Modal
```ts
initial: { opacity: 0, y: 20, scale: 0.96, filter: "blur(8px)" }
animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: snappyModal }
exit: { opacity: 0, y: 10, scale: 0.98, filter: "blur(6px)", transition: { duration: 0.2 } }
```

### Page transition
```ts
initial: { opacity: 0, y: 12 }
animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22,1,0.36,1] } }
exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeInOut" } }
```

### Stagger container
```ts
show: {
  transition: {
    staggerChildren: 0.06,
    delayChildren: 0.04
  }
}
```

### Number counter pattern
Animate numeric values from previous to next over `0.8s` with easeOut.  
Use mono font.  
Apply brief glow when value changes upward:
- green glow for positive
- red glow for budget drain
- cyan glow for metric increase

## 6.4 Auction-Specific Motion
### Bid entry
Each incoming bid in bid feed:
- enters from right `x: 28`
- opacity 0 → 1
- scale 0.98 → 1
- blur 6px → 0
- duration `0.32s`
- newest bid briefly glows with team color for `1.2s`

### SOLD event
On sale completion:
1. center overlay flashes gold-white radial burst
2. SOLD banner slams in from top with spring
3. winning team color floods behind player card subtly
4. confetti particles emit for 1.8s
5. winning bid value scales from 1.0 → 1.18 → 1.0
6. team panel purse bar drains with animated reduction
7. bid history winning row gets permanent gold outline

### UNSOLD event
- center hero desaturates to 70%
- UNSOLD banner fades in with neutral steel/cool gray
- timer disappears with fade
- player card scales down 0.98 and fades
- no confetti, only soft dust/particle fade

### Timer states
- >10s normal cyan ring
- 6–10s amber ring with subtle pulse
- <=5s red ring with pulse-live animation and audible-style visual urgency
- last 3s should pulse once per second stronger using scale 1.06

## 6.5 Micro-interactions
- buttons scale to `0.98` on tap
- cards get top-edge highlight sweep on hover
- clickable rows highlight with `rgba(255,255,255,0.04)`
- tooltips fade/scale in over 140ms
- inputs glow cyan on focus
- tabs animate active-pill background with layout transition
- toasts slide in from top-right on desktop, bottom on mobile
- all interactive focus states must include a visible 2px ring:
  `0 0 0 2px rgba(34,211,238,0.45)`

---

# 7. Background System

Create a shared **AnimatedBackground** component used across the app, configurable by page.

## 7.1 Base Layer
Full-screen fixed background:
- root color `#060913`
- radial vignette from edges to center
- subtle deep blue to purple atmospheric gradient

```css
background:
  radial-gradient(circle at 20% 20%, rgba(34,211,238,0.10) 0%, transparent 30%),
  radial-gradient(circle at 80% 15%, rgba(168,85,247,0.10) 0%, transparent 32%),
  radial-gradient(circle at 50% 80%, rgba(236,72,153,0.08) 0%, transparent 36%),
  linear-gradient(180deg, #060913 0%, #0A0E17 40%, #0B1120 100%);
```

## 7.2 Floating Gradient Blobs
Render 5–7 large blurred blobs:
- size between 220px and 460px
- blur radius 80px to 140px
- opacity 0.10 to 0.18
- animate position slowly over 16–28s infinite alternate
- use team-specific colors per page

Examples:
- auction page: gold, red, cyan, purple
- tournament pages: team-color rotation
- compare page: cyan, purple, pink
- about page: softer cyan-blue only

## 7.3 Particle System
Render 50–70 particles:
- sizes 2px to 6px
- soft white, cyan, pink, amber
- absolute positioned
- rise slowly using `particle-rise`
- random stagger 0 to 8s
- durations 6s to 14s
- opacity low, never distracting
- use CSS transforms only

## 7.4 Light Streaks
Add 3 horizontal/diagonal streaks:
- width 30% to 50vw
- height 1px to 2px
- blur 8px
- gradient white → transparent
- animate sweep every 8–14s
- low opacity
- more intense on hero and auction pages

## 7.5 Grid/Dot Overlay
Apply a subtle grid overlay:
```css
background-image:
  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
background-size: 32px 32px;
mask-image: radial-gradient(circle at center, black 35%, transparent 95%);
opacity: 0.4;
```

Also allow a dotted variation on analytics-heavy pages:
```css
background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
background-size: 18px 18px;
```

## 7.6 Corner Radial Glows
- top-left: cyan glow
- top-right: purple or team tint
- bottom-left: pink or amber
- bottom-right: low-opacity blue

Keep each below 0.14 opacity.

## 7.7 Noise Texture
Add a subtle noise layer:
- 2–3% opacity
- mix-blend overlay or soft-light
- should reduce flatness and give broadcast/poster polish

## 7.8 Page-Specific Background Tuning
### Home
Balanced brand gradient with gold hint.

### Auction Live
More dramatic: gold + red + cyan + team-specific active bidder tint.

### Results
Victory-focused: gold + purple + cyan.

### Tournaments
Blue + team-cycle colors.

### Compare
Cyan + pink + purple, analytical and sharp.

### About
Muted blue/cyan minimal movement.

---

# 8. Sports Broadcast Aesthetic

This is critical. The UI should borrow visual cues from live sports TV overlays.

## 8.1 Broadcast UI Elements
Include:
- top mini score-strip style metadata bars
- segmented panels with labels like `LIVE AUCTION`, `CURRENT LOT`, `PURSE`, `SIMULATION`, `AGENT FORM`
- ticker tape scrolling updates
- compact metric chips that resemble scorebug graphics
- corner labels and slanted accent cuts on banners
- breaking-news style SOLD overlays
- subtle “on-air” energy

## 8.2 LIVE Indicator
Reusable component:
- 8px red dot
- pulse-live animation
- uppercase `LIVE`
- mono timestamp or `Round 38 / Lot 52`
- dark pill background with red border tint

## 8.3 Ticker Tape
A horizontally scrolling ticker for:
- recent sold players
- highest bid
- tournament upsets
- benchmark updates
- season sim summaries

Style:
- 40px height
- glass-dark strip
- top and bottom borders white/6
- left fixed label `RAETH FEED`
- scrolling mono text in muted white with highlighted values in gold/cyan/red

## 8.4 Scorecard / Overlay Language
Metrics should look like scorecards:
- `AVG`, `SR`, `WKTS`, `ECO`, `ACC`, `BRIER`, `UPSET%`
- use compact uppercase labels
- values in mono
- place in segmented pills or mini cards
- use vertical separators like broadcast stat boxes

## 8.5 Breaking News SOLD Banner
When SOLD:
- full-width or centered top overlay
- slanted ribbon ends
- gradient gold/red or gold/team color
- bold uppercase `SOLD TO GPT XI FOR ₹18.25 CR`
- subline: player role + strategy tag
- animate slam-in with slight shake settle

---

# 9. Component Library

Define and implement all components below with exact behavior.

---

## 9.1 Layout Components

### PageContainer
Purpose: top-level constrained layout wrapper

Props:
- `children`
- `maxWidth?: "default" | "wide" | "full"`
- `padding?: "sm" | "md" | "lg"`
- `withBackground?: boolean`

Behavior:
- default max width `1440px`
- horizontal padding:
  - mobile `16px`
  - tablet `24px`
  - desktop `32px`
  - xl `40px`
- vertical spacing between sections `48px mobile / 64px desktop`

### Section
Props:
- `title?`
- `subtitle?`
- `action?`
- `eyebrow?`
- `children`

Structure:
- eyebrow uppercase mono small
- title large bold
- subtitle secondary text max width 720px
- top margin 48px
- bottom spacing 24px

### GlassPanel
Props:
- `variant?: "default" | "dark" | "team" | "highlight"`
- `teamColor?: string`
- `glow?: "none" | "cyan" | "pink" | "gold" | "team"`
- `interactive?: boolean`
- `padding?: "sm" | "md" | "lg"`

Padding:
- sm: 16px
- md: 20px
- lg: 24px

### SplitLayout
For auction page.

Desktop:
- 3 columns = `320px 1fr 360px`
- gap `24px`

Large desktop (`min 1536px`):
- `360px 1fr 400px`

Tablet:
- collapse to `1fr`
- order: current lot, teams, bid feed

Sticky behavior:
- left and right sidebars sticky top `88px`
- center flows normally

---

## 9.2 Data Display Components

### PlayerCard
Purpose: display player identity and cricket stats

Props:
- `player`
- `variant?: "compact" | "default" | "featured"`
- `showPrice?: boolean`
- `price?`
- `teamColor?`
- `status?: "available" | "sold" | "unsold"`
- `tag?: "trap" | "sleeper" | "value" | "premium" | null`

Content:
- player name
- role badge (`BAT`, `BOWL`, `AR`, `WK`)
- nationality chip
- age optional
- stat rows:
  - batting average
  - strike rate
  - wickets
  - economy
- base price
- final sold price if applicable
- left accent bar team color
- optional strategic tag chip

Featured variant:
- larger player name
- 2-column stat grid
- gradient halo behind top-right
- more padding `24px`
- animated background streak

Status handling:
- sold: green/gold accent and stamped `SOLD`
- unsold: desaturated text and gray chip
- available: neutral

### TeamBadge
Props:
- `teamCode`
- `teamName`
- `color`
- `size?: "sm" | "md" | "lg"`
- `showDot?: boolean`

Should render:
- circular or shield-like icon placeholder with team initials
- team-colored border
- tinted glass background
- mono uppercase code

### MatchCard
Props:
- `match`
- `prediction?`
- `result?`
- `variant?: "default" | "compact" | "featured"`

Content:
- season + match no
- team vs team
- venue
- actual scores
- winning margin
- agent predictions
- prediction confidence
- outcome badge

Featured version:
- larger team logos/initials
- prediction bar
- upset badge if applicable

### StatCard
Props:
- `label`
- `value`
- `delta?`
- `icon?`
- `accent?: "cyan" | "gold" | "green" | "red" | "team"`
- `teamColor?`
- `trend?: "up" | "down" | "neutral"`

Style:
- compact header row
- large mono value
- small delta chip
- hover glow if clickable

### PointsTable
Props:
- `rows`
- `highlightTeams?`
- `dense?: boolean`

Columns:
- rank
- team
- played
- won
- lost
- nrr
- points

Style:
- glass panel
- alternating row surface subtle
- sticky header
- team color line at row start
- rank badge circles

### LeaderboardRow
Props:
- `agent`
- `rank`
- `metrics`
- `isExpanded?`

Use:
- rank pill
- agent logo/initial
- main score
- submetrics inline
- trend arrow
- optional expanded detail

### CricketStatRow
Props:
- `label`
- `value`
- `icon?`
- `accent?`

Visual:
- broadcast stat strip style
- right aligned mono value
- thin divider
- tiny icon

---

## 9.3 Auction Components

### CurrentLotHero
Star component of live auction page.

Props:
- `player`
- `currentBid`
- `basePrice`
- `currentTeam`
- `timeRemaining`
- `bidCount`
- `lotNumber`
- `status`
- `onBid?`

Structure:
1. top metadata strip:
   - live indicator
   - lot number
   - role
   - base price
2. huge central player name
3. role + nationality + strategy tags
4. stats grid 2x2 or 4x1 depending width
5. current bid giant mono price
6. circular timer + bid count
7. active bidder team badge
8. CTA region if interactive
9. animated gradient halo behind card

Visual rules:
- card min height desktop `540px`
- center content vertically
- player name 40–56px
- current bid in mono 48px desktop, 32px mobile
- current bid uses gold gradient if sold, live cyan/white if active
- timer ring top-right on desktop, inline on mobile

### LiveBidCard
Props:
- `team`
- `amount`
- `timestamp`
- `isWinning?`
- `agent`
- `index`

Visual:
- compact card in bid feed
- left team color strip 4px
- amount in mono
- timestamp tiny muted
- winning state with gold/cyan border and crown icon
- enters animated from right

### SoldBanner
Props:
- `playerName`
- `teamName`
- `price`
- `teamColor`
- `visible`

Layout:
- fixed overlay
- centered or top-center
- slanted broadcast banner
- giant `SOLD`
- subline with team and price
- confetti layer
- short visible duration 2.2s

### UnsoldBanner
Same structure but steel gray/cool desaturated palette.
Text: `UNSOLD`.

### PurseBar
Props:
- `total`
- `remaining`
- `spent`
- `teamColor`
- `animate?: boolean`

Visual:
- segmented or smooth bar
- background track `rgba(255,255,255,0.06)`
- fill uses team gradient
- value labels: `₹100.00 Cr` total, `₹28.75 Cr left`
- remaining percentage chip
- animate drain on updates using transform scaleX

### BidHistory
Props:
- `bids`
- `dense?`

Behavior:
- newest first
- max height with internal scroll
- subtle custom scrollbar
- winning bid pinned or highlighted at top after sale complete

### TeamPanel
Props:
- `team`
- `playersBought`
- `remainingPurse`
- `maxPlayers`
- `currentBidder?`
- `isWinning?`
- `isEliminated?`

Contains:
- team badge
- purse bar
- squad count
- top buys chips
- current bidder pulse
- if active, animated outline in team color
- if purse too low, warning indicator

### AuctionTimer
Props:
- `timeRemaining`
- `totalTime`
- `status`

Use circular progress ring:
- diameter 88px desktop / 72px mobile
- stroke width 8
- background stroke white/8
- progress stroke cyan / amber / red depending state
- number center mono bold

### LotProgress
Props:
- `current`
- `total`

Visual:
- segmented progress line with completed glow
- label `LOT 52 / 80`
- compact and broadcast-like

---

## 9.4 Tournament Components

### PredictionCard
Props:
- `match`
- `predictions`
- `result`
- `highlightAgent?`

Contains:
- teams
- venue
- confidence %
- chosen winner
- actual result
- accuracy badge
- upset badge
- expandable analytics row

### AccuracyMeter
Props:
- `value`
- `max`
- `label`
- `variant?: "ring" | "bar"`

For ring:
- glowing radial progress
- value centered in mono
- green if >70, amber 50-70, red <50

### SeasonSelector
Props:
- `seasons`
- `activeSeason`
- `onChange`

Style:
- pill tab group
- glass container
- active pill with gradient fill and layout animation

### BrierScoreBar
Props:
- `score`
- `benchmark?`

Low is better.
Use reversed visual scale:
- excellent <0.18 green
- decent 0.18–0.24 cyan
- weak 0.24–0.32 amber
- poor >0.32 red

---

## 9.5 Chart Components (Recharts Theming)

All charts must match the dark neon IPL aesthetic.

### Shared chart rules
- chart container inside glass panel
- panel padding `20px`
- background transparent
- grid lines `rgba(255,255,255,0.06)`
- axis text `#94A3B8`, size 12
- tooltip custom glass-dark card
- legend pills tinted by series color
- use soft glow on active dots/areas

### RadarChart
For grader scores and multi-metric comparisons.

Style:
- radar grid stroke `rgba(255,255,255,0.08)`
- axis labels 12px
- fill opacity 0.18
- stroke width 2.5
- add outer glow filter via SVG
- one series per agent with team-like or brand colors

Agent colors:
- Claude: `#F59E0B`
- GPT: `#22D3EE`
- Gemini: `#8B5CF6`
- DeepSeek: `#EC4899`

### BarChart
Use rounded top corners.
- bar radius `[8, 8, 0, 0]`
- background grid subtle
- animated entry 500ms stagger
- active bar glow shadow using SVG filter

### LineChart
For accuracy over matches/seasons.
- stroke width `3`
- dots `r=4`
- active dots `r=6`
- area fill optional gradient 0.12 opacity
- smooth monotone line
- hover crosshair subtle cyan

---

## 9.6 UI Primitives

### Button
Variants:
- `primary`
- `secondary`
- `danger`
- `ghost`
- `team`
- `live`

Sizes:
- `sm` = h-9 px-4 text-sm
- `md` = h-11 px-5 text-sm
- `lg` = h-12 px-6 text-base

#### Primary
- gradient brand background
- text white
- shadow cyan/purple
- hover brighter + translateY(-1px)

#### Secondary
- glass background
- white/10 border
- hover white/16

#### Danger
- red gradient
- red glow

#### Ghost
- transparent
- hover white/6

#### Team
- accepts `teamColor`
- background: color-mix(teamColor 18%, transparent)
- border: teamColor 35%
- hover glow teamColor

#### Live
- red gradient, pulse-live indicator optional

All buttons:
- border radius 14px
- font 600
- motion tap scale 0.98
- disabled state opacity 0.5 and no glow

### Badge / Pill
Variants:
- neutral
- live
- success
- warning
- info
- team
- premium

Height 24–28px.  
Uppercase small labels.  
Use mono for numeric chips.

### Modal
- backdrop: rgba(6,9,19,0.72) + blur 6px
- panel max width:
  - sm 420px
  - md 560px
  - lg 720px
- glass-dark panel
- enters with snappy modal spring
- close button top-right circular ghost

### Tabs
- glass container
- active tab slides with shared layout animation
- inactive text muted
- active text white
- active bg can be brand gradient at low opacity

### Select / Dropdown
- glass trigger
- chevron icon
- popup list glass-dark
- selected option with cyan left bar

### Input
- bg `rgba(255,255,255,0.04)`
- border `rgba(255,255,255,0.08)`
- focus border `rgba(34,211,238,0.55)`
- focus glow 0 0 0 4px rgba(34,211,238,0.12)
- placeholder muted

### Tooltip
- dark glass
- 12px text
- 10px 12px padding
- arrow optional
- fade/scale in

### Skeleton / Shimmer
- rounded shapes
- gradient from white/4 → white/10 → white/4
- background-size 200% 100%
- shimmer 1.4s linear infinite

### EmptyState
- icon in glowing circle
- title + helper text
- CTA button
- maybe faint cricket pitch illustration/grid

### Toast
- glass-dark compact panel
- icon left
- title + subtitle
- success green stripe, error red, info cyan

---

# 10. Page-by-Page Design Specification

---

## 10.1 Home Page `/`

### Goal
Introduce Raeth.ai as an elite AI competition platform, immediately explain the two benchmarks, showcase current/recent action, and make the user want to enter the live auction or tournament analytics.

### Layout
1. Navbar
2. Hero section
3. Live ticker
4. Benchmark feature cards (AuctionBench + TourBench)
5. Platform stats row
6. Recent auctions / replays
7. Tournament snapshot
8. How it works
9. CTA footer section

### Hero
Structure:
- left: headline, subcopy, CTA buttons
- right: layered visual dashboard mock with floating stat cards and glowing cricket-auction panel

Headline:
- 2 lines max on desktop
- gradient text on key phrase: `Benchmark AI Agents Like IPL Franchises and Analysts`
- title size `56px` desktop, `40px` tablet, `32px` mobile

Subcopy:
- max width `620px`
- explain AuctionBench and TourBench in 2 concise sentences

Buttons:
- `View Live Auction`
- `Explore Tournaments`
- tertiary text link `Read methodology`

Visual right side:
- stacked glass cards with:
  - current lot price
  - agent leaderboard
  - accuracy meter
  - purse bar
- floating motion with independent delays

Hero background:
- more pronounced blobs and streaks
- gold + cyan + purple

### Benchmark Cards
Two large side-by-side cards on desktop, stacked on mobile.

#### AuctionBench Card
- dramatic gold/red/cyan tint
- mini live auction mock layout
- bullets:
  - 4 AI agents
  - 80 real IPL players
  - 100 Cr purse
  - live bidding + season simulation
- CTA `Watch Auction`

#### TourBench Card
- blue/purple/pink tint
- mini match prediction scoreboard
- bullets:
  - 74 real IPL matches
  - 10 teams
  - accuracy, Brier, upset detection, calibration
- CTA `Open TourBench`

### Platform Stats Row
4 cards:
- Auctions Run
- Players Auctioned
- Matches Evaluated
- Best Agent Accuracy

Use StatCards with count-up animation when in viewport.

### Recent Auctions
Card grid of 3–6 replay cards:
- winner badge
- top buy
- total spend
- season sim result
- replay CTA

### Tournament Snapshot
Glass panel with:
- active season selector
- leaderboard preview
- upcoming/highlighted match
- CTA to tournament detail

### Loading State
- shimmer skeleton hero cards
- ticker placeholder
- benchmark card shimmer blocks

### Empty States
If no recent auctions:
- “No completed auctions yet”
- CTA `Start first benchmark`

---

## 10.2 Auction Live Page `/auction/[id]`
This is the flagship page. Make it unforgettable.

### Core Layout
Desktop:
- left sidebar `Team Panels`
- center `Current Lot Hero`
- right sidebar `Live Bid Feed + metadata`

Grid:
`320px 1fr 360px`

Page sections:
- top broadcast strip
- main 3-column layout
- bottom row with lot progress, player pool summary, recent sold summary

### Top Broadcast Strip
Sticky below navbar.
Contains:
- LIVE pill
- auction name / season
- lot progress
- total purse spent
- highest bid
- current active franchises count
- ticker updates

Height: `52px`
Surface: glass-dark with bottom border white/8

### Left Sidebar: Team Panels
Render 4 agent team panels vertically with 16px gap.
Each panel contains:
- agent name/logo: Claude, GPT, Gemini, DeepSeek
- team-inspired visual identity color
- purse bar
- players bought `12/18`
- current highest buy
- role distribution mini chips
- if active bidder: pulsing outline and small `BIDDING` badge
- if won current lot: gold edge shimmer

Agent color mapping:
- Claude = gold/amber
- GPT = cyan/blue
- Gemini = purple
- DeepSeek = pink/red

Each panel min height `150px`.

### Center: Current Lot Hero
Massive centerpiece.
Contains:
- player name, role, nationality
- current bid huge
- base price smaller
- timer ring
- key IPL stats in segmented cards
- trend tags like `Powerplay Specialist`, `Death Overs`, `Anchor`, `Spin Threat`
- current highest bidder
- background halo and animated edge streak
- if sold, transform into result state with winning team flood tint

Add a lower information strip:
- recent competing bids
- bid count
- valuation indicator: `+42% above base`
- sleeper/trap tag if available

### Right Sidebar
Top card: latest bid / current status  
Below: scrollable bid history  
Below that: auction metadata card
- sold count
- unsold count
- average inflation multiplier
- remaining player pool by role

### Sold / Unsold Full Screen Overlay
On event:
- dim entire page
- focus banner center/top-center
- player card behind scales slightly
- overlay disappears after 2.2s unless manually dismissed

### Bottom Supplemental Row
Below main layout:
- Player Pool Summary by role
- Recent Sold Carousel
- Auction transcript snippet

### Responsive
#### Tablet
Stack:
1. CurrentLotHero
2. horizontally scrollable TeamPanels
3. Bid feed

#### Mobile
- fixed top mini strip
- CurrentLotHero first
- swipeable team cards carousel
- collapsible bid feed drawer
- floating quick nav chips: `Lot`, `Teams`, `Bids`
- timer remains visible near top at all times
- bottom sticky action/ticker strip

### Loading State
- animated skeleton for hero
- placeholder team panels
- bid history skeleton rows
- timer ghost ring

### Error State
- centered glass panel
- title `Auction unavailable`
- reason text
- retry and back buttons

---

## 10.3 Results Page `/results/[id]`

### Goal
Present post-auction outcomes with analytical depth and celebration.

### Structure
1. Winner hero banner
2. Squad comparison grid
3. Grader score charts
4. Season simulation results
5. Spending efficiency section
6. Transcript / decision log

### Winner Hero Banner
Huge glass-dark hero with gold gradient highlights.
Contains:
- `Champion Squad`
- winner agent name
- total projected points
- final purse left
- best value pick
- hero stat chips
- confetti residue / celebratory glow
- CTA to compare winner vs others

### Squad Comparison
4 side-by-side cards desktop, 2x2 tablet, stack mobile.
Each:
- agent name
- purse spent
- squad composition
- top 3 buys
- role balance bars
- average player value metric
- mini radar sparkline or compact stat strip

### Grader Scores
Use RadarChart + BarChart.
Metrics:
- strategy
- value extraction
- role balance
- risk management
- XI fit
- ceiling
- depth
- adaptability
- price discipline
- auction timing

Include average + variance.

### Season Simulation
Large panel:
- projected points table
- win probabilities
- top-performing picks
- expected XI strength
- scenario tabs: `Average`, `High Variance`, `Playoff Pressure`

### Spending Efficiency
Cards:
- inflation paid
- bargains secured
- stars acquired
- depth index

### Transcript
Collapsible chronological feed:
- lot number
- bid sequence summary
- strategy notes
- final sale result

### Empty / Missing Data Handling
If graders or season sim unavailable:
- show partial results with “Analysis pending”
- skeleton placeholders or empty panels with helper text

---

## 10.4 Tournaments Page `/tournaments`

### Goal
Browse/create TourBench tournaments with premium competition cards.

### Layout
1. Page header with title and season filters
2. Tournament stats strip
3. Grid of tournament cards
4. Creation modal / CTA

### Header
- title `TourBench Tournaments`
- subtitle
- create tournament button
- season selector pill group

### Tournament Cards
Each card includes:
- tournament title
- season label `S1–S4`
- match count
- top agent
- current leader metric
- completion status ring
- mini line chart sparkline
- CTA `Open Tournament`

Cards should be 3-column desktop, 2-column tablet, 1-column mobile.

### Create Tournament Modal
Fields:
- name
- season
- benchmark settings
- confirmation

Modal styling:
- glass-dark
- segmented form sections
- explanatory helper text
- sticky footer actions on mobile

### Empty State
No tournaments:
- cricket fixture illustration
- CTA `Create first tournament`

---

## 10.5 Tournament Detail `/tournaments/[id]`

### Goal
A rich analytics dashboard for IPL match prediction performance.

### Structure
1. tournament header hero
2. agent leaderboard row
3. season tabs / match filters
4. match prediction card grid
5. points table
6. metric breakdown charts
7. upset detection / calibration analysis

### Hero
Contains:
- tournament title
- season badge
- completion status
- total matches
- best agent accuracy
- average Brier score
- CTA compare agents

### Agent Leaderboard Row
Horizontal cards for each agent:
- rank
- accuracy
- Brier score
- calibration
- upset calls
- trend arrow

### Match Prediction Grid
Cards show:
- teams
- venue
- toss/winner if available
- agent predictions
- actual result
- score summary
- upset icon
- confidence bars

### Points Table
Full width table for actual IPL points or simulated tally by prediction success depending dataset context.

### Charts
- line chart for rolling accuracy
- bar chart for upset detection
- calibration scatter/segment approximation panel
- Brier score distribution

### Responsive
On mobile:
- leaderboard cards become horizontal scroll
- filters collapse into dropdowns
- cards stack cleanly

---

## 10.6 Arena / Replays `/arena`

### Goal
A cinematic archive of completed auctions.

### Layout
- header hero
- filters row
- masonry/grid of replay cards
- featured replay banner on top

### Replay Card
- auction title
- winner
- top buy
- inflation %
- replay thumbnail or abstract preview
- CTA `Watch Replay`

Filters:
- season
- winner
- date
- sort by hype / efficiency / recency

---

## 10.7 Compare `/compare`

### Goal
Agent vs agent analytical battleground.

### Layout
1. hero compare selector
2. head-to-head summary
3. metric cards
4. radar/bar/line charts
5. matchup narrative insights

### Hero
Allow selecting 2–4 agents.
Use vivid competitive lighting:
- split cyan/purple/pink/gold panels
- centered `VS`

### Head-to-Head Summary
Metrics:
- auctions won
- average purse efficiency
- average grader score
- tournament accuracy
- upset rate
- Brier score

### Charts
- radar for holistic comparison
- grouped bars for benchmark-specific metrics
- line for performance over time

### Narrative Insight Cards
Auto-generated style copy blocks:
- “GPT dominates calibration, but Claude extracts more auction value.”
These should look editorial and premium.

---

## 10.8 About `/about`

### Goal
Explain methodology with visual polish, not plain documentation.

### Structure
1. hero
2. benchmark explanation cards
3. methodology timeline/steps
4. grading framework
5. metrics glossary
6. FAQ
7. CTA

Use reading width max `860px` for text-heavy areas.

### Design
- quieter motion
- softer cyan-blue background
- cards with diagrams, metric definitions, step flows
- code/data schema examples can use mono blocks in glass-dark panels

---

## 10.9 Navbar

### Goal
Feel like a broadcast control header.

### Structure
Desktop:
- left: Raeth.ai logo/wordmark
- center: nav items
- right: live badge, CTA, optional theme/status chip

Style:
- sticky top `z-50`
- height `72px`
- translucent glass-dark background
- backdrop blur `20px`
- bottom border white/8
- subtle shadow
- on scroll, slightly darker and more compact

Nav items:
- Home
- Auction
- Tournaments
- Arena
- Compare
- About

Active item:
- gradient underline
- white text
- subtle glow

Mobile:
- top compact bar
- bottom nav or slide-over menu
- bottom nav icons with labels:
  - Home
  - Auction
  - Tournaments
  - Arena
  - Compare

---

# 11. Responsive Design System

## 11.1 Breakpoints
Use:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## 11.2 Mobile-First Rules
- all layouts should stack by default
- horizontal overflow only for intentional carousels/tables
- minimum touch target: `44px`
- maintain 16px page padding on mobile
- avoid tiny dense text on mobile; stats can become 2-column grids

## 11.3 Auction Layout Collapse
### Desktop
`320 / fluid / 360`

### Tablet
Single column, with:
- current lot first
- team panels horizontal scroll
- bid feed accordion or panel below

### Mobile
- fixed top strip
- current lot hero compressed but prominent
- team panels swipeable cards
- live bids inside bottom sheet toggle
- lot progress remains visible
- SOLD banner full width

## 11.4 Tables on Mobile
- points tables become horizontally scrollable within glass panel
- sticky first column if feasible
- preserve row readability with 44px height min

## 11.5 Mobile Bottom Navigation
Implement on small screens:
- glass-dark floating bottom nav
- rounded 20px
- inset from edges 12px
- icons + labels
- active item glows and gets top indicator line

---

# 12. Accessibility

## 12.1 Contrast
- all text must meet WCAG AA minimum
- team colors should not be used as raw text on dark backgrounds unless brightness adjusted
- on team-colored fills, use white or near-black depending contrast

## 12.2 Keyboard Navigation
- all buttons, tabs, dropdowns, cards must be reachable
- visible focus ring on every interactive element
- modals trap focus
- ESC closes modal
- dropdowns support arrow key navigation

## 12.3 Reduced Motion
Respect `prefers-reduced-motion`.
When enabled:
- disable floating blobs movement
- reduce particle count to 0 or static
- replace spring transitions with fades under 120ms
- disable confetti and dramatic sold flashes
- keep only essential feedback

## 12.4 Screen Reader Labels
- timers announce remaining seconds if needed, not every frame
- chart summaries should have accessible text fallback
- bid history entries should be semantically list items
- tables use proper headers/scopes

---

# 13. Performance

## 13.1 Animation Performance
- animate transform and opacity only wherever possible
- use `will-change: transform, opacity` sparingly on hero cards, particles, overlays
- avoid animating blur on many simultaneous nodes
- keep particle layer in one component

## 13.2 Code Splitting
- lazy load heavy charts and confetti components
- defer non-critical background extras on low-end/mobile
- dynamically import replay visualizations and large analytics sections

## 13.3 Rendering Strategy
- memoize heavy data cards and chart configs
- virtualize long bid history or transcript if large
- keep SVG filters limited to key charts/cards

## 13.4 Image/Icon Strategy
- use Lucide icons consistently
- if team logos unavailable, generate elegant initial badges rather than low-quality placeholders

---

# 14. Tailwind Implementation Guidance

## 14.1 Theme Tokens
Map all color tokens, shadows, radius values, and animation names into Tailwind theme/custom utilities.  
Create semantic classes rather than scattering arbitrary values everywhere.

Recommended semantic utility naming:
- `bg-deep`, `bg-surface`, `bg-elevated`, `bg-card`
- `text-primary`, `text-secondary`, `text-muted`
- `glass`, `glass-dark`, `glass-team`
- `glow-cyan`, `glow-gold`, `glow-pink`
- `animate-pulse-live`, `animate-float`, `animate-ticker-scroll`

## 14.2 Reusable Utilities
Create utility/component classes for:
- section headers
- broadcast strips
- scorebug chips
- team accent bars
- chart containers
- ticker containers
- stat grids
- sticky sidebars

---

# 15. Suggested Agent Identity Styling

Though based on AI models, each should feel like its own franchise.

## Claude
- amber/gold primary
- calm premium intelligence
- gold glow, champagne highlights

## GPT
- cyan/blue primary
- sharp analytical energy
- bright neon cyan, tech-forward

## Gemini
- purple/violet primary
- futuristic strategist
- richer gradients, purple glow

## DeepSeek
- pink/red primary
- aggressive disruptor
- magenta-red contrast, bold hover states

Use these colors consistently on compare pages, radar charts, leaderboard rows, and auction team panels.

---

# 16. Specific UI Copy Style

Tone:
- concise
- competitive
- editorial
- sports-like
- premium

Examples:
- `Live Lot`
- `Current Purse`
- `Top Buy`
- `Value Pick`
- `Inflation Paid`
- `Predicted XI Strength`
- `Upset Called`
- `Auction Discipline`
- `Simulation Edge`

Avoid generic SaaS wording like:
- “resource usage”
- “performance dashboard”
- “analytics widget”

Prefer:
- “scorecard”
- “form”
- “matchup”
- “squad balance”
- “auction pulse”

---

# 17. Developer Delivery Requirements

Implement the redesign as a cohesive design system, not one-off pages.  
Every page must share:
- same background engine
- same glass surface language
- same motion grammar
- same typography
- same semantic tokens
- same team/agent accent system

The app should feel like one polished product universe.

Prioritize implementation in this order:
1. design tokens + global theme
2. background system
3. navbar + primitives
4. layout components
5. auction page components
6. home page
7. results page
8. tournament pages
9. compare and arena
10. about page
11. performance/accessibility pass

---

# 18. Final Quality Bar

The final frontend must feel:
- **premium**
- **alive**
- **sports-broadcast inspired**
- **IPL-authentic**
- **AI-native**
- **dark and cinematic**
- **data-dense but readable**
- **high-stakes and competitive**

If any section looks like a generic admin dashboard, redesign it until it feels like:
**“live IPL auction coverage for AI agents with elite analytics.”**

Use this document as the implementation source of truth.