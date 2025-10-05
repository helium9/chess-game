import React, { useState, useEffect } from "react";
import {
  createInitialGameState,
  undoMove,
  redoMove,
  canUndo,
  canRedo,
} from "../utils/gameState.js";
import { announceTurn, capitalizeColor } from "./helpers/messageHelpers.js";
import { useCombineMode } from "./hooks/useCombineMode.js";
import { useDeCombineMode } from "./hooks/useDeCombineMode.js";
import { usePromotion } from "./hooks/usePromotion.js";
import { useMoveHandler } from "./hooks/useMoveHandler.js";
import StatusMessage from "./ui/StatusMessage.jsx";
import CombineModeIndicator from "./ui/CombineModeIndicator.jsx";
import DeCombineModeIndicator from "./ui/DeCombineModeIndicator.jsx";
import CapturedPieces from "./ui/CapturedPieces.jsx";
import ChessSquare from "./ui/ChessSquare.jsx";
import GameControls from "./ui/GameControls.jsx";
import PromotionDialog from "./ui/PromotionDialog.jsx";
import DeCombineConfirmDialog from "./ui/DeCombineConfirmDialog.jsx";
import GameLegend from "./ui/GameLegend.jsx";

const ChessBoard = () => {
  const [gameState, setGameState] = useState(createInitialGameState());
  const [message, setMessage] = useState("White to move");

  // Promotion hook
  const { promotionDialog, openPromotionDialog, executePromotion } =
    usePromotion(gameState, setGameState, setMessage);

  // Move handler hook
  const {
    selectedSquare,
    legalMoves,
    handleSquareClick: handleNormalMove,
    isSelected,
    isLegalMoveSquare,
    clearSelection,
  } = useMoveHandler(gameState, setGameState, setMessage, openPromotionDialog);

  // Combine mode hook
  const {
    combineMode,
    eligiblePairs,
    enterCombineMode,
    exitCombineMode,
    handleCombineClick,
    isEligibleForCombine,
    isEligiblePartner,
    isCombineAnchor,
  } = useCombineMode(gameState, setGameState, setMessage);

  // De-combine mode hook
  const {
    deCombine,
    eligibleHybrids,
    enterDeCombineMode,
    exitDeCombineMode,
    handleDeCombineClick,
    executeDeCombine,
    closeConfirmDialog,
    handleDeCombineEscape,
    isEligibleForDeCombine,
    isSelectedHybrid,
    isSpawnSquare,
    isSelectedSpawnSquare,
  } = useDeCombineMode(gameState, setGameState, setMessage);

  // Keyboard handler
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        if (combineMode) {
          exitCombineMode();
        } else if (deCombine.mode) {
          handleDeCombineEscape();
        }
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [combineMode, deCombine.mode, exitCombineMode, handleDeCombineEscape]);

  // Route square clicks
  const handleSquareClick = (row, col) => {
    if (deCombine.mode) {
      handleDeCombineClick(row, col);
    } else if (combineMode) {
      handleCombineClick(row, col);
    } else {
      handleNormalMove(row, col);
    }
  };

  const handleCombineToggle = () => {
    if (combineMode) {
      exitCombineMode();
    } else {
      if (deCombine.mode) exitDeCombineMode();
      clearSelection();
      enterCombineMode();
    }
  };

  const handleDeCombineToggle = () => {
    if (deCombine.mode) {
      exitDeCombineMode();
    } else {
      if (combineMode) exitCombineMode();
      clearSelection();
      enterDeCombineMode();
    }
  };

  const handleUndo = () => {
    const newState = undoMove(gameState);
    if (newState !== gameState) {
      setGameState(newState);
      clearSelection();
      setMessage(`Undo - ${capitalizeColor(newState.currentTurn)} to move`);
    }
  };

  const handleRedo = () => {
    const newState = redoMove(gameState);
    if (newState !== gameState) {
      setGameState(newState);
      clearSelection();
      setMessage(`Redo - ${capitalizeColor(newState.currentTurn)} to move`);
    }
  };

  const resetGame = () => {
    setGameState(createInitialGameState());
    clearSelection();
    exitCombineMode();
    exitDeCombineMode();
    setMessage("White to move");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="flex flex-col items-center max-w-6xl w-full relative z-10">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 mb-6 drop-shadow-2xl tracking-tight animate-fade-in">
          Interactive Chess
        </h1>

        <StatusMessage message={message} />
        {combineMode && <CombineModeIndicator />}
        {deCombine.mode && <DeCombineModeIndicator />}

        <div className="flex gap-8 flex-wrap justify-center">
          <CapturedPieces
            title="Captured by White"
            pieces={gameState.capturedPieces.black}
            isWhitePieces={false}
          />

          <div className="flex items-center transform transition-all hover:scale-[1.02]">
            <div className="flex flex-col-reverse gap-0 mr-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((rank) => (
                <div
                  key={rank}
                  className="h-16 flex items-center text-amber-400 text-base font-bold drop-shadow-lg"
                >
                  {rank}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center">
              <div
                className="grid grid-cols-8 gap-0 border-8 border-gradient-to-br from-amber-700 via-yellow-800 to-amber-900 shadow-2xl rounded-lg overflow-hidden backdrop-blur-sm"
                style={{
                  borderImage:
                    "linear-gradient(135deg, #d97706, #b45309, #92400e) 1",
                }}
              >
                {gameState.board.map((row, rowIndex) =>
                  row.map((piece, colIndex) => {
                    const isLightSquare = (rowIndex + colIndex) % 2 === 0;
                    const highlightState = {
                      selected: isSelected(rowIndex, colIndex),
                      isLegalMove: isLegalMoveSquare(rowIndex, colIndex),
                      eligible: isEligibleForCombine(rowIndex, colIndex),
                      partner: isEligiblePartner(rowIndex, colIndex),
                      anchor: isCombineAnchor(rowIndex, colIndex),
                      eligibleHybrid: isEligibleForDeCombine(
                        rowIndex,
                        colIndex
                      ),
                      hybridSelected: isSelectedHybrid(rowIndex, colIndex),
                      spawnSquare: isSpawnSquare(rowIndex, colIndex),
                      spawnSelected: isSelectedSpawnSquare(rowIndex, colIndex),
                      combineMode,
                      deCombineMode: deCombine.mode,
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
                      />
                    );
                  })
                )}
              </div>

              <div className="flex mt-3 gap-0">
                {["a", "b", "c", "d", "e", "f", "g", "h"].map((letter) => (
                  <div
                    key={letter}
                    className="w-16 text-center text-amber-400 text-base font-bold drop-shadow-lg"
                  >
                    {letter}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <CapturedPieces
            title="Captured by Black"
            pieces={gameState.capturedPieces.white}
            isWhitePieces={true}
          />
        </div>

        <GameControls
          gameState={gameState}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onCombineToggle={handleCombineToggle}
          onDeCombineToggle={handleDeCombineToggle}
          onReset={resetGame}
          combineMode={combineMode}
          deCombineMode={deCombine.mode}
          promotionMode={promotionDialog.isOpen}
          canUndoMove={canUndo(gameState)}
          canRedoMove={canRedo(gameState)}
          hasEligiblePairs={eligiblePairs.length > 0}
          hasEligibleHybrids={eligibleHybrids.length > 0}
        />

        {deCombine.isConfirmOpen &&
          deCombine.activeHybrid &&
          deCombine.selectedSquare &&
          deCombine.assignment && (
            <DeCombineConfirmDialog
              isOpen={true}
              hybridPiece={deCombine.activeHybrid.piece}
              assignment={deCombine.assignment}
              selectedSquare={deCombine.selectedSquare}
              onConfirm={executeDeCombine}
              onCancel={closeConfirmDialog}
            />
          )}

        <PromotionDialog
          isOpen={promotionDialog.isOpen}
          currentTurn={gameState.currentTurn}
          onPromote={executePromotion}
        />

        <GameLegend deCombineMode={deCombine.mode} combineMode={combineMode} />
      </div>
    </div>
  );
};

export default ChessBoard;
