"use client";

import React from "react";
import { PIECE_SYMBOLS } from "../../utils/constants.js";
import { getPieceStyling } from "../helpers/squareStyling.js";

/**
 * DeCombineConfirmDialog component - chess.com-inspired minimal modal
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-5 shadow-xl max-w-sm w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decombine-dialog-title"
      >
        <h3
          id="decombine-dialog-title"
          className="text-center mb-3 text-base font-semibold text-[var(--text-primary)]"
        >
          Confirm Split
        </h3>
        
        <div className="text-center mb-4 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">Splitting:</span>
            <span
              className="text-2xl chess-piece"
              style={getPieceStyling(hybridPiece)}
            >
              {PIECE_SYMBOLS[hybridPiece]}
            </span>
          </div>
          
          <p className="text-sm text-[var(--text-primary)]">
            {assignment.description}
          </p>
          
          <p className="text-xs text-[var(--text-muted)]">
            Spawn square: <span className="font-mono font-medium">{toAlgebraic(selectedSquare.row, selectedSquare.col)}</span>
          </p>
        </div>
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] transition-colors"
            aria-label="Cancel and reselect"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="px-4 py-2 text-sm font-medium rounded bg-teal-600 hover:bg-teal-700 text-white transition-colors"
            aria-label="Confirm split"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeCombineConfirmDialog;
