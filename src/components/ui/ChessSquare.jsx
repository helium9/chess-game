import React from "react";
import { PIECE_SYMBOLS, isHybridPiece } from "../../utils/constants.js";
import { getSquareStyling, getPieceStyling } from "../helpers/squareStyling.js";

/**
 * ChessSquare component - renders a single square on the chess board
 */
const ChessSquare = ({
  row,
  col,
  piece,
  isLightSquare,
  highlightState,
  onClick,
  isBoardFlipped = false,
}) => {
  const styling = getSquareStyling(isLightSquare, highlightState);
  const { squareColor, ringClass, opacity, extraEffects } = styling;

  // Check if this is a capture move
  const isCapture =
    highlightState.isLegalMove && piece && !highlightState.combineMode;

  const pieceStyling = piece ? getPieceStyling(piece) : {};
  const pieceColorClass =
    piece && piece === piece.toUpperCase() ? "text-white" : "text-gray-900";

  return (
    <div
      onClick={() => onClick(row, col)}
      className={`w-16 h-16 flex items-center justify-center ${squareColor} ${opacity}
                hover:brightness-110 hover:scale-105 transition-all duration-200 cursor-pointer relative ${ringClass} ${extraEffects}`}
    >
      {piece && (
        <div className="relative transform transition-transform hover:scale-110" style={{ transform: isBoardFlipped ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <span
            className={`text-5xl select-none ${pieceColorClass}`}
            style={pieceStyling}
          >
            {PIECE_SYMBOLS[piece]}
          </span>
          {isHybridPiece(piece) && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
          )}
        </div>
      )}
      {/* Indicator for empty legal moves */}
      {highlightState.isLegalMove && !piece && !highlightState.combineMode && (
        <div className="w-5 h-5 bg-green-400 rounded-full opacity-70 shadow-lg animate-pulse"></div>
      )}
      {/* Indicator for capture moves */}
      {isCapture && (
        <div className="absolute inset-0 border-4 border-red-500 rounded opacity-60 pointer-events-none animate-pulse shadow-inner"></div>
      )}
    </div>
  );
};

export default ChessSquare;
