"use client";

import React from "react";
import { PIECE_SYMBOLS } from "../../utils/constants.js";
import { getPieceStyling } from "../helpers/squareStyling.js";

/**
 * CapturedPieces component - displays captured pieces
 * Supports vertical stacking for mobile when many pieces captured
 */
const CapturedPieces = ({ 
  pieces = [], 
  isWhitePieces = true,
  title = "",
  compact = false,
  vertical = false, // Stack vertically when true
}) => {
  // Sort pieces by value (most valuable first)
  const pieceOrder = { q: 0, r: 1, b: 2, n: 3, p: 4 };
  const sortedPieces = [...pieces].sort((a, b) => {
    const aType = a.toLowerCase();
    const bType = b.toLowerCase();
    return (pieceOrder[aType] ?? 5) - (pieceOrder[bType] ?? 5);
  });

  const pieceColorClass = isWhitePieces ? "text-white" : "text-gray-900";

  if (compact) {
    // Compact mode for mobile/sidebar
    return (
      <div className={`${vertical ? "flex flex-wrap gap-0.5 max-w-[60px]" : "flex flex-wrap gap-0.5"}`}>
        {sortedPieces.length === 0 ? (
          <span className="text-[var(--text-muted)] text-xs">–</span>
        ) : (
          sortedPieces.map((piece, index) => (
            <span
              key={`${piece}-${index}`}
              className={`text-base leading-none ${pieceColorClass}`}
              style={{
                ...getPieceStyling(piece),
                fontFamily: "'Noto Sans Symbols 2', sans-serif",
              }}
            >
              {PIECE_SYMBOLS[piece]}
            </span>
          ))
        )}
      </div>
    );
  }

  // Full mode for sidebar
  return (
    <div className="flex flex-wrap gap-1">
      {sortedPieces.length === 0 ? (
        <span className="text-[var(--text-muted)] text-xs">None</span>
      ) : (
        sortedPieces.map((piece, index) => (
          <span
            key={`${piece}-${index}`}
            className={`text-xl leading-none ${pieceColorClass}`}
            style={{
              ...getPieceStyling(piece),
              fontFamily: "'Noto Sans Symbols 2', sans-serif",
            }}
          >
            {PIECE_SYMBOLS[piece]}
          </span>
        ))
      )}
    </div>
  );
};

export default CapturedPieces;
