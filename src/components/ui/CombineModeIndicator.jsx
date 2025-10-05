import React from "react";

/**
 * CombineModeIndicator component - shows when combine mode is active
 */
const CombineModeIndicator = () => {
  return (
    <div className="mb-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold shadow-2xl border-2 border-purple-400 animate-pulse-subtle">
      <span className="text-2xl mr-2">🔮</span>
      COMBINE MODE ACTIVE - Press ESC to cancel
    </div>
  );
};

export default CombineModeIndicator;
