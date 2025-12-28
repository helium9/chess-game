"use client";

import React from "react";

/**
 * DeCombineModeIndicator component - minimal indicator for de-combine mode
 */
const DeCombineModeIndicator = () => {
  return (
    <div className="mt-1 px-3 py-1 bg-teal-600/20 border border-teal-500/50 rounded text-xs text-teal-300 flex items-center gap-2">
      <span>⚡</span>
      <span>Split Mode</span>
      <span className="text-teal-400/70">• ESC to cancel</span>
    </div>
  );
};

export default DeCombineModeIndicator;
