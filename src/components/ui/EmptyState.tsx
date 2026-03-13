import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="py-24 flex flex-col items-center justify-center text-center">
      {icon && (
        <div className="mb-4 text-[#6B6560]">{icon}</div>
      )}
      <p className="text-lg font-semibold text-[#F5F0E8] mb-2">{title}</p>
      {description && (
        <p className="text-sm text-[#A09888] mb-6 max-w-sm">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
