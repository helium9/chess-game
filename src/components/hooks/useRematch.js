"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook to handle rematch functionality: request, accept, decline, and related state.
 * 
 * @param {Object} options - Hook options
 * @param {Object} options.gameState - Current game state
 * @param {Function} options.updateGameState - Callback to update game state
 * @param {Function} options.setMessage - Callback to set status message
 * @param {string} options.playerColor - Player's color ('white' or 'black')
 * @param {Function} options.resetGame - Callback to reset the game
 * @param {Function} options.clearIdleTimeout - Callback to clear idle timeout
 * @param {boolean} options.isConnected - Whether WebRTC is connected
 * @param {Function} options.onDisconnect - Callback to disconnect WebRTC
 * @param {Function} options.sendDisconnectNotification - Callback to notify peer of disconnect
 * @returns {Object} - Rematch state and handlers
 */
const useRematch = ({
  gameState,
  updateGameState,
  setMessage,
  playerColor,
  resetGame,
  clearIdleTimeout = null,
  isConnected = false,
  onDisconnect = null,
  sendDisconnectNotification = null,
}) => {
  // Rematch dialog state
  const [rematchState, setRematchState] = useState({
    isOpen: false,
    requestFrom: null,
  });

  // Ref to track if we're showing the "connection ended" message
  const connectionEndedMsgRef = useRef(false);

  // Handle Rematch Request (Initiate)
  const handleRematchRequest = useCallback(() => {
    const newGameState = {
      ...gameState,
      rematchRequest: playerColor,
    };
    updateGameState(newGameState);
    setMessage("Rematch requested... waiting for opponent.");
  }, [gameState, playerColor, updateGameState, setMessage]);

  // Listen for incoming rematch requests
  useEffect(() => {
    if (gameState.rematchRequest && gameState.rematchRequest !== playerColor) {
      // Opponent requested rematch
      setRematchState({ isOpen: true, requestFrom: gameState.rematchRequest });
    }
  }, [gameState.rematchRequest, playerColor]);

  // Handle Accept Rematch
  const handleAcceptRematch = useCallback(() => {
    setRematchState({ isOpen: false, requestFrom: null });

    // Clear any pending idle timeout
    if (clearIdleTimeout) {
      clearIdleTimeout();
    }

    // Reset game - this will create new state without 'rematchRequest' property
    // and sync it to the opponent, effectively starting a new game
    resetGame();
  }, [clearIdleTimeout, resetGame]);

  // Handle Decline Rematch
  const handleDeclineRematch = useCallback(() => {
    setRematchState({ isOpen: false, requestFrom: null });
    setMessage("Rematch declined. Disconnecting...");

    // Sync decline to opponent
    const newGameState = {
      ...gameState,
      rematchRequest: null,
      rematchDeclined: true,
    };
    updateGameState(newGameState);

    // Clear any pending idle timeout
    if (clearIdleTimeout) {
      clearIdleTimeout();
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
  }, [
    gameState,
    updateGameState,
    setMessage,
    clearIdleTimeout,
    sendDisconnectNotification,
    onDisconnect,
  ]);

  // Listen for rematch declined by opponent - update message for the requesting player
  useEffect(() => {
    if (gameState.rematchDeclined && gameState.rematchRequest === null) {
      // This means opponent declined the rematch, show message
      // The actual disconnect will be triggered by the opponent via gracefulDisconnect
      setMessage("Connection ended");
      connectionEndedMsgRef.current = true;

      // Clear the message after 1 minute
      const timeoutId = setTimeout(() => {
        if (connectionEndedMsgRef.current) {
          setMessage("White to move");
          connectionEndedMsgRef.current = false;
        }
      }, 60000);

      return () => clearTimeout(timeoutId);
    }
  }, [gameState.rematchDeclined, gameState.rematchRequest, setMessage]);

  // Reset message when a new connection is established
  useEffect(() => {
    if (isConnected && connectionEndedMsgRef.current) {
      setMessage("White to move");
      connectionEndedMsgRef.current = false;
    }
  }, [isConnected, setMessage]);

  return {
    rematchState,
    handleRematchRequest,
    handleAcceptRematch,
    handleDeclineRematch,
  };
};

export default useRematch;
