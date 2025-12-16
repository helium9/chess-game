"use client";

import React, { useState, useEffect } from "react";
import {
  createInitialGameState,
  undoMove,
  redoMove,
  canUndo,
  canRedo,
  isCurrentPlayersPiece,
} from "../utils/gameState.js";
import { COLORS, getPieceColor, isHybridPiece } from "../utils/constants.js";
import { canReachForCombine } from "../utils/combinationRules.js";
import { announceTurn, capitalizeColor } from "./helpers/messageHelpers.js";
import { getAllLegalMoves } from "../ai/chessRules.js";
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
import RematchDialog from "./ui/RematchDialog.jsx";
import GameLegend from "./ui/GameLegend.jsx";
import Timer from "./ui/Timer.jsx";
import { TIMER_CONFIG } from "../config/timerConfig.js";

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
  onDisconnect = null,
  sendDisconnectNotification = null,
}) => {
  // Idle timeout ref for disconnecting when no rematch is requested
  const idleTimeoutRef = React.useRef(null);
  // Idle timeout duration: 8 hours in milliseconds
  const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
  // Use external game state if provided, otherwise use internal state
  const [internalGameState, setInternalGameState] = useState(
    createInitialGameState()
  );
  const gameState = externalGameState || internalGameState;

  // Debug: Log when ChessBoard receives new gameState prop
  useEffect(() => {
    console.log("[SYNC DEBUG] ChessBoard gameState updated:", {
      currentTurn: gameState.currentTurn,
      hasExternalState: !!externalGameState,
      boardHash: JSON.stringify(gameState.board).slice(0, 100),
    });
  }, [gameState, externalGameState]);

  // Game state updater - calls parent callback if provided
  const updateGameState = (newGameState) => {
    console.log("[SYNC DEBUG] ChessBoard updateGameState called:", {
      hasCallback: !!onGameStateChange,
      gameMode,
      playerColor,
      newTurn: newGameState.currentTurn,
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

        // In multiplayer, only update game state (which broadcasts) if it's NOT our turn
        // This means we just made a move and should broadcast our updated status
        // When it IS our turn, we received a move from opponent and shouldn't echo it back
        // In single player and vsEngine modes, always update
        const isMultiplayer = gameMode === "host" || gameMode === "guest";
        const justMadeMove =
          isMultiplayer && gameState.currentTurn !== playerColor;
        const shouldBroadcast =
          gameMode === "singlePlayer" ||
          gameMode === "vsEngine" ||
          justMadeMove;

        if (shouldBroadcast) {
          updateGameState(newGameState);
        }

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
  }, [gameState.board, gameState.currentTurn, gameMode, playerColor]);

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
    combineAnchor,
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

  // Handle Double-Tap (Gesture for Combine/De-Combine)
  const handleDoubleTap = (row, col) => {
    // Prevent if game is over
    if (gameState.gameStatus?.isGameOver) return;
    
    // Check if we can select this piece (my turn, my piece)
    const piece = gameState.board[row][col];

    if (!canMakeMove(piece, [row, col])) {
      return; 
    }
    
    // 1. Try De-Combine Mode first (Priority if Hybrid)
    if (isHybridPiece(piece)) {
      // Check if this specific hybrid is eligible for de-combination
      // eligibleHybrids structure: { row, col, piece, spawnSquares }
      const isEligibleHybrid = eligibleHybrids.some(
        (h) => h.row === row && h.col === col
      );

      if (!isEligibleHybrid) return;

      // If we are already in combine mode, exit it
      if (combineMode) exitCombineMode();
      
      // Clear any normal selection
      clearSelection();
      
      // Enter De-Combine Mode with this piece selected
      enterDeCombineMode({ row, col });
    }
    // 2. Try Combine Mode
    else {
      // NEW LOGIC: Check if THIS piece (the one being held) can reach a combinable partner
      // Not symmetric - only the held piece should be able to move to partner
      const partnersThisPieceCanReach = eligiblePairs.filter(pair => {
        // Check if this piece is piece1 and can reach piece2
        if (pair.piece1.row === row && pair.piece1.col === col) {
          // Verify THIS piece can actually reach the partner (not the reverse)
          return canReachForCombine(
            gameState.board, 
            row, col, 
            pair.piece2.row, pair.piece2.col, 
            gameState.currentTurn
          );
        }
        // Check if this piece is piece2 and can reach piece1
        if (pair.piece2.row === row && pair.piece2.col === col) {
          return canReachForCombine(
            gameState.board, 
            row, col, 
            pair.piece1.row, pair.piece1.col, 
            gameState.currentTurn
          );
        }
        return false;
      });

      if (partnersThisPieceCanReach.length === 0) return;

      // If we are already in de-combine mode, exit it
      if (deCombine.mode) exitDeCombineMode();
      
      // Clear any normal selection
      clearSelection();
      
      // Enter Combine Mode with this piece selected
      enterCombineMode({ row, col });
    }
  };

  // Route square clicks with move validation
  const handleSquareClick = (row, col) => {
    // Prevent moves if game is over
    if (gameState.gameStatus?.isGameOver) {
      setMessage("Game is over. Please reset to start a new game.");
      return;
    }

    const piece = gameState.board[row][col];

    // DE-COMBINE MODE
    if (deCombine.mode) {
      // In LOCAL mode (double-tap), hybrid is already selected
      if (deCombine.isLocalMode && deCombine.activeHybrid) {
        // Check if clicking the hybrid itself
        if (deCombine.activeHybrid.row === row && deCombine.activeHybrid.col === col) {
          return;
        }
        // Check if clicking a spawn square - use direct check against eligibleSquares
        const isValidSpawn = deCombine.eligibleSquares.some(
          sq => sq.row === row && sq.col === col
        );
        if (isValidSpawn) {
          handleDeCombineClick(row, col);
        } else {
          exitDeCombineMode();
        }
      } 
      // In GLOBAL mode (button), let hook handle everything
      else {
        handleDeCombineClick(row, col);
      }
      return;
    }

    // COMBINE MODE
    if (combineMode) {
      // In LOCAL mode (double-tap, anchor is set), only respond to partners or exit
      if (combineAnchor) {
        if (isEligiblePartner(row, col)) {
          handleCombineClick(row, col);
        } else if (isCombineAnchor(row, col)) {
          // Clicking anchor again - do nothing
          return;
        } else {
          // Clicked elsewhere - exit LOCAL mode
          exitCombineMode();
        }
      }
      // In GLOBAL mode (button, no anchor yet), let hook handle everything  
      else {
        handleCombineClick(row, col);
      }
      return;
    }

    // NORMAL MODE - handle piece selection and moves
    // Check if we can move this piece
    if (piece && selectedSquare === null && !canMakeMove(piece, [row, col])) {
      setMessage(
        `It's ${gameState.currentTurn}'s turn. You can only move ${
          playerColor || "any"
        } pieces.`
      );
      return;
    }
    
    handleNormalMove(row, col);
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
    // Reset timer if available
    if (timerStateRef) {
      const initialTime = TIMER_CONFIG.getTimeValue(TIMER_CONFIG.DEFAULT);
      timerStateRef.current.whiteTime = initialTime;
      timerStateRef.current.blackTime = initialTime;
      timerStateRef.current.lastUpdate = Date.now();
    }

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

  // Rematch state
  const [rematchState, setRematchState] = useState({
     isOpen: false,
     requestFrom: null
  });

  // Handle Resign
  const handleResign = () => {
     if (gameState.gameStatus?.isGameOver) return;
     
     const winner = playerColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
     const newGameState = {
        ...gameState,
        gameStatus: {
           isGameOver: true,
           winner: winner,
           isResignation: true,
           resignedBy: playerColor // Track who resigned
        }
     };
     updateGameState(newGameState);
     setMessage(`${capitalizeColor(playerColor)} resigned. ${capitalizeColor(winner)} wins!`);
  };

  // Listen for resignation (to notify opponent)
  useEffect(() => {
    if (gameState.gameStatus?.isResignation && gameState.gameStatus?.resignedBy) {
      const resignedBy = gameState.gameStatus.resignedBy;
      const winner = gameState.gameStatus.winner;
      // Show message regardless of which player we are
      setMessage(`${capitalizeColor(resignedBy)} resigned. ${capitalizeColor(winner)} wins!`);
    }
  }, [gameState.gameStatus?.isResignation, gameState.gameStatus?.resignedBy, gameState.gameStatus?.winner]);

  // Handle Rematch Request (Initiate)
  const handleRematchRequest = () => {
     // Update game state with rematch request to sync with opponent
     const newGameState = {
        ...gameState,
        rematchRequest: playerColor
     };
     updateGameState(newGameState);
     setMessage("Rematch requested... waiting for opponent.");
  };

  // Listen for incoming rematch requests
  useEffect(() => {
    if (gameState.rematchRequest && gameState.rematchRequest !== playerColor) {
        // Opponent requested rematch
        setRematchState({ isOpen: true, requestFrom: gameState.rematchRequest });
    }
  }, [gameState.rematchRequest, playerColor]);

  const handleAcceptRematch = () => {
     setRematchState({ isOpen: false, requestFrom: null });
     
     // Clear any pending idle timeout
     if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
     }
     
     // Reset game - this will create new state without 'rematchRequest' property
     // and sync it to the opponent, effectively starting a new game (and closing their "waiting" state implicitly by state replacement)
     resetGame();
  };

  const handleDeclineRematch = () => {
   setRematchState({ isOpen: false, requestFrom: null });
   setMessage("Rematch declined. Disconnecting...");
   
   // Sync decline to opponent
   const newGameState = {
      ...gameState,
      rematchRequest: null,
      rematchDeclined: true 
   };
   updateGameState(newGameState);
   
   // Clear any pending idle timeout
   if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
   }
   
   // Disconnect after a short delay to allow the sync to complete
   setTimeout(() => {
      if (sendDisconnectNotification) {
         sendDisconnectNotification();
      }
      if (onDisconnect) {
         onDisconnect();
      }
   }, 500);
};

  // Listen for rematch declined by opponent - update message for the requesting player
  useEffect(() => {
    if (gameState.rematchDeclined && gameState.rematchRequest === null) {
      // This means opponent declined the rematch, show message
      // The actual disconnect will be triggered by the opponent via gracefulDisconnect
      setMessage("Connection ended");
    }
  }, [gameState.rematchDeclined, gameState.rematchRequest]);

  // Idle timeout: disconnect if no rematch is requested within 8 hours after game ends
  useEffect(() => {
    const isMultiplayer = gameMode === "host" || gameMode === "guest";
    
    // Only start timeout if game is over in multiplayer mode and connected
    if (gameState.gameStatus?.isGameOver && isMultiplayer && isConnected) {
      // Set an 8-hour timeout
      const timeoutId = setTimeout(() => {
        setMessage("Game ended 8 hours ago. Disconnecting due to inactivity.");
        if (sendDisconnectNotification) {
          sendDisconnectNotification();
        }
        if (onDisconnect) {
          onDisconnect();
        }
      }, IDLE_TIMEOUT_MS);
      idleTimeoutRef.current = timeoutId;
      
      return () => {
        clearTimeout(timeoutId);
        idleTimeoutRef.current = null;
      };
    }
  }, [gameState.gameStatus?.isGameOver, gameMode, isConnected, onDisconnect, sendDisconnectNotification]);


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

                      // Last move highlighting logic
                      let isLastMoveSource = false;
                      let isLastMoveTarget = false;
                      
                      const lastMove = gameState.moveHistory.length > 0 ? gameState.moveHistory[gameState.moveHistory.length - 1] : null;
                      
                      if (lastMove) {
                         if (lastMove.type === 'castle') {
                            // TODO: Highlight castling squares if desired
                         } else if (lastMove.type === 'combination') {
                            if (lastMove.placement.row === rowIndex && lastMove.placement.col === colIndex) {
                               isLastMoveTarget = true;
                            }
                            // Highlight original pieces positions? Maybe not needed as they are gone.
                         } else if (lastMove.type === 'de-combine') {
                            if (lastMove.selectedSquare.row === rowIndex && lastMove.selectedSquare.col === colIndex) {
                               isLastMoveTarget = true; // Spawn square
                            }
                            if (lastMove.hybridSquare.row === rowIndex && lastMove.hybridSquare.col === colIndex) {
                               isLastMoveSource = true; // Original hybrid square
                            }
                         } else if (lastMove.from && lastMove.to) {
                             // Normal move
                             if (lastMove.from.row === rowIndex && lastMove.from.col === colIndex) {
                                isLastMoveSource = true;
                             }
                             if (lastMove.to.row === rowIndex && lastMove.to.col === colIndex) {
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
                        hasAnchor: !!combineAnchor,
                        isLocalCombine: combineMode && !!combineAnchor, // Local if anchor set (via double-tap)
                        deCombineMode: deCombine.mode,
                        hasActiveHybrid: !!deCombine.activeHybrid,
                        isLocalDeCombine: deCombine.isLocalMode,
                        isLastMoveSource,
                        isLastMoveTarget
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
                          onDoubleTap={handleDoubleTap}
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
          onResign={handleResign}
          onRematchRequest={handleRematchRequest}
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

        <RematchDialog
           isOpen={rematchState.isOpen}
           requestFrom={rematchState.requestFrom}
           onAccept={handleAcceptRematch}
           onDecline={handleDeclineRematch}
        />

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
