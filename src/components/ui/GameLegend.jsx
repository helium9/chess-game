"use client";

import React from "react";

/**
 * GameLegend component - displays game mode legends
 */
const GameLegend = ({ deCombineMode, combineMode }) => {
  return (
    <div className="mt-4 sm:mt-6 md:mt-8 text-amber-200 text-xs sm:text-sm md:text-base text-center space-y-1.5 sm:space-y-2 bg-slate-900/50 backdrop-blur-sm px-3 py-3 sm:px-4 sm:py-3 md:px-6 md:py-4 rounded-lg sm:rounded-xl border border-amber-600/30 shadow-xl max-w-full mx-2">
      {deCombineMode ? (
        <>
          <p className="font-semibold flex items-center justify-center">
            <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 bg-teal-400 mr-2 rounded animate-pulse shadow-lg"></span>
            Eligible hybrids
          </p>
          <p className="font-semibold flex items-center justify-center">
            <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 bg-teal-500 mr-2 rounded shadow-lg"></span>
            Selected hybrid
          </p>
          <p className="font-semibold flex items-center justify-center">
            <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 bg-green-400 mr-2 rounded shadow-lg"></span>
            Spawn squares
          </p>
          <p className="font-semibold flex items-center justify-center">
            <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 bg-lime-400 mr-2 rounded shadow-lg"></span>
            Selected spawn
          </p>
          <p className="text-xs sm:text-sm mt-2 sm:mt-3 text-amber-300/80 italic">
            Click hybrid, then empty square
          </p>
        </>
      ) : !combineMode ? (
        <>
          <p className="font-semibold flex items-center justify-center">
            <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 bg-yellow-400 mr-2 rounded shadow-lg"></span>
            Selected piece
          </p>
          <p className="font-semibold flex items-center justify-center">
            <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 bg-green-500 mr-2 rounded-full shadow-lg"></span>
            Legal moves
          </p>
          <p className="text-xs sm:text-sm mt-2 sm:mt-3 text-amber-300/80 italic">
            Click piece, then highlighted square
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold flex items-center justify-center">
            <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 bg-blue-400 mr-2 rounded animate-pulse shadow-lg"></span>
            Eligible
          </p>
          <p className="font-semibold flex items-center justify-center">
            <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 bg-purple-400 mr-2 rounded shadow-lg"></span>
            Anchor
          </p>
          <p className="font-semibold flex items-center justify-center">
            <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 bg-purple-300 mr-2 rounded shadow-lg"></span>
            Partners
          </p>
          <p className="font-semibold flex items-center justify-center">
            <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full mr-2 shadow-lg"></span>
            Hybrid
          </p>
          <p className="text-xs sm:text-sm mt-2 sm:mt-3 text-amber-300/80 italic">
            Click eligible, then partner
          </p>
        </>
      )}
    </div>
  );
};

export default GameLegend;
