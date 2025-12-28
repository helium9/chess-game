"use client";

import React from "react";
import ChessSquare from "./ChessSquare.jsx";

/**
 * Component that renders the 8x8 chess board grid with all squares.
 * Board has file/rank labels on all 4 sides for symmetry
 */
const BoardGrid = ({
  gameState,
  isBoardFlipped,
  // Selection/highlight functions
  isSelected,
  isLegalMoveSquare,
  // Combine mode
  isEligibleForCombine,
  isEligiblePartner,
  isCombineAnchor,
  combineMode,
  combineAnchor,
  // De-combine mode
  isEligibleForDeCombine,
  isSelectedHybrid,
  isSpawnSquare,
  isSelectedSpawnSquare,
  deCombine,
  // Event handlers
  handleSquareClick,
}) => {
  const files = isBoardFlipped
    ? ["h", "g", "f", "e", "d", "c", "b", "a"]
    : ["a", "b", "c", "d", "e", "f", "g", "h"];
  
  const ranks = isBoardFlipped
    ? [1, 2, 3, 4, 5, 6, 7, 8]
    : [8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <div className="flex flex-col items-center">
      {/* Top file labels */}
      <div className="flex">
        <div className="w-5 sm:w-6" /> {/* Corner spacer */}
        {files.map((letter) => (
          <div
            key={`top-${letter}`}
            className="chess-square-label text-center text-[var(--text-muted)] text-[10px] sm:text-xs font-medium"
          >
            {letter}
          </div>
        ))}
        <div className="w-5 sm:w-6" /> {/* Corner spacer */}
      </div>

      {/* Board with side rank labels */}
      <div className="flex">
        {/* Left rank labels */}
        <div className="flex flex-col">
          {ranks.map((rank) => (
            <div
              key={`left-${rank}`}
              className="chess-rank-label flex items-center justify-center text-[var(--text-muted)] text-[10px] sm:text-xs font-medium w-5 sm:w-6"
            >
              {rank}
            </div>
          ))}
        </div>

        {/* Board container - uses aspect-ratio to force square board */}
        <div
          className="grid grid-cols-8 gap-0 border-2 border-[var(--border-light)] rounded-sm shadow-xl overflow-hidden"
          style={{
            transform: isBoardFlipped ? "rotate(180deg)" : "rotate(0deg)",
            willChange: "transform",
            aspectRatio: "1 / 1",
            gridAutoRows: "1fr",
          }}
        >
          {gameState.board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const isLightSquare = (rowIndex + colIndex) % 2 === 0;

              // Last move highlighting logic
              let isLastMoveSource = false;
              let isLastMoveTarget = false;

              const lastMove =
                gameState.moveHistory.length > 0
                  ? gameState.moveHistory[gameState.moveHistory.length - 1]
                  : null;

              if (lastMove) {
                if (lastMove.type === "castle") {
                  // TODO: Highlight castling squares if desired
                } else if (lastMove.type === "combination") {
                  if (
                    lastMove.placement.row === rowIndex &&
                    lastMove.placement.col === colIndex
                  ) {
                    isLastMoveTarget = true;
                  }
                } else if (lastMove.type === "de-combine") {
                  if (
                    lastMove.selectedSquare.row === rowIndex &&
                    lastMove.selectedSquare.col === colIndex
                  ) {
                    isLastMoveTarget = true;
                  }
                  if (
                    lastMove.hybridSquare.row === rowIndex &&
                    lastMove.hybridSquare.col === colIndex
                  ) {
                    isLastMoveSource = true;
                  }
                } else if (lastMove.from && lastMove.to) {
                  if (
                    lastMove.from.row === rowIndex &&
                    lastMove.from.col === colIndex
                  ) {
                    isLastMoveSource = true;
                  }
                  if (
                    lastMove.to.row === rowIndex &&
                    lastMove.to.col === colIndex
                  ) {
                    isLastMoveTarget = true;
                  }
                }
              }

              const highlightState = {
                selected: isSelected(rowIndex, colIndex),
                isLegalMove: isLegalMoveSquare(rowIndex, colIndex),
                eligible: isEligibleForCombine(rowIndex, colIndex),
                partner: isEligiblePartner(rowIndex, colIndex),
                anchor: isCombineAnchor(rowIndex, colIndex),
                eligibleHybrid: isEligibleForDeCombine(rowIndex, colIndex),
                hybridSelected: isSelectedHybrid(rowIndex, colIndex),
                spawnSquare: isSpawnSquare(rowIndex, colIndex),
                spawnSelected: isSelectedSpawnSquare(rowIndex, colIndex),
                combineMode,
                hasAnchor: !!combineAnchor,
                isLocalCombine: combineMode && !!combineAnchor,
                deCombineMode: deCombine.mode,
                hasActiveHybrid: !!deCombine.activeHybrid,
                isLocalDeCombine: deCombine.isLocalMode,
                isLastMoveSource,
                isLastMoveTarget,
              };

              return (
                <ChessSquare
                  key={`${rowIndex}-${colIndex}`}
                  row={rowIndex}
                  col={colIndex}
                  piece={piece}
                  isLightSquare={isLightSquare}
                  highlightState={highlightState}
                  onClick={handleSquareClick}
                  isBoardFlipped={isBoardFlipped}
                />
              );
            })
          )}
        </div>

        {/* Right rank labels */}
        <div className="flex flex-col">
          {ranks.map((rank) => (
            <div
              key={`right-${rank}`}
              className="chess-rank-label flex items-center justify-center text-[var(--text-muted)] text-[10px] sm:text-xs font-medium w-5 sm:w-6"
            >
              {rank}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom file labels */}
      <div className="flex">
        <div className="w-5 sm:w-6" /> {/* Corner spacer */}
        {files.map((letter) => (
          <div
            key={`bottom-${letter}`}
            className="chess-square-label text-center text-[var(--text-muted)] text-[10px] sm:text-xs font-medium"
          >
            {letter}
          </div>
        ))}
        <div className="w-5 sm:w-6" /> {/* Corner spacer */}
      </div>
    </div>
  );
};

export default BoardGrid;
