"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  variant = "danger",
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const accentColor = variant === "danger" ? "#EF4444" : "#F97316";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998]"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-[400px]"
            style={{
              background: "rgba(14,14,14,0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,0,0,0.3)",
            }}
          >
            <div className="p-6">
              {/* Icon */}
              <div
                className="w-12 h-12 mx-auto mb-5 rounded-xl flex items-center justify-center"
                style={{
                  background: `${accentColor}15`,
                  border: `1px solid ${accentColor}30`,
                }}
              >
                <svg
                  className="w-6 h-6"
                  style={{ color: accentColor }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>

              {/* Content */}
              <h3
                className="text-lg font-bold text-center mb-2 font-display"
                style={{ color: "#E8E4DE" }}
              >
                {title}
              </h3>
              <p
                className="text-sm text-center leading-relaxed mb-6"
                style={{ color: "#9A9590" }}
              >
                {description}
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#E8E4DE",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold cursor-pointer transition-all duration-150"
                  style={{
                    background: `${accentColor}15`,
                    border: `1px solid ${accentColor}30`,
                    color: accentColor,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${accentColor}25`;
                    e.currentTarget.style.borderColor = `${accentColor}50`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${accentColor}15`;
                    e.currentTarget.style.borderColor = `${accentColor}30`;
                  }}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
