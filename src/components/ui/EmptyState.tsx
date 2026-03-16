"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="py-24 flex flex-col items-center justify-center text-center"
    >
      {icon && (
        <motion.div
          className="mb-5 text-[#625D58]"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {icon}
        </motion.div>
      )}
      <p className="text-lg font-bold text-[#E8E4DE] mb-2 font-display">{title}</p>
      {description && (
        <p className="text-sm text-[#78736E] mb-8 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div>{action}</div>}
    </motion.div>
  );
}
