# Obsidian & Gold Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the entire Raeth Arena frontend from purple/cyan to "Obsidian & Gold" — warm blacks with gold accents — without changing any backend code, routes, or data shapes.

**Architecture:** Same Next.js App Router structure. Changes are purely visual: CSS variable values, hardcoded hex colors in inline styles, component color props, and chart color arrays. The `globals.css` @theme inline block is the foundation — changing it cascades to all Tailwind class usage. Files with hardcoded hex colors need manual edits.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4 (@theme inline), Framer Motion, Recharts, Lucide Icons, TypeScript 5

**Spec:** `docs/superpowers/specs/2026-03-13-obsidian-gold-redesign-design.md`

---

## Chunk 1: Foundation — CSS Variables, Theme, Layout

### Task 1: Update `@theme inline` color tokens in globals.css

**Files:**
- Modify: `src/app/globals.css:3-65`

- [ ] **Step 1: Replace the @theme inline block with new Obsidian & Gold values**

Replace lines 3-65 of `src/app/globals.css` with:

```css
@theme inline {
  /* ── Obsidian Blacks ── */
  --color-bg-deep: #050505;
  --color-bg-base: #0a0a0a;
  --color-bg-surface: #111111;
  --color-bg-elevated: #161616;
  --color-bg-card: #1a1a1a;
  --color-bg-card-2: #1f1f1f;
  --color-bg-primary: #0a0a0a;

  /* ── Warm Text Hierarchy ── */
  --color-text-primary: #F5F0E8;
  --color-text-secondary: #A09888;
  --color-text-muted: #6B6560;
  --color-text-disabled: #4a4540;

  /* ── Gold-tinted Borders ── */
  --color-border-default: rgba(212, 168, 83, 0.06);
  --color-border-subtle: rgba(255, 255, 255, 0.04);
  --color-border-hover: rgba(212, 168, 83, 0.2);

  /* ── Brand → Gold ── */
  --color-brand: #D4A853;
  --color-brand-soft: rgba(212, 168, 83, 0.12);
  --color-brand-glow: rgba(212, 168, 83, 0.25);

  /* ── Gold Accent Spectrum ── */
  --color-accent-gold: #D4A853;
  --color-accent-gold-bright: #F5C842;
  --color-accent-gold-dim: #8B7A4A;
  --color-accent-gold-glow: rgba(212, 168, 83, 0.15);

  /* ── Accents (retuned for warm palette) ── */
  --color-accent-cyan: #D4A853;
  --color-accent-purple: #8B7A4A;
  --color-accent-pink: #CD7F32;
  --color-accent-live: #EF4444;
  --color-accent-success: #4ADE80;
  --color-accent-warning: #F5C842;
  --color-accent-info: #60A5FA;

  /* ── Semantic Status ── */
  --color-neon-green: #4ADE80;
  --color-neon-red: #EF4444;
  --color-neon-cyan: #D4A853;
  --color-neon-purple: #8B7A4A;
  --color-neon-gold: #D4A853;
  --color-neon-orange: #F97316;
  --color-live: #EF4444;
  --color-sold: #4ADE80;
  --color-unsold: #6B6560;

  /* ── Team Colors (unchanged) ── */
  --color-team-mi: #004BA0;
  --color-team-csk: #FDB913;
  --color-team-rcb: #EC1C24;
  --color-team-kkr: #3A225D;
  --color-team-srh: #FF822A;
  --color-team-rr: #EA1A85;
  --color-team-dc: #004C93;
  --color-team-pbks: #DD1F2D;
  --color-team-gt: #1C1C2B;
  --color-team-lsg: #A72056;

  /* ── Fonts ── */
  --font-display: var(--font-inter), system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-jetbrains), "JetBrains Mono", "Fira Code", monospace;
}
```

Key changes:
- Text primary: `#EDEDED` → `#F5F0E8` (warm ivory)
- Text secondary: `#A1A1A1` → `#A09888` (warm stone)
- Text muted: `#707070` → `#6B6560` (warm ash)
- Borders: white-alpha → gold-alpha
- Brand: `#7877C6` → `#D4A853` (gold)
- Accent cyan: `#22D3EE` → `#D4A853` (gold replaces cyan as primary accent)
- Success: `#10B981` → `#4ADE80` (brighter green for warm bg contrast)
- Info: `#3B82F6` → `#60A5FA` (brighter blue)
- New: `--color-accent-gold-bright`, `--color-accent-gold-dim`, `--color-accent-gold-glow`

- [ ] **Step 2: Verify build still works with new tokens**

Run: `npm run build`
Expected: Build succeeds (all Tailwind classes still resolve because variable names are preserved)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): update @theme inline tokens to Obsidian & Gold palette"
```

---

### Task 2: Remove light theme overrides from globals.css

**Files:**
- Modify: `src/app/globals.css:67-202`

- [ ] **Step 1: Delete the entire light mode override block**

Remove lines 67-202 (from `/* LIGHT MODE OVERRIDES */` comment through the last `[data-theme="light"]` rule ending with the `.text-gradient-hero` rule). This is ~135 lines. The site is dark-only going forward.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): remove light mode overrides — dark-only site"
```

---

### Task 3: Recolor globals.css component styles to gold

**Files:**
- Modify: `src/app/globals.css` (multiple sections)

- [ ] **Step 1: Update ::selection color**

Change:
```css
::selection {
  background: rgba(120,119,198,0.3);
  color: #fff;
}
```
To:
```css
::selection {
  background: rgba(212,168,83,0.3);
  color: #fff;
}
```

- [ ] **Step 2: Update glow system**

Replace the glow classes block with:
```css
.glow-sm { box-shadow: 0 0 12px rgba(255,255,255,0.06), 0 0 24px rgba(212,168,83,0.06); }
.glow { box-shadow: 0 0 18px rgba(212,168,83,0.12), 0 0 42px rgba(212,168,83,0.08); }
.glow-lg { box-shadow: 0 0 24px rgba(212,168,83,0.18), 0 0 64px rgba(212,168,83,0.12); }
.glow-cyan { box-shadow: 0 0 18px rgba(212,168,83,0.22), 0 0 52px rgba(212,168,83,0.12); }
.glow-pink { box-shadow: 0 0 18px rgba(205,127,50,0.22), 0 0 52px rgba(205,127,50,0.12); }
.glow-gold { box-shadow: 0 0 18px rgba(212,168,83,0.24), 0 0 56px rgba(212,168,83,0.14); }
.glow-live { box-shadow: 0 0 18px rgba(239,68,68,0.26), 0 0 56px rgba(239,68,68,0.16); }
.glow-purple { box-shadow: 0 0 18px rgba(139,122,74,0.22), 0 0 52px rgba(139,122,74,0.12); }
```

- [ ] **Step 3: Update text gradients**

Keep `.text-gradient-hero` as-is (white gradient for hero headlines — spec uses ivory key words in gold gradient, but the hero text itself stays white-to-transparent for contrast).

Replace `.text-gradient-brand`:
```css
.text-gradient-brand {
  background: linear-gradient(135deg, #D4A853 0%, #F5C842 50%, #D4A853 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Replace `.text-gradient-gold`:
```css
.text-gradient-gold {
  background: linear-gradient(135deg, #D4A853 0%, #F5C842 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Replace `.text-gradient-metric`:
```css
.text-gradient-metric {
  background: linear-gradient(135deg, #D4A853 0%, #F5C842 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Replace `.text-gradient-white`:
```css
.text-gradient-white {
  background: linear-gradient(180deg, #F5F0E8 0%, #A09888 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Replace `.text-gradient-green`:
```css
.text-gradient-green {
  background: linear-gradient(135deg, #4ADE80, #34D399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

- [ ] **Step 4: Update button styles**

Replace `.btn-primary`:
```css
.btn-primary {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  border-radius: 10px;
  border: none;
  font-weight: 700;
  font-size: 0.8125rem;
  color: #000;
  cursor: pointer;
  background: linear-gradient(135deg, #D4A853, #F5C842);
  box-shadow: 0 1px 2px rgba(0,0,0,0.2), 0 0 24px rgba(212,168,83,0.15);
  transition: all 200ms ease;
  text-decoration: none;
}
```

Replace `.btn-primary:hover`:
```css
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(212,168,83,0.3), 0 1px 2px rgba(0,0,0,0.2);
}
```

Replace `.btn-secondary` border/hover to use gold:
```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  border-radius: 10px;
  border: 1px solid rgba(212,168,83,0.25);
  font-weight: 600;
  font-size: 0.8125rem;
  color: #D4A853;
  cursor: pointer;
  background: transparent;
  transition: all 200ms ease;
  text-decoration: none;
}
```

Replace `.btn-secondary:hover`:
```css
.btn-secondary:hover {
  border-color: rgba(212,168,83,0.4);
  background: rgba(212,168,83,0.06);
  transform: translateY(-1px);
}
```

Replace `.btn-gold`:
```css
.btn-gold {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  border-radius: 10px;
  border: none;
  font-weight: 700;
  font-size: 0.8125rem;
  color: #000;
  cursor: pointer;
  background: linear-gradient(135deg, #D4A853, #F5C842);
  box-shadow: 0 1px 2px rgba(0,0,0,0.2), 0 0 24px rgba(212,168,83,0.15);
  transition: all 200ms ease;
  text-decoration: none;
}
```

Replace `.btn-gold:hover`:
```css
.btn-gold:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(212,168,83,0.3), 0 1px 2px rgba(0,0,0,0.2);
}
```

Replace `.btn-gradient`:
```css
.btn-gradient {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 2rem;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  font-size: 0.9375rem;
  color: #000;
  cursor: pointer;
  background: linear-gradient(135deg, #D4A853, #F5C842, #D4A853);
  background-size: 200% 200%;
  animation: gradient-x 4s ease infinite;
  box-shadow: 0 0 32px rgba(212,168,83,0.3), 0 4px 12px rgba(0,0,0,0.3);
  transition: all 200ms ease;
  text-decoration: none;
}
```

Replace `.btn-gradient:hover`:
```css
.btn-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 48px rgba(212,168,83,0.4), 0 8px 24px rgba(0,0,0,0.3);
}
```

- [ ] **Step 5: Update animation keyframes with gold colors**

Replace `pulse-border`:
```css
@keyframes pulse-border {
  0%, 100% { border-color: rgba(212,168,83,0.2); }
  50% { border-color: rgba(212,168,83,0.4); }
}
```

Replace `auction-pulse-glow`:
```css
@keyframes auction-pulse-glow {
  0%, 100% { box-shadow: 0 0 16px rgba(212,168,83,0.15), 0 0 32px rgba(212,168,83,0.08); }
  50% { box-shadow: 0 0 24px rgba(212,168,83,0.3), 0 0 48px rgba(212,168,83,0.15); }
}
```

- [ ] **Step 6: Update role badges**

Replace role badge colors:
```css
.role-badge-bat { background: rgba(212,168,83,0.12); color: #D4A853; }
.role-badge-bowl { background: rgba(96,165,250,0.12); color: #60A5FA; }
.role-badge-ar { background: rgba(139,122,74,0.12); color: #8B7A4A; }
.role-badge-wk { background: rgba(74,222,128,0.12); color: #4ADE80; }
```

- [ ] **Step 7: Update status badges**

Replace:
```css
.status-completed { background: rgba(74,222,128,0.1); color: #4ADE80; border-color: rgba(74,222,128,0.2); }
.status-sold { background: rgba(74,222,128,0.12); color: #4ADE80; border-color: rgba(74,222,128,0.25); }
.status-unsold { background: rgba(107,101,96,0.12); color: #A09888; border-color: rgba(107,101,96,0.2); }
```

- [ ] **Step 8: Update neon-border, gradient-border, and focus-ring**

Replace `.neon-border::before` background:
```css
background: linear-gradient(120deg, rgba(212,168,83,0.0), rgba(212,168,83,0.8), rgba(245,200,66,0.8), rgba(212,168,83,0.0));
```

Replace `.gradient-border-cyan::before` background:
```css
background: linear-gradient(135deg, rgba(212,168,83,0.4), rgba(212,168,83,0.05), rgba(245,200,66,0.3));
```

Replace `.gradient-border-gold::before` background:
```css
background: linear-gradient(135deg, rgba(212,168,83,0.5), rgba(212,168,83,0.05), rgba(245,200,66,0.3));
```

Replace `.focus-ring:focus-visible`:
```css
.focus-ring:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(212,168,83,0.5), 0 0 0 4px rgba(212,168,83,0.15);
}
```

- [ ] **Step 9: Update shimmer warm tint**

Replace `.shimmer`:
```css
.shimmer {
  background: linear-gradient(90deg, rgba(212,168,83,0.03) 25%, rgba(212,168,83,0.08) 50%, rgba(212,168,83,0.03) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
```

- [ ] **Step 10: Update glass-hover gold tint, bento-card, section-divider, ticker**

Replace `.glass-hover:hover`:
```css
.glass-hover:hover {
  border-color: rgba(212,168,83,0.15);
  background: rgba(212,168,83,0.03);
  transform: translateY(-2px);
  box-shadow:
    0 0 0 1px rgba(212,168,83,0.06),
    0 16px 48px rgba(0,0,0,0.4);
}
```

Replace `.bento-card::before` background:
```css
background: linear-gradient(90deg, transparent, rgba(212,168,83,0.1), transparent);
```

Replace `.bento-card:hover`:
```css
.bento-card:hover {
  border-color: rgba(212,168,83,0.15);
  background: rgba(212,168,83,0.03);
  transform: translateY(-4px);
  box-shadow:
    0 20px 60px rgba(0,0,0,0.4),
    0 8px 32px rgba(212,168,83,0.08);
}
```

Replace `.ticker-strip` border colors:
```css
.ticker-strip {
  height: 40px;
  overflow: hidden;
  position: relative;
  border-top: 1px solid rgba(212,168,83,0.08);
  border-bottom: 1px solid rgba(212,168,83,0.08);
}
```

Replace `.section-divider`:
```css
.section-divider {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,168,83,0.15), transparent);
}
```

Replace `.divider-subtle`:
```css
.divider-subtle {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,168,83,0.1), transparent);
}
```

- [ ] **Step 11: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): recolor all globals.css component styles to Obsidian & Gold"
```

---

### Task 4: Remove light theme toggle from ThemeContext

**Files:**
- Modify: `src/contexts/ThemeContext.tsx`

- [ ] **Step 1: Simplify ThemeContext to dark-only**

Replace the entire file content. The context should:
- Always set `data-theme="dark"` on the document
- Remove the toggle function
- Remove localStorage persistence
- Export a minimal context that always returns "dark"

```tsx
"use client";
import { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext<{ theme: "dark" }>({ theme: "dark" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/contexts/ThemeContext.tsx
git commit -m "feat(theme): simplify ThemeContext to dark-only"
```

---

### Task 5: Update layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Ensure html element has dark class and no conditional theme**

Verify `className="dark"` is hardcoded on `<html>`. No changes needed if it already has `className="dark"`. Just confirm.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

---

## Chunk 2: Shared Components

### Task 6: Recolor Navbar to gold

**Files:**
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Replace brand color and nav pill**

Find all instances of `#7877C6` and replace with `#D4A853`.
Find all instances of `#EDEDED` (active text) and replace with `#F5F0E8`.
Find all instances of `#666` (inactive text) and replace with `#6B6560`.
Find all instances of `#888` on hamburger/close icons and replace with `#D4A853` (spec says "gold icon"). Other `#888` instances → `#A09888`.
Find all instances of `#999` and replace with `#A09888`.
Find all instances of `#555` and replace with `#6B6560`.
Find all instances of `#333` and replace with `rgba(212,168,83,0.08)`.

Replace the nav pill animation (`layoutId="nav-pill"`) with a gold underline:
- Remove the `motion.div` with `layoutId="nav-pill"` (the background pill)
- Add a `motion.div` underneath each active nav item with: `style={{ height: 2, background: '#D4A853', borderRadius: 1 }}` and `layoutId="nav-underline"`

Replace backdrop blur tint from any white/neutral to warm: `rgba(5,5,5,0.85)`

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat(theme): recolor Navbar to gold brand, gold underline active state"
```

---

### Task 7: Recolor AnimatedBackground to warm gold

**Files:**
- Modify: `src/components/AnimatedBackground.tsx`

- [ ] **Step 1: Replace all gradient colors**

Replace all purple/blue/cyan rgba values with warm gold equivalents:

Home variant gradients:
- `rgba(120,119,198,0.3)` → `rgba(212,168,83,0.04)`
- `rgba(33,150,243,0.15)` → `rgba(180,140,60,0.03)`
- `rgba(168,85,247,0.12)` → `rgba(245,200,66,0.02)`

Auction variant:
- Keep `rgba(253,185,19,0.2)` → `rgba(212,168,83,0.06)` (slightly more subtle)
- `rgba(255,48,64,0.1)` → keep as is (red for live auction)

Tournament variant:
- `rgba(59,130,246,0.2)` → `rgba(212,168,83,0.04)`
- `rgba(168,85,247,0.12)` → `rgba(180,140,60,0.03)`

Animated blobs:
- `rgba(120,119,198,0.4)` → `rgba(212,168,83,0.04)`
- `rgba(59,130,246,0.5)` → `rgba(180,140,60,0.03)`
- `rgba(168,85,247,0.5)` → `rgba(245,200,66,0.02)`

All blurs should be much more subtle (0.02-0.06 opacity) per spec: "barely visible, adds warmth"

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/AnimatedBackground.tsx
git commit -m "feat(theme): recolor AnimatedBackground to warm gold blurs"
```

---

### Task 8: Recolor small UI components

**Files:**
- Modify: `src/components/ui/StatusBadge.tsx`
- Modify: `src/components/ui/GlowCard.tsx`
- Modify: `src/components/ui/NeonBadge.tsx`
- Modify: `src/components/ui/EmptyState.tsx`
- Modify: `src/components/ReplayViewer.tsx`

- [ ] **Step 1: Update StatusBadge colors**

In `src/components/ui/StatusBadge.tsx`, update the STATUS_CONFIG color mapping:
- RUNNING/PREDICTING: change to gold tint (`bg-[rgba(212,168,83,0.1)]`, gold text, pulsing gold dot)
- COMPLETED/EVALUATED: change to green tint using `#4ADE80`
- LOBBY/PENDING: change to warm amber tint

- [ ] **Step 2: Update GlowCard default glow**

In `src/components/ui/GlowCard.tsx`, replace default glow color:
- `rgba(0, 240, 255, 0.15)` → `rgba(212, 168, 83, 0.15)`

- [ ] **Step 3: Update NeonBadge default color**

In `src/components/ui/NeonBadge.tsx`, replace default color:
- `#00f0ff` → `#D4A853`

- [ ] **Step 4: Update EmptyState colors**

In `src/components/ui/EmptyState.tsx`, replace hardcoded colors:
- `#444` → `#6B6560` (text-ash)
- `#EDEDED` → `#F5F0E8` (text-ivory)
- `#666` → `#A09888` (text-stone)

- [ ] **Step 5: Update ReplayViewer progress bar**

In `src/components/ReplayViewer.tsx`, find the progress bar gradient:
- Replace `#7877C6` → `#D4A853`
- Replace `#22D3EE` → `#F5C842`

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/StatusBadge.tsx src/components/ui/GlowCard.tsx src/components/ui/NeonBadge.tsx src/components/ui/EmptyState.tsx src/components/ReplayViewer.tsx
git commit -m "feat(theme): recolor StatusBadge, GlowCard, NeonBadge, EmptyState, ReplayViewer to gold"
```

---

## Chunk 3: Homepage Rewrite

### Task 9: Rewrite homepage (src/app/page.tsx)

**Files:**
- Modify: `src/app/page.tsx` (536 lines — major rewrite)

This is the largest single change. The homepage gets a new design per the spec's "The Pitch" section.

- [ ] **Step 1: Replace all hardcoded hex colors in inline styles**

Search and replace across the file:
- `#7877C6` → `#D4A853` (brand → gold)
- `#EDEDED` → `#F5F0E8` (text → ivory)
- `#888` → `#A09888` (muted → stone)
- `#22D3EE` → `#D4A853` (cyan → gold)
- `#8B5CF6` → `#8B7A4A` (purple → gold-dim)
- `#10B981` → `#4ADE80` (green → brighter green)
- `#3B82F6` → `#60A5FA` (blue → brighter blue)
- `#F59E0B` → `#D4A853` (amber → gold)
- `#555` → `#6B6560` (gray → ash)
- `#444` → `#6B6560` (dark gray → ash)
- `#333` → `rgba(212,168,83,0.06)` (dark borders → gold-tinted)

- [ ] **Step 2: Update hero section**

Update the hero headline to: `"AI Agents. Real Cricket. Live Auctions."` with "Live Auctions" wrapped in a gold gradient span.

Update CTA button class from `btn-gradient` to `btn-gold` or keep `btn-gradient` (which is now gold via CSS).

Update subtitle text color to use `text-stone` (#A09888).

- [ ] **Step 3: Update stat counters and bento cards**

Replace any remaining accent colors in StatCard components, bento grid cards, and social proof ticker to use gold palette.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(theme): recolor homepage to Obsidian & Gold palette"
```

---

## Chunk 4: Operations Pages

### Task 10: Verify Arena page

**Files:**
- Verify: `src/app/arena/page.tsx`

- [ ] **Step 1: Confirm no manual changes needed**

The Arena page uses only Tailwind classes and CSS variables (`text-accent-cyan`, `bg-bg-surface`, etc.) — no hardcoded hex colors beyond TEAM_COLORS. The CSS variable changes from Task 1 automatically cascade here.

Verify by grepping for hardcoded colors: `grep -n "#[0-9a-fA-F]\{6\}" src/app/arena/page.tsx`
Expected: Only TEAM_COLORS entries (which are unchanged)

If any non-team hardcoded colors are found, replace them using the standard mapping:
- `#22D3EE` → `#D4A853`, `#10B981` → `#4ADE80`, `#EDEDED` → `#F5F0E8`, `#888` → `#A09888`

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

---

### Task 11: Recolor Live Auction page

**Files:**
- Modify: `src/app/auction/[id]/page.tsx` (908 lines)

- [ ] **Step 1: Update AGENT_COLORS array**

Replace:
```ts
const AGENT_COLORS = ["#00f0ff", "#00ff88", "#b347ff", "#ffd700", "#ff6b6b", "#4ecdc4", "#a855f7", "#f97316", "#06b6d4", "#ec4899"];
```
With warm gold-based palette:
```ts
const AGENT_COLORS = ["#D4A853", "#F5C842", "#CD7F32", "#8B7A4A", "#E8C876", "#B8944A", "#C9A84C", "#F0D78C", "#A08840", "#DDB84D"];
```

- [ ] **Step 2: Keep provider colors unchanged**

Provider colors (Anthropic purple, OpenAI green, Google blue, etc.) are brand-specific and should NOT change. They represent the LLM provider's identity, not the Raeth theme.

- [ ] **Step 3: Replace all other hardcoded colors**

Full replacement list for this file:
- `#7877C6` → `#D4A853` (brand → gold)
- `#22D3EE` → `#D4A853` (cyan → gold)
- `#00f0ff` → `#D4A853` (custom cyan → gold)
- `#EDEDED` → `#F5F0E8` (text → ivory)
- `#888` → `#A09888` (muted → stone)
- `#666` → `#6B6560` (muted → ash)
- `#555` → `#6B6560` (gray → ash)
- `#333` → `rgba(212,168,83,0.06)` (borders → gold-tinted)
- `#8B5CF6` → `#8B7A4A` (purple → gold-dim)
- `#F59E0B` → `#D4A853` (amber → gold)
- `#10B981` → `#4ADE80` (green → brighter green)
- `#22C55E` → `#4ADE80` (green variant)

- [ ] **Step 4: Verify build and commit**

Run: `npm run build`
Expected: PASS

```bash
git add "src/app/auction/[id]/page.tsx"
git commit -m "feat(theme): recolor live auction page to gold palette"
```

---

### Task 12: Recolor Tournaments pages

**Files:**
- Modify: `src/app/tournaments/page.tsx` (664 lines)
- Modify: `src/app/tournaments/[id]/page.tsx` (683 lines)

- [ ] **Step 1: Update tournaments/page.tsx colors**

Replace AGENT_COLORS array (same as Task 11 step 1 if present).

Replace hardcoded colors:
- `#7877C6` → `#D4A853`
- `#F59E0B` → `#D4A853`
- `#8B5CF6` → `#8B7A4A`
- `#EC4899` → `#CD7F32`
- `#3B82F6` → `#60A5FA`
- `#888` → `#A09888`
- `#666` → `#6B6560`
- `#EDEDED` → `#F5F0E8`
- `#00f0ff` → `#D4A853`

- [ ] **Step 2: Update tournaments/[id]/page.tsx colors**

Replace hardcoded colors:
- `#7877C6` → `#D4A853`
- `#3B82F6` → `#60A5FA`
- `#10B981` → `#4ADE80`
- `#06B6D4` → `#D4A853`
- `#888` → `#A09888`
- `#EDEDED` → `#F5F0E8`
- `#666` → `#6B6560`
- `#555` → `#6B6560`
- `#999` → `#A09888`
- `rgba(120,119,198,...)` → `rgba(212,168,83,...)` (brand rgba → gold rgba)

- [ ] **Step 3: Verify build and commit**

Run: `npm run build`
Expected: PASS

```bash
git add src/app/tournaments/page.tsx "src/app/tournaments/[id]/page.tsx"
git commit -m "feat(theme): recolor tournament pages to gold"
```

---

## Chunk 5: Data & Analytics Pages

### Task 13: Recolor Leaderboard page

**Files:**
- Modify: `src/app/leaderboard/page.tsx` (362 lines)

- [ ] **Step 1: Update medal/rank colors**

Keep medal colors as specified in design:
- Rank #1: `#D4A853` (gold — updated from `#FDB913`)
- Rank #2: `#C0C0C0` (silver — unchanged)
- Rank #3: `#CD7F32` (bronze — unchanged)

- [ ] **Step 2: Update score threshold colors**

- `#22C55E` → `#4ADE80` (good scores)
- `#FDB913` → `#D4A853` (medium scores)
- `#A855F7` → `#8B7A4A` (purple → gold-dim)
- `#22D3EE` → `#D4A853` (cyan → gold)
- `#94A3B8` → `#A09888` (slate text → stone)

Replace score bar gradient to use gold: `linear-gradient(90deg, #D4A853, #F5C842)`

- [ ] **Step 3: Verify build and commit**

Run: `npm run build`
Expected: PASS

```bash
git add src/app/leaderboard/page.tsx
git commit -m "feat(theme): recolor Leaderboard with gold rank badges and score bars"
```

---

### Task 14: Recolor Trends page

**Files:**
- Modify: `src/app/trends/page.tsx` (289 lines)

- [ ] **Step 1: Update MODEL_COLORS array**

Replace:
```ts
const MODEL_COLORS = ["#22D3EE", "#A855F7", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#3B82F6", "#F97316"];
```
With warm palette (gold primary, warm secondary tones):
```ts
const MODEL_COLORS = ["#D4A853", "#F5C842", "#4ADE80", "#CD7F32", "#EF4444", "#8B7A4A", "#60A5FA", "#F97316"];
```

- [ ] **Step 2: Update chart styling**

Replace the one hardcoded chart color:
- `#111827` → `#0a0a0a` (chart background → bg-obsidian)

Any other chart styling (grid lines, tooltips) should use Recharts props with gold palette values:
- Grid stroke: `rgba(212,168,83,0.06)`
- Tooltip background: `#0a0a0a`, border: `rgba(212,168,83,0.15)`

- [ ] **Step 3: Verify build and commit**

Run: `npm run build`
Expected: PASS

```bash
git add src/app/trends/page.tsx
git commit -m "feat(theme): recolor Trends charts to gold palette"
```

---

### Task 15: Recolor Compare page

**Files:**
- Modify: `src/app/compare/page.tsx` (1,404 lines — largest file)

- [ ] **Step 1: Update ACCENT constant**

Replace:
```ts
const ACCENT = {
  cyan: "#22D3EE",
  purple: "#A855F7",
  gold: "#FDB913",
  green: "#22C55E",
  red: "#FF3040",
  orange: "#F97316",
};
```
With:
```ts
const ACCENT = {
  gold: "#D4A853",
  goldBright: "#F5C842",
  goldDim: "#8B7A4A",
  green: "#4ADE80",
  red: "#EF4444",
  bronze: "#CD7F32",
};
```

**Note:** This changes the key names, so all references to `ACCENT.cyan`, `ACCENT.purple` must be updated to `ACCENT.gold`, `ACCENT.goldBright`, etc. throughout the file. Map them logically:
- `ACCENT.cyan` → `ACCENT.gold`
- `ACCENT.purple` → `ACCENT.goldDim`
- `ACCENT.gold` → `ACCENT.goldBright`
- `ACCENT.green` → `ACCENT.green`
- `ACCENT.red` → `ACCENT.red`
- `ACCENT.orange` → `ACCENT.bronze`

- [ ] **Step 2: Update AUCTION_COLORS**

The `AUCTION_COLORS` array uses the first few accent values. Update it to:
```ts
const AUCTION_COLORS = [ACCENT.gold, ACCENT.goldBright, ACCENT.goldDim, ACCENT.bronze];
```

- [ ] **Step 3: Replace remaining hardcoded colors**

Search for any remaining hardcoded hex values not covered by ACCENT:
- Chart backgrounds, borders, text colors → same replacements as other pages

- [ ] **Step 4: Verify build and commit**

Run: `npm run build`
Expected: PASS

```bash
git add src/app/compare/page.tsx
git commit -m "feat(theme): recolor Compare page ACCENT constants and charts to gold"
```

---

### Task 16: Recolor Results page

**Files:**
- Modify: `src/app/results/[id]/page.tsx` (529 lines)

- [ ] **Step 1: Update COLORS constant**

Replace:
```ts
const COLORS = {
  cyan: "#06B6D4",
  green: "#10B981",
  red: "#EF4444",
  purple: "#A855F7",
  gold: "#F59E0B",
  orange: "#F97316",
  surface: "#111827",
  border: "#1E293B",
  textDim: "#94A3B8",
  textMuted: "#64748B",
};
```
With:
```ts
const COLORS = {
  gold: "#D4A853",
  goldBright: "#F5C842",
  green: "#4ADE80",
  red: "#EF4444",
  goldDim: "#8B7A4A",
  bronze: "#CD7F32",
  orange: "#F97316",
  surface: "#0a0a0a",
  border: "rgba(212,168,83,0.06)",
  textDim: "#A09888",
  textMuted: "#6B6560",
};
```

Update all references:
- `COLORS.cyan` → `COLORS.gold`
- `COLORS.purple` → `COLORS.goldDim`
- `COLORS.gold` → `COLORS.goldBright`

- [ ] **Step 2: Add gold winner highlight**

For the winning team card, add gold border + glow:
- `border: 1px solid rgba(212,168,83,0.3)`
- `boxShadow: '0 0 24px rgba(212,168,83,0.12)'`

- [ ] **Step 3: Verify build and commit**

Run: `npm run build`
Expected: PASS

```bash
git add "src/app/results/[id]/page.tsx"
git commit -m "feat(theme): recolor Results page to gold, add gold winner highlight"
```

---

## Chunk 6: Minor Pages & Final Verification

### Task 17: Recolor About page

**Files:**
- Modify: `src/app/about/page.tsx` (438 lines)

- [ ] **Step 1: Update gradient and text colors**

- `#F59E0B` → `#D4A853` (amber → gold)
- `#D97706` → `#8B7A4A` (dark amber → gold-dim)
- `#8B5CF6` → `#8B7A4A` (purple → gold-dim, used in TourBench section headers/badges)
- `#6D28D9` → `#8B7A4A` (dark purple → gold-dim, in gradients)
- `#22D3EE` → `#D4A853` (cyan → gold, in TourBench section)
- `rgba(139,92,246,...)` → `rgba(139,122,74,...)` (purple rgba → gold-dim rgba)
- `#888` → `#A09888`
- `#EDEDED` → `#F5F0E8`

- [ ] **Step 2: Verify build and commit**

Run: `npm run build`
Expected: PASS

```bash
git add src/app/about/page.tsx
git commit -m "feat(theme): recolor About page to gold"
```

---

### Task 18: Update not-found.tsx

**Files:**
- Modify: `src/app/not-found.tsx` (34 lines)

- [ ] **Step 1: Replace gradient**

Change: `linear-gradient(135deg, #7877C6, #ff8c00)`
To: `linear-gradient(135deg, #D4A853, #F5C842)`

- [ ] **Step 2: Verify build and commit**

Run: `npm run build`
Expected: PASS

```bash
git add src/app/not-found.tsx
git commit -m "feat(theme): update 404 page gradient to gold"
```

---

### Task 19: Final verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Run tests**

Run: `npm run test`
Expected: All existing tests pass (tests are backend-only, unaffected by visual changes).

- [ ] **Step 3: Run type check**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 4: Grep for remaining old brand colors**

Search for any remaining `#7877C6` or `#22D3EE` in `src/` directory. If found in non-team-color contexts, fix them.

Run: `grep -rn "#7877C6\|#22D3EE\|#A855F7\|#8B5CF6\|#00f0ff\|#FDB913\|#F59E0B\|#10B981" src/ --include="*.tsx" --include="*.ts" --include="*.css" | grep -v "team\|Team\|TEAM\|provider\|Provider\|PROVIDER"`

Expected: No results (all old brand/accent colors replaced). Team colors and provider brand colors are excluded from this check.

- [ ] **Step 5: Visual spot check**

Run: `npm run dev`
Check pages in browser:
1. Homepage — gold hero, gold CTA, warm text
2. Navbar — "RAETH" in gold, gold underline on active
3. Arena — gold accent on filters, setup card
4. Live auction — gold bid entries, gold progress
5. Tournaments — gold status badges, gold accents
6. Leaderboard — gold rank badges, gold score bars
7. Trends — gold chart lines
8. Compare — gold accent colors
9. Results — gold winner highlight
10. About — gold section dividers

- [ ] **Step 6: Final commit (if any remaining fixes)**

```bash
git add -A
git commit -m "feat(theme): final Obsidian & Gold polish and cleanup"
```
