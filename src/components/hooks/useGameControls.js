"use client";

import { useEffect, useCallback } from "react";
import { undoMove, redoMove, createInitialGameState } from "../../utils/gameState.js";
import { COLORS } from "../../utils/constants.js";
import { capitalizeColor } from "../helpers/messageHelpers.js";
import { TIMER_CONFIG } from "../../config/timerConfig.js";

/**
 * Hook to handle game control actions: undo, redo, reset, and resign.
 * 
 * @param {Object} options - Hook options
 * @param {Object} options.gameState - Current game state
 * @param {Function} options.updateGameState - Callback to update game state
 * @param {Function} options.setMessage - Callback to set status message
 * @param {string} options.gameMode - Current game mode
 * @param {string} options.playerColor - Player's color ('white' or 'black')
 * @param {Object} options.timerStateRef - Ref to timer state
 * @param {Function} options.onResetToSinglePlayer - Callback when resetting from engine mode
 * @param {Function} options.clearSelection - Callback to clear piece selection
 * @param {Function} options.exitCombineMode - Callback to exit combine mode
 * @param {Function} options.exitDeCombineMode - Callback to exit de-combine mode
 * @returns {Object} - { handleUndo, handleRedo, resetGame, handleResign }
 */
const useGameControls = ({
  gameState,
  updateGameState,
  setMessage,
  gameMode,
  playerColor,
  timerStateRef = null,
  onResetToSinglePlayer = null,
  clearSelection,
  exitCombineMode,
  exitDeCombineMode,
  selectedTimeControl = null,
}) => {
  // Handle Undo
  const handleUndo = useCallback(() => {
    // Disable undo/redo in multiplayer mode and engine mode
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
  }, [gameMode, gameState, updateGameState, clearSelection, setMessage]);

  // Handle Redo
  const handleRedo = useCallback(() => {
    // Disable undo/redo in multiplayer mode and engine mode
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
  }, [gameMode, gameState, updateGameState, clearSelection, setMessage]);

  // Reset Game - accepts optional timerOverride for rematch scenarios
  const resetGame = useCallback((timerOverride = null) => {
    // Reset timer if available
    // Priority: timerOverride (from rematch) > selectedTimeControl > DEFAULT
    if (timerStateRef) {
      const timeControlToUse = timerOverride || selectedTimeControl || TIMER_CONFIG.DEFAULT;
      const initialTime = TIMER_CONFIG.getTimeValue(timeControlToUse);
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
  }, [
    timerStateRef,
    gameMode,
    onResetToSinglePlayer,
    updateGameState,
    clearSelection,
    exitCombineMode,
    exitDeCombineMode,
    setMessage,
    selectedTimeControl,
  ]);

  // Handle Resign
  const handleResign = useCallback(() => {
    if (gameState.gameStatus?.isGameOver) return;

    const winner = playerColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    const newGameState = {
      ...gameState,
      gameStatus: {
        isGameOver: true,
        winner: winner,
        isResignation: true,
        resignedBy: playerColor,
      },
    };
    updateGameState(newGameState);
    setMessage(
      `${capitalizeColor(playerColor)} resigned. ${capitalizeColor(winner)} wins!`
    );
  }, [gameState, playerColor, updateGameState, setMessage]);

  // Listen for resignation (to notify opponent)
  useEffect(() => {
    if (
      gameState.gameStatus?.isResignation &&
      gameState.gameStatus?.resignedBy
    ) {
      const resignedBy = gameState.gameStatus.resignedBy;
      const winner = gameState.gameStatus.winner;
      // Show message regardless of which player we are
      setMessage(
        `${capitalizeColor(resignedBy)} resigned. ${capitalizeColor(winner)} wins!`
      );
    }
  }, [
    gameState.gameStatus?.isResignation,
    gameState.gameStatus?.resignedBy,
    gameState.gameStatus?.winner,
    setMessage,
  ]);

  return {
    handleUndo,
    handleRedo,
    resetGame,
    handleResign,
  };
};

export default useGameControls;
