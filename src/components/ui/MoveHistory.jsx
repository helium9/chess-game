"use client";

import React from "react";

/**
 * MoveHistory component - displays moves in algebraic notation
 * Uses descriptive text for combine/split moves
 */
const MoveHistory = ({ moveHistory = [], currentMoveIndex = null }) => {
  // Convert internal move format to algebraic notation
  const formatMove = (move) => {
    if (!move) return "";
    
    // Handle special move types
    if (move.type === "castling" || move.type === "castle") {
      return move.side === "kingside" ? "O-O" : "O-O-O";
    }
    
    // Combine move - descriptive text
    if (move.type === "combination" || move.type === "combine") {
      return "Combine";
    }
    
    // De-combine/Split move - descriptive text
    if (move.type === "de-combine" || move.type === "decombine") {
      return "Split";
    }
    
    // Standard move notation
    const piece = move.piece || "";
    const pieceSymbol = getPieceNotation(piece);
    const fromSquare = squareToNotation(move.from);
    const toSquare = squareToNotation(move.to);
    const capture = move.captured ? "x" : "";
    const promotion = move.promoteTo ? `=${getPieceNotation(move.promoteTo)}` : "";
    
    // Pawns don't show piece letter, but show file for captures
    if (pieceSymbol === "") {
      if (capture) {
        return `${fromSquare[0]}x${toSquare}${promotion}`;
      }
      return `${toSquare}${promotion}`;
    }
    
    return `${pieceSymbol}${capture}${toSquare}${promotion}`;
  };
  
  // Convert piece to notation letter
  const getPieceNotation = (piece) => {
    if (!piece) return "";
    const type = piece.toLowerCase();
    switch (type) {
      case "k": return "K";
      case "q": return "Q";
      case "r": return "R";
      case "b": return "B";
      case "n": return "N";
      case "p": return "";
      default: return piece.toUpperCase();
    }
  };
  
  // Convert row/col to algebraic notation
  const squareToNotation = (square) => {
    if (!square) return "";
    const files = "abcdefgh";
    const col = square.col ?? square[1];
    const row = square.row ?? square[0];
    return `${files[col]}${8 - row}`;
  };
  
  // Group moves into pairs (white, black)
  const movePairs = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moveHistory[i],
      black: moveHistory[i + 1] || null,
    });
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable move list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {movePairs.length === 0 ? (
          <div className="px-2 py-3 text-center text-[var(--text-muted)] text-xs">
            No moves yet
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr_1fr] text-xs">
            {movePairs.map((pair, index) => (
              <React.Fragment key={pair.number}>
                {/* Move number */}
                <span className="px-1.5 py-0.5 text-[var(--text-muted)] text-right border-r border-[var(--border-color)]">
                  {pair.number}.
                </span>
                
                {/* White's move */}
                <span
                  className={`px-2 py-0.5 font-medium cursor-pointer ${
                    currentMoveIndex === index * 2
                      ? "bg-[var(--accent-primary)] text-white"
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  {formatMove(pair.white)}
                </span>
                
                {/* Black's move */}
                <span
                  className={`px-2 py-0.5 font-medium cursor-pointer ${
                    pair.black
                      ? currentMoveIndex === index * 2 + 1
                        ? "bg-[var(--accent-primary)] text-white"
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {pair.black ? formatMove(pair.black) : ""}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoveHistory;
