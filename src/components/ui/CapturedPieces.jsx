"use client";

import React from "react";
import { PIECE_SYMBOLS } from "../../utils/constants.js";
import { getPieceStyling } from "../helpers/squareStyling.js";

/**
 * CapturedPieces component - displays captured pieces for one color
 */
const CapturedPieces = ({ title, pieces, isWhitePieces }) => {
  const textColorClass = isWhitePieces ? "text-white" : "text-gray-900";

  return (
    <div className="flex flex-col items-center transform transition-transform hover:scale-105">
      <h3 className="text-amber-300 text-xs sm:text-sm md:text-base font-bold mb-2 sm:mb-3 tracking-wide drop-shadow-lg">
        {title}
      </h3>
      <div className="min-h-12 sm:min-h-14 md:min-h-16 flex flex-wrap gap-1 sm:gap-2 items-start justify-center w-28 sm:w-32 md:w-36 bg-gradient-to-br from-slate-800 to-slate-900 p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 border-amber-600/40 shadow-2xl backdrop-blur-sm">
        {pieces.length > 0 ? (
          pieces.map((piece, idx) => {
            const pieceStyling = getPieceStyling(piece);
            return (
              <span
                key={idx}
                className={`text-xl sm:text-2xl md:text-3xl ${textColorClass} transition-transform hover:scale-125`}
                style={{
                  ...pieceStyling,
                  fontFamily:
                    "'Noto Sans Symbols 2', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif",
                }}
              >
                {PIECE_SYMBOLS[piece]}
              </span>
            );
          })
        ) : (
          <span className="text-gray-600 text-xs sm:text-sm italic">
            No captures
          </span>
        )}
      </div>
    </div>
  );
};

export default CapturedPieces;
