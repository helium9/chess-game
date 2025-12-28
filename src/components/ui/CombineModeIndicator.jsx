"use client";

import React from "react";

/**
 * CombineModeIndicator component - minimal indicator for combine mode
 */
const CombineModeIndicator = () => {
  return (
    <div className="mt-1 px-3 py-1 bg-purple-600/20 border border-purple-500/50 rounded text-xs text-purple-300 flex items-center gap-2">
      <span>🔮</span>
      <span>Combine Mode</span>
      <span className="text-purple-400/70">• ESC to cancel</span>
    </div>
  );
};

export default CombineModeIndicator;
