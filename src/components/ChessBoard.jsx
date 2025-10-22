import React, { useState, useEffect } from "react";
import {
  createInitialGameState,
  undoMove,
  redoMove,
  canUndo,
  canRedo,
  isCurrentPlayersPiece,
} from "../utils/gameState.js";
import { COLORS, getPieceColor } from "../utils/constants.js";
import { announceTurn, capitalizeColor } from "./helpers/messageHelpers.js";
import { getAllLegalMoves } from "../ai/alphaBeta.js";
import { getGameStatus } from "../utils/gameStatus.js";
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
import Timer from "./ui/Timer.jsx";

const ChessBoard = ({
  gameState: externalGameState = null,
  onGameStateChange = null,
  gameMode = "singlePlayer",
  playerColor = null,
  isConnected = false,
  timerStateRef = null,
  isReconnecting = false,
  isAiThinking = false,
  onResetToSinglePlayer = null,
}) => {
  // Use external game state if provided, otherwise use internal state
  const [internalGameState, setInternalGameState] = useState(
    createInitialGameState()
  );
  const gameState = externalGameState || internalGameState;

  // Game state updater - calls parent callback if provided
  const updateGameState = (newGameState) => {
    console.log("ChessBoard updateGameState called:", {
      hasCallback: !!onGameStateChange,
      gameMode,
      playerColor,
      newState: newGameState,
    });

    if (onGameStateChange) {
      onGameStateChange(newGameState);
    } else {
      setInternalGameState(newGameState);
    }
  };

  // console.log('ChessBoard - GameMode:', gameMode, 'PlayerColor:', playerColor, 'GameState:', gameState);
  const [message, setMessage] = useState("White to move");

  // Determine if board should be flipped (Black player in multiplayer)
  const isBoardFlipped =
    gameMode !== "singlePlayer" && playerColor === COLORS.BLACK;

  // Handle timer timeout
  const handleTimeout = (timedOutColor) => {
    // Only trigger once
    if (gameState.gameStatus?.isGameOver) return;

    // Update timer ref to show 0:00.0 for the timed out player
    if (timerStateRef) {
      if (timedOutColor === COLORS.WHITE) {
        timerStateRef.current.whiteTime = 0;
      } else {
        timerStateRef.current.blackTime = 0;
      }
    }

    const winner = timedOutColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    const newGameState = {
      ...gameState,
      gameStatus: {
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isGameOver: true,
        winner: winner,
        timeoutWinner: winner,
      },
    };
    updateGameState(newGameState);
    setMessage(`Time out! ${capitalizeColor(winner)} wins!`);
  };

  // Check game status after state changes
  useEffect(() => {
    const checkGameStatus = async () => {
      // Skip if game is already over
      if (gameState.gameStatus?.isGameOver) {
        return;
      }

      const status = await getGameStatus(gameState);

      // Update game state with new status if changed
      if (
        status.isCheckmate !== gameState.gameStatus?.isCheckmate ||
        status.isCheck !== gameState.gameStatus?.isCheck ||
        status.isStalemate !== gameState.gameStatus?.isStalemate
      ) {
        const newGameState = {
          ...gameState,
          gameStatus: status,
        };
        updateGameState(newGameState);

        // Update message based on priority: checkmate > stalemate > check > normal
        if (status.isCheckmate) {
          const winnerColor = capitalizeColor(status.winner);
          setMessage(`Checkmate! ${winnerColor} wins!`);
        } else if (status.isStalemate) {
          setMessage("Stalemate! The game is a draw.");
        } else if (status.isCheck) {
          setMessage(`${capitalizeColor(gameState.currentTurn)} is in check!`);
        } else {
          // Only update to normal message if not in any special state
          setMessage(`${capitalizeColor(gameState.currentTurn)} to move`);
        }
      } else if (gameState.gameStatus) {
        // Status hasn't changed, but make sure message reflects current status
        if (gameState.gameStatus.isCheckmate) {
          const winnerColor = capitalizeColor(gameState.gameStatus.winner);
          setMessage(`Checkmate! ${winnerColor} wins!`);
        } else if (gameState.gameStatus.isStalemate) {
          setMessage("Stalemate! The game is a draw.");
        } else if (gameState.gameStatus.isCheck) {
          setMessage(`${capitalizeColor(gameState.currentTurn)} is in check!`);
        }
        // Don't reset to normal message if we're in check
      }
    };

    checkGameStatus();
  }, [gameState.board, gameState.currentTurn]);

  // Move validation for multiplayer mode using existing utilities
  const canMakeMove = (piece, fromSquare = null) => {
    if (gameMode === "singlePlayer") {
      return true; // Allow any move in single player
    }

    if (!piece) return false;

    // Engine mode: only WHITE (player) can move, and not during AI thinking
    if (gameMode === "vsEngine") {
      const pieceColor = getPieceColor(piece);
      return (
        pieceColor === COLORS.WHITE &&
        gameState.currentTurn === COLORS.WHITE &&
        !isAiThinking
      );
    }

    // Multiplayer modes (host/guest): use existing utility functions
    const isMyTurn = gameState.currentTurn === playerColor;
    const isMyPiece = isCurrentPlayersPiece(piece, playerColor);

    // console.log(`Move validation - Piece: ${piece}, PlayerColor: ${playerColor}, CurrentTurn: ${gameState.currentTurn}, IsMyTurn: ${isMyTurn}, IsMyPiece: ${isMyPiece}`);

    return isMyTurn && isMyPiece;
  };

  // Promotion hook
  const { promotionDialog, openPromotionDialog, executePromotion } =
    usePromotion(gameState, updateGameState, setMessage);

  // Move handler hook
  const {
    selectedSquare,
    legalMoves,
    handleSquareClick: handleNormalMove,
    isSelected,
    isLegalMoveSquare,
    clearSelection,
  } = useMoveHandler(
    gameState,
    updateGameState,
    setMessage,
    openPromotionDialog
  );

  // useEffect(() => {
  //   console.log('Per-piece legal moves (useMoveHandler):', legalMoves);
  // }, [legalMoves]);

  // Log all legal moves from AI module
  // useEffect(() => {
  //   const allLegalMoves = getAllLegalMoves(
  //     gameState.board,
  //     gameState.currentTurn,
  //     gameState.castlingRights
  //   );
  //   console.log('All legal moves (getAllLegalMoves):', allLegalMoves);
  //   console.log('Total legal moves count:', allLegalMoves.length);
  // }, [gameState.board, gameState.currentTurn, gameState.castlingRights]);

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
  } = useCombineMode(gameState, updateGameState, setMessage);

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
  } = useDeCombineMode(gameState, updateGameState, setMessage);

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

  // Route square clicks with move validation
  const handleSquareClick = (row, col) => {
    // Prevent moves if game is over
    if (gameState.gameStatus?.isGameOver) {
      setMessage("Game is over. Please reset to start a new game.");
      return;
    }

    const piece = gameState.board[row][col];

    // For piece selection, check if we can move this piece
    if (piece && selectedSquare === null && !canMakeMove(piece, [row, col])) {
      // console.log(`Cannot select piece ${piece} - not your piece or not your turn`);
      setMessage(
        `It's ${gameState.currentTurn}'s turn. You can only move ${
          playerColor || "any"
        } pieces.`
      );
      return;
    }

    if (deCombine.mode) {
      handleDeCombineClick(row, col);
    } else if (combineMode) {
      handleCombineClick(row, col);
    } else {
      handleNormalMove(row, col);
    }
  };

  const handleCombineToggle = () => {
    if (gameState.gameStatus?.isGameOver) {
      setMessage("Game is over. Please reset to start a new game.");
      return;
    }

    // Disable combine when in check
    if (gameState.gameStatus?.isCheck) {
      setMessage("Cannot combine pieces while in check!");
      return;
    }

    if (combineMode) {
      exitCombineMode();
    } else {
      if (deCombine.mode) exitDeCombineMode();
      clearSelection();
      enterCombineMode();
    }
  };

  const handleDeCombineToggle = () => {
    if (gameState.gameStatus?.isGameOver) {
      setMessage("Game is over. Please reset to start a new game.");
      return;
    }

    // Disable decombine when in check
    if (gameState.gameStatus?.isCheck) {
      setMessage("Cannot de-combine pieces while in check!");
      return;
    }

    if (deCombine.mode) {
      exitDeCombineMode();
    } else {
      if (combineMode) exitCombineMode();
      clearSelection();
      enterDeCombineMode();
    }
  };

  const handleUndo = () => {
    // Disable undo/redo in multiplayer mode and engine mode (TODO: implement undo for engine mode)
    if (gameMode !== "singlePlayer") {
      setMessage(
        `Undo/Redo is disabled in ${
          gameMode === "vsEngine" ? "engine" : "multiplayer"
        } mode`
      );
      return;
    }

    const newState = undoMove(gameState);
    if (newState !== gameState) {
      updateGameState(newState);
      clearSelection();
      setMessage(`Undo - ${capitalizeColor(newState.currentTurn)} to move`);
    }
  };

  const handleRedo = () => {
    // Disable undo/redo in multiplayer mode and engine mode (TODO: implement redo for engine mode)
    if (gameMode !== "singlePlayer") {
      setMessage(
        `Undo/Redo is disabled in ${
          gameMode === "vsEngine" ? "engine" : "multiplayer"
        } mode`
      );
      return;
    }

    const newState = redoMove(gameState);
    if (newState !== gameState) {
      updateGameState(newState);
      clearSelection();
      setMessage(`Redo - ${capitalizeColor(newState.currentTurn)} to move`);
    }
  };

  const resetGame = () => {
    // If in engine mode, reset to single player mode
    if (gameMode === "vsEngine") {
      if (onResetToSinglePlayer) {
        onResetToSinglePlayer();
      }
      clearSelection();
      exitCombineMode();
      exitDeCombineMode();
      setMessage("Game reset - Single player mode");
      return;
    }

    // Standard single player reset
    const newState = createInitialGameState();
    updateGameState(newState);
    clearSelection();
    exitCombineMode();
    exitDeCombineMode();
    setMessage("White to move");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-0 sm:p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="flex flex-col items-center max-w-7xl w-full relative z-10">
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 mb-2 sm:mb-4 md:mb-6 drop-shadow-2xl tracking-tight animate-fade-in px-2">
          Interactive Chess
        </h1>

        <StatusMessage message={message} />
        {combineMode && <CombineModeIndicator />}
        {deCombine.mode && <DeCombineModeIndicator />}

        <div className="flex flex-col lg:flex-row gap-2 sm:gap-6 lg:gap-8 flex-wrap justify-center w-full px-0 sm:px-4">
          {/* Hide captured pieces on mobile, show on large screens */}
          <div className="hidden lg:block">
            <CapturedPieces
              title="Captured by White"
              pieces={gameState.capturedPieces.black}
              isWhitePieces={false}
            />
          </div>

          <div className="flex flex-col items-center gap-1 sm:gap-3 md:gap-4 flex-1 max-w-full lg:max-w-2xl">
            {/* Timer for top player (Black in normal view, White in flipped view) */}
            {(gameMode === "vsEngine" ||
              (gameMode !== "singlePlayer" && isConnected)) &&
              timerStateRef && (
                <Timer
                  timerStateRef={timerStateRef}
                  color={isBoardFlipped ? COLORS.WHITE : COLORS.BLACK}
                  currentTurn={gameState.currentTurn}
                  gameMode={gameMode}
                  isConnected={isConnected}
                  isReconnecting={isReconnecting}
                  onTimeout={handleTimeout}
                  isGameOver={gameState.gameStatus?.isGameOver || false}
                />
              )}

            <div className="flex items-center transform transition-all hover:scale-[1.01] sm:hover:scale-[1.02] w-full justify-center px-1 sm:px-0">
              <div className="flex flex-col-reverse gap-0 mr-0.5 sm:mr-2 md:mr-3">
                {(isBoardFlipped
                  ? [8, 7, 6, 5, 4, 3, 2, 1]
                  : [1, 2, 3, 4, 5, 6, 7, 8]
                ).map((rank) => (
                  <div
                    key={rank}
                    className="h-8 sm:h-12 md:h-14 lg:h-16 flex items-center text-amber-400 text-[10px] sm:text-sm md:text-base font-bold drop-shadow-lg"
                  >
                    {rank}
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center max-w-full">
                <div
                  className="grid grid-cols-8 gap-0 border-2 sm:border-4 md:border-8 border-gradient-to-br from-amber-700 via-yellow-800 to-amber-900 shadow-2xl overflow-hidden backdrop-blur-sm transition-transform duration-300"
                  style={{
                    borderImage:
                      "linear-gradient(135deg, #d97706, #b45309, #92400e) 1",
                    transform: isBoardFlipped
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    WebkitFontSmoothing: "antialiased",
                    WebkitBackfaceVisibility: "hidden",
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
                        spawnSelected: isSelectedSpawnSquare(
                          rowIndex,
                          colIndex
                        ),
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
                          isBoardFlipped={isBoardFlipped}
                        />
                      );
                    })
                  )}
                </div>

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
            </div>

            {/* Timer for bottom player (White in normal view, Black in flipped view) */}
            {(gameMode === "vsEngine" ||
              (gameMode !== "singlePlayer" && isConnected)) &&
              timerStateRef && (
                <Timer
                  timerStateRef={timerStateRef}
                  color={isBoardFlipped ? COLORS.BLACK : COLORS.WHITE}
                  currentTurn={gameState.currentTurn}
                  gameMode={gameMode}
                  isConnected={isConnected}
                  isReconnecting={isReconnecting}
                  onTimeout={handleTimeout}
                  isGameOver={gameState.gameStatus?.isGameOver || false}
                />
              )}
          </div>

          {/* Hide captured pieces on mobile, show on large screens */}
          <div className="hidden lg:block">
            <CapturedPieces
              title="Captured by Black"
              pieces={gameState.capturedPieces.white}
              isWhitePieces={true}
            />
          </div>
        </div>

        {/* Show captured pieces on mobile in a compact row */}
        <div className="lg:hidden flex flex-row gap-2 sm:gap-4 justify-center items-start mt-2 sm:mt-4 w-full px-1">
          <CapturedPieces
            title="Captured by White"
            pieces={gameState.capturedPieces.black}
            isWhitePieces={false}
          />
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
          gameMode={gameMode}
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
