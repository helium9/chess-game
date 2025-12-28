"use client";

import React from "react";

/**
 * StatusMessage component - chess.com-inspired minimal styling
 */
const StatusMessage = ({ message }) => {
  return (
    <div className="px-3 py-1.5 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)] min-h-8 flex items-center">
      <p className="text-sm font-medium text-[var(--text-primary)] text-center w-full">
        {message}
      </p>
    </div>
  );
};

export default StatusMessage;
