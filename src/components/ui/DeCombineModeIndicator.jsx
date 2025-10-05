import React from "react";

/**
 * DeCombineModeIndicator component - shows when de-combine mode is active
 */
const DeCombineModeIndicator = () => {
  return (
    <div className="mb-4 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold shadow-2xl border-2 border-teal-400 animate-pulse-subtle">
      <span className="text-2xl mr-2">⚡</span>
      DE-COMBINE MODE ACTIVE - Press ESC to cancel
    </div>
  );
};

export default DeCombineModeIndicator;
