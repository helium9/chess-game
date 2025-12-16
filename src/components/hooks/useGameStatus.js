"use client";

import { useEffect, useCallback } from "react";
import { getGameStatus } from "../../utils/gameStatus.js";
import { capitalizeColor } from "../helpers/messageHelpers.js";

/**
 * Hook to handle game status checking (checkmate, stalemate, check).
 * 
 * @param {Object} options - Hook options
 * @param {Object} options.gameState - Current game state
 * @param {Function} options.updateGameState - Callback to update game state
 * @param {Function} options.setMessage - Callback to set status message
 * @param {string} options.gameMode - Current game mode
 * @param {string} options.playerColor - Player's color ('white' or 'black')
 */
const useGameStatus = ({
  gameState,
  updateGameState,
  setMessage,
  gameMode,
  playerColor,
}) => {
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
  }, [
    gameState.board,
    gameState.currentTurn,
    gameState.gameStatus,
    gameMode,
    playerColor,
    updateGameState,
    setMessage,
    gameState,
  ]);
};

export default useGameStatus;
