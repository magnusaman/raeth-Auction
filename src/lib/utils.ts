// ═══════════════════════════════════════════════════════════
//  Shared utility functions
// ═══════════════════════════════════════════════════════════

/** Merge classnames — lightweight cn() without clsx dependency */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Format currency in Indian style: ₹2.5 Cr */
export function formatCurrency(crores: number): string {
  if (crores >= 1) return `₹${crores.toFixed(crores % 1 === 0 ? 0 : 1)} Cr`;
  const lakhs = crores * 100;
  return `₹${lakhs.toFixed(0)} L`;
}

/** Hash a string to a 32-bit integer */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a deterministic gradient from an agent/model name.
 * Returns { from, to, angle } for CSS linear-gradient.
 */
export function generateAgentGradient(name: string): { from: string; to: string; angle: number } {
  const hash = hashString(name);

  // Curated color pairs — warm, distinctive, not clashing with gold brand
  const palettes = [
    { from: "#6366F1", to: "#8B5CF6" },  // indigo → violet
    { from: "#EC4899", to: "#F43F5E" },  // pink → rose
    { from: "#14B8A6", to: "#06B6D4" },  // teal → cyan
    { from: "#F59E0B", to: "#EF4444" },  // amber → red
    { from: "#8B5CF6", to: "#EC4899" },  // violet → pink
    { from: "#10B981", to: "#3B82F6" },  // emerald → blue
    { from: "#F97316", to: "#F59E0B" },  // orange → amber
    { from: "#06B6D4", to: "#6366F1" },  // cyan → indigo
    { from: "#A855F7", to: "#6366F1" },  // purple → indigo
    { from: "#EF4444", to: "#F97316" },  // red → orange
    { from: "#3B82F6", to: "#14B8A6" },  // blue → teal
    { from: "#D946EF", to: "#A855F7" },  // fuchsia → purple
  ];

  const palette = palettes[hash % palettes.length];
  const angle = 135 + (hash % 90); // 135–225 degrees

  return { ...palette, angle };
}

/** Get initials from agent/model name (max 2 chars) */
export function getInitials(name: string): string {
  const parts = name.split(/[\s\-_\/]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Truncate string with ellipsis */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

/** Format relative time: "2m ago", "1h ago", "3d ago" */
export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
