import React from "react";
import { PIECE_SYMBOLS } from "../../utils/constants.js";

/**
 * CapturedPieces component - displays captured pieces for one color
 */
const CapturedPieces = ({ title, pieces, isWhitePieces }) => {
  const textColorClass = isWhitePieces ? "text-white" : "text-gray-900";
  const shadowStyle = isWhitePieces
    ? { textShadow: "3px 3px 6px rgba(0,0,0,0.9)" }
    : { textShadow: "2px 2px 4px rgba(255,255,255,0.9)" };

  return (
    <div className="flex flex-col items-center transform transition-transform hover:scale-105">
      <h3 className="text-amber-300 text-base font-bold mb-3 tracking-wide drop-shadow-lg">
        {title}
      </h3>
      <div className="min-h-16 flex flex-wrap gap-2 items-start justify-center w-36 bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-xl border-2 border-amber-600/40 shadow-2xl backdrop-blur-sm">
        {pieces.length > 0 ? (
          pieces.map((piece, idx) => (
            <span
              key={idx}
              className={`text-3xl ${textColorClass} transition-transform hover:scale-125`}
              style={shadowStyle}
            >
              {PIECE_SYMBOLS[piece]}
            </span>
          ))
        ) : (
          <span className="text-gray-600 text-sm italic">No captures yet</span>
        )}
      </div>
    </div>
  );
};

export default CapturedPieces;
