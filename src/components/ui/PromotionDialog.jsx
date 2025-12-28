"use client";

import React from "react";
import { getPieceStyling } from "../helpers/squareStyling.js";

/**
 * PromotionDialog component - shows correct pieces based on turn color
 */
const PromotionDialog = ({ isOpen, currentTurn, onPromote }) => {
  if (!isOpen) return null;

  const isWhite = currentTurn === "white";
  
  // Define pieces with correct symbols for each color
  const pieces = [
    { 
      key: isWhite ? "Q" : "q", 
      symbol: isWhite ? "♕" : "♛", 
      name: "Queen" 
    },
    { 
      key: isWhite ? "R" : "r", 
      symbol: isWhite ? "♖" : "♜", 
      name: "Rook" 
    },
    { 
      key: isWhite ? "B" : "b", 
      symbol: isWhite ? "♗" : "♝", 
      name: "Bishop" 
    },
    { 
      key: isWhite ? "N" : "n", 
      symbol: isWhite ? "♘" : "♞", 
      name: "Knight" 
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4 shadow-xl max-w-sm w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-dialog-title"
      >
        <h3
          id="promotion-dialog-title"
          className="text-center mb-3 text-base font-semibold text-[var(--text-primary)]"
        >
          Promote Pawn
        </h3>
        
        <div className="flex gap-2 justify-center">
          {pieces.map((piece) => (
            <button
              key={piece.key}
              onClick={() => onPromote(piece.key)}
              autoFocus={piece.name === "Queen"}
              className={`w-14 h-14 flex items-center justify-center rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] ${
                isWhite 
                  ? "bg-[var(--board-light)] hover:bg-[var(--accent-primary)]" 
                  : "bg-[var(--bg-elevated)] hover:bg-[var(--accent-primary)]"
              }`}
              aria-label={`Promote to ${piece.name}`}
              title={piece.name}
            >
              <span
                className={`text-3xl chess-piece ${isWhite ? "text-white" : "text-gray-900"}`}
                style={getPieceStyling(piece.key)}
              >
                {piece.symbol}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromotionDialog;
