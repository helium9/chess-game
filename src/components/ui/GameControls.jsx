import React from "react";
import { capitalizeColor } from "../helpers/messageHelpers.js";

/**
 * GameControls component - buttons for game actions
 */
const GameControls = ({
  gameState,
  onUndo,
  onRedo,
  onCombineToggle,
  onDeCombineToggle,
  onReset,
  combineMode,
  deCombineMode,
  promotionMode,
  canUndoMove,
  canRedoMove,
  hasEligiblePairs,
  hasEligibleHybrids,
}) => {
  // Disable undo/redo when any special mode is active
  const isSpecialModeActive = combineMode || deCombineMode || promotionMode;

  return (
    <div className="mt-8 flex gap-4 flex-wrap justify-center">
      {/* Undo button */}
      <button
        onClick={onUndo}
        disabled={!canUndoMove || isSpecialModeActive}
        aria-label="Undo last move"
        title={
          isSpecialModeActive
            ? "Cannot undo while in special mode"
            : "Undo last move"
        }
        className="px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl 
                    shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-orange-400
                    disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:opacity-50"
      >
        <span className="text-xl">↶ Undo</span>
      </button>

      {/* Redo button */}
      <button
        onClick={onRedo}
        disabled={!canRedoMove || isSpecialModeActive}
        aria-label="Redo last undone move"
        title={
          isSpecialModeActive
            ? "Cannot redo while in special mode"
            : "Redo last undone move"
        }
        className="px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl 
                    shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-orange-400
                    disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:opacity-50"
      >
        <span className="text-xl">↷ Redo</span>
      </button>

      {/* Combine button */}
      <button
        onClick={onCombineToggle}
        disabled={!combineMode && !hasEligiblePairs}
        role="button"
        aria-pressed={combineMode}
        aria-label={combineMode ? "Cancel Combine Mode" : "Enter Combine Mode"}
        className={`px-8 py-4 font-bold rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-400 ${
          combineMode
            ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
            : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:hover:scale-100"
        }`}
      >
        <span className="text-xl">
          {combineMode ? "❌ Cancel Combine" : "🔮 Combine Pieces"}
        </span>
      </button>

      {/* De-Combine button */}
      <button
        onClick={onDeCombineToggle}
        disabled={!deCombineMode && !hasEligibleHybrids}
        role="button"
        aria-pressed={deCombineMode}
        aria-label={
          deCombineMode ? "Cancel De-Combine Mode" : "Enter De-Combine Mode"
        }
        className={`px-8 py-4 font-bold rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-teal-400 ${
          deCombineMode
            ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
            : "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:hover:scale-100"
        }`}
      >
        <span className="text-xl">
          {deCombineMode ? "❌ Cancel De-Combine" : "⚡ De-Combine Pieces"}
        </span>
      </button>

      {/* Reset button */}
      <button
        onClick={onReset}
        aria-label="Reset Game"
        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl 
                    shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-400"
      >
        <span className="text-xl">🔄 Reset Game</span>
      </button>
    </div>
  );
};

export default GameControls;
