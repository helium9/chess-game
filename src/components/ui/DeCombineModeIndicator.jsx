import React from "react";

/**
 * DeCombineModeIndicator component - shows when de-combine mode is active
 */
const DeCombineModeIndicator = () => {
  return (
    <div className="mb-3 sm:mb-4 px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg sm:rounded-xl font-semibold shadow-2xl border-2 border-teal-400 animate-pulse-subtle text-xs sm:text-sm md:text-base max-w-full mx-2">
      <span className="text-lg sm:text-xl md:text-2xl mr-2">⚡</span>
      <span className="hidden sm:inline">
        DE-COMBINE MODE ACTIVE - Press ESC to cancel
      </span>
      <span className="sm:hidden">DE-COMBINE MODE - ESC to cancel</span>
    </div>
  );
};

export default DeCombineModeIndicator;
