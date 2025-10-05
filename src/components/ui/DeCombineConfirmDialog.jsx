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
      className="mt-6 px-8 py-6 bg-gradient-to-br from-teal-700 via-teal-800 to-cyan-900 text-white rounded-2xl shadow-2xl border-2 border-teal-400 max-w-lg mx-auto backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decombine-dialog-title"
    >
      <h3
        id="decombine-dialog-title"
        className="text-center mb-4 text-xl font-bold"
      >
        Confirm De-Combination
      </h3>
      <div className="text-center mb-4 space-y-2">
        <p className="text-lg">
          Hybrid: <span className="text-3xl">{PIECE_SYMBOLS[hybridPiece]}</span>
        </p>
        <p className="text-md text-teal-200">→ {assignment.description}</p>
        <p className="text-sm text-teal-300 italic">
          Spawn square: {toAlgebraic(selectedSquare.row, selectedSquare.col)}
        </p>
      </div>
      <div className="flex gap-4 justify-center">
        <button
          onClick={onConfirm}
          autoFocus
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 focus:ring-4 focus:ring-green-400"
          aria-label="Confirm de-combination"
        >
          ✓ Confirm
        </button>
        <button
          onClick={onCancel}
          className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold rounded-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 focus:ring-4 focus:ring-gray-500"
          aria-label="Cancel and reselect"
        >
          ✗ Reselect
        </button>
      </div>
    </div>
  );
};

export default DeCombineConfirmDialog;
