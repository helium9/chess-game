"use client";

import React from "react";
import { TIMER_CONFIG } from "../../config/timerConfig";

/**
 * RematchDialog component - chess.com-inspired modal for rematch requests
 */
const RematchDialog = ({
  isOpen,
  onAccept,
  onDecline,
  requestFrom,
  proposedTimer,
}) => {
  if (!isOpen) return null;

  const getTimerDisplay = (timer) => {
    if (!timer) return null;
    const timerConfig = TIMER_CONFIG.TIME_CONTROLS[timer];
    return timerConfig ? timerConfig.label : timer;
  };

  const timerDisplay = getTimerDisplay(proposedTimer);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-5 shadow-xl max-w-sm w-full">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3 text-center">
          Rematch Request
        </h2>

        <p className="text-[var(--text-secondary)] text-center mb-4 text-sm">
          <span className="font-medium text-[var(--text-primary)]">
            {requestFrom === "white" ? "White" : "Black"}
          </span>{" "}
          wants to play again.
        </p>

        {/* Proposed timer display */}
        {timerDisplay && (
          <div className="flex items-center justify-center gap-2 mb-4 px-3 py-2 bg-[var(--bg-tertiary)] rounded border border-[var(--border-color)]">
            <svg
              className="w-4 h-4 text-[var(--text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-[var(--text-secondary)]">
              Time control:{" "}
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {timerDisplay}
            </span>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm font-medium rounded bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm font-medium rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default RematchDialog;
