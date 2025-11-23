"use client";

import React from "react";
import { PIECE_SYMBOLS } from "../../utils/constants.js";

/**
 * DeCombineConfirmDialog component - confirms de-combination action
 */
const DeCombineConfirmDialog = ({
  isOpen,
  hybridPiece,
  assignment,
  selectedSquare,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const toAlgebraic = (row, col) => String.fromCharCode(97 + col) + (8 - row);

  return (
    <div
      className="mt-4 sm:mt-6 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 bg-gradient-to-br from-teal-700 via-teal-800 to-cyan-900 text-white rounded-xl sm:rounded-2xl shadow-2xl border-2 border-teal-400 max-w-xs sm:max-w-md md:max-w-lg mx-auto backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decombine-dialog-title"
    >
      <h3
        id="decombine-dialog-title"
        className="text-center mb-3 sm:mb-4 text-lg sm:text-xl font-bold"
      >
        Confirm De-Combination
      </h3>
      <div className="text-center mb-3 sm:mb-4 space-y-1.5 sm:space-y-2">
        <p className="text-base sm:text-lg">
          Hybrid:{" "}
          <span className="text-2xl sm:text-3xl">
            {PIECE_SYMBOLS[hybridPiece]}
          </span>
        </p>
        <p className="text-sm sm:text-base text-teal-200">
          → {assignment.description}
        </p>
        <p className="text-xs sm:text-sm text-teal-300 italic">
          Spawn: {toAlgebraic(selectedSquare.row, selectedSquare.col)}
        </p>
      </div>
      <div className="flex gap-2 sm:gap-3 md:gap-4 justify-center">
        <button
          onClick={onConfirm}
          autoFocus
          className="px-4 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-lg sm:rounded-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 focus:ring-2 sm:focus:ring-4 focus:ring-green-400 text-sm sm:text-base"
          aria-label="Confirm de-combination"
        >
          ✓ Confirm
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold rounded-lg sm:rounded-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 focus:ring-2 sm:focus:ring-4 focus:ring-gray-500 text-sm sm:text-base"
          aria-label="Cancel and reselect"
        >
          ✗ Reselect
        </button>
      </div>
    </div>
  );
};

export default DeCombineConfirmDialog;
