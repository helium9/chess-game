import React from "react";

/**
 * GameLegend component - displays game mode legends
 */
const GameLegend = ({ deCombineMode, combineMode }) => {
  return (
    <div className="mt-8 text-amber-200 text-base text-center space-y-2 bg-slate-900/50 backdrop-blur-sm px-6 py-4 rounded-xl border border-amber-600/30 shadow-xl">
      {deCombineMode ? (
        <>
          <p className="font-semibold">
            <span className="inline-block w-5 h-5 bg-teal-400 mr-2 rounded animate-pulse shadow-lg"></span>
            Eligible hybrids
          </p>
          <p className="font-semibold">
            <span className="inline-block w-5 h-5 bg-teal-500 mr-2 rounded shadow-lg"></span>
            Selected hybrid
          </p>
          <p className="font-semibold">
            <span className="inline-block w-5 h-5 bg-green-400 mr-2 rounded shadow-lg"></span>
            Available spawn squares
          </p>
          <p className="font-semibold">
            <span className="inline-block w-5 h-5 bg-lime-400 mr-2 rounded shadow-lg"></span>
            Selected spawn square
          </p>
          <p className="text-sm mt-3 text-amber-300/80 italic">
            Click a hybrid, then click an adjacent empty square to place
            components
          </p>
        </>
      ) : !combineMode ? (
        <>
          <p className="font-semibold">
            <span className="inline-block w-5 h-5 bg-yellow-400 mr-2 rounded shadow-lg"></span>
            Selected piece
          </p>
          <p className="font-semibold">
            <span className="inline-block w-5 h-5 bg-green-500 mr-2 rounded-full shadow-lg"></span>
            Legal moves
          </p>
          <p className="text-sm mt-3 text-amber-300/80 italic">
            Click a piece to select it, then click a highlighted square to move
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold">
            <span className="inline-block w-5 h-5 bg-blue-400 mr-2 rounded animate-pulse shadow-lg"></span>
            Eligible for combination
          </p>
          <p className="font-semibold">
            <span className="inline-block w-5 h-5 bg-purple-400 mr-2 rounded shadow-lg"></span>
            Selected anchor
          </p>
          <p className="font-semibold">
            <span className="inline-block w-5 h-5 bg-purple-300 mr-2 rounded shadow-lg"></span>
            Eligible partners
          </p>
          <p className="font-semibold">
            <span className="inline-block w-4 h-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full mr-2 shadow-lg"></span>
            Hybrid piece
          </p>
          <p className="text-sm mt-3 text-amber-300/80 italic">
            Click an eligible piece, then click a partner to combine them
          </p>
        </>
      )}
    </div>
  );
};

export default GameLegend;
