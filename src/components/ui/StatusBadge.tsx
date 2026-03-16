const STATUS_CONFIG: Record<string, { label: string; color: string; glow: boolean }> = {
  RUNNING: { label: "Live", color: "#4ADE80", glow: true },
  BIDDING: { label: "Bidding", color: "#4ADE80", glow: true },
  PREDICTING: { label: "Predicting", color: "#4ADE80", glow: true },
  COMPLETED: { label: "Completed", color: "#C4A265", glow: false },
  EVALUATED: { label: "Evaluated", color: "#C4A265", glow: false },
  STOPPED: { label: "Stopped", color: "#EF4444", glow: false },
  CANCELLED: { label: "Cancelled", color: "#EF4444", glow: false },
  LOBBY: { label: "Lobby", color: "#F59E0B", glow: false },
  PENDING: { label: "Pending", color: "#78736E", glow: false },
};

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: "#78736E", glow: false };

  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5 gap-1.5" : "text-xs px-2.5 py-1 gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider ${sizeClass}`}
      style={{
        background: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
        boxShadow: config.glow ? `0 0 12px ${config.color}25` : "none",
      }}
    >
      {config.glow && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
            style={{ background: config.color }}
          />
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ background: config.color }}
          />
        </span>
      )}
      {config.label}
    </span>
  );
}
