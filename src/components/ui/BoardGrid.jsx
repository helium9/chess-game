"use client";

import React from "react";
import ChessSquare from "./ChessSquare.jsx";

/**
 * Component that renders the 8x8 chess board grid with all squares.
 * Handles last move highlighting and passes highlight states to ChessSquare.
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
  return (
    <div className="flex flex-col items-center max-w-full">
      <div
        className="grid grid-cols-8 gap-0 border-2 sm:border-4 md:border-8 border-gradient-to-br from-amber-700 via-yellow-800 to-amber-900 shadow-2xl overflow-hidden backdrop-blur-sm transition-transform duration-300"
        style={{
          borderImage: "linear-gradient(135deg, #d97706, #b45309, #92400e) 1",
          transform: isBoardFlipped ? "rotate(180deg)" : "rotate(0deg)",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitFontSmoothing: "antialiased",
          WebkitBackfaceVisibility: "hidden",
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
                  isLastMoveTarget = true; // Spawn square
                }
                if (
                  lastMove.hybridSquare.row === rowIndex &&
                  lastMove.hybridSquare.col === colIndex
                ) {
                  isLastMoveSource = true; // Original hybrid square
                }
              } else if (lastMove.from && lastMove.to) {
                // Normal move
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

      {/* File labels (a-h) */}
      <div className="flex mt-0.5 sm:mt-2 md:mt-3 gap-0">
        {(isBoardFlipped
          ? ["h", "g", "f", "e", "d", "c", "b", "a"]
          : ["a", "b", "c", "d", "e", "f", "g", "h"]
        ).map((letter) => (
          <div
            key={letter}
            className="w-8 sm:w-12 md:w-14 lg:w-16 text-center text-amber-400 text-[10px] sm:text-sm md:text-base font-bold drop-shadow-lg"
          >
            {letter}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoardGrid;
