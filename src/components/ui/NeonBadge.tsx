"use client";

interface NeonBadgeProps {
  text: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export default function NeonBadge({ text, color = "#C4A265", size = "md" }: NeonBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span
      className={`inline-block rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        color,
        border: `1px solid ${color}`,
        backgroundColor: `${color}15`,
        textShadow: `0 0 8px ${color}40`,
      }}
    >
      {text}
    </span>
  );
}
