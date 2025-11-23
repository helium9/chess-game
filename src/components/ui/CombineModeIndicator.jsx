"use client";

import React from "react";

/**
 * CombineModeIndicator component - shows when combine mode is active
 */
const CombineModeIndicator = () => {
  return (
    <div className="mb-2 sm:mb-3 md:mb-4 px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg sm:rounded-xl font-semibold shadow-2xl border-2 border-purple-400 animate-pulse-subtle text-xs sm:text-sm md:text-base max-w-full mx-1">
      <span className="text-lg sm:text-xl md:text-2xl mr-2">🔮</span>
      <span className="hidden sm:inline">
        COMBINE MODE ACTIVE - Press ESC to cancel
      </span>
      <span className="sm:hidden">COMBINE MODE - ESC to cancel</span>
    </div>
  );
};

export default CombineModeIndicator;
