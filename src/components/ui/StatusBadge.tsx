const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  RUNNING: {
    label: "Running",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse",
  },
  PREDICTING: {
    label: "Predicting",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-brand/15 text-brand border-brand/30",
  },
  EVALUATED: {
    label: "Evaluated",
    className: "bg-brand/15 text-brand border-brand/30",
  },
  STOPPED: {
    label: "Stopped",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  LOBBY: {
    label: "Lobby",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  PENDING: {
    label: "Pending",
    className: "bg-[#2a2520]/50 text-[#A09888] border-[#4a4540]/50",
  },
};

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: "bg-[#2a2520]/50 text-[#A09888] border-[#4a4540]/50",
  };

  const sizeClass = size === "sm"
    ? "text-[10px] px-2 py-0.5"
    : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wider ${sizeClass} ${config.className}`}
    >
      {config.label}
    </span>
  );
}
