"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook to handle rematch functionality: request, accept, decline, and related state.
 * Now includes selectedTimeControl to show proposed timer in rematch request.
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
  selectedTimeControl = null,
}) => {
  // Rematch dialog state
  const [rematchState, setRematchState] = useState({
    isOpen: false,
    requestFrom: null,
    proposedTimer: null, // Timer proposed by the requester
  });

  // Ref to track if we're showing the "connection ended" message
  const connectionEndedMsgRef = useRef(false);

  // Handle Rematch Request (Initiate)
  const handleRematchRequest = useCallback(() => {
    const newGameState = {
      ...gameState,
      rematchRequest: playerColor,
      rematchTimer: selectedTimeControl, // Include the selected timer in the request
    };
    updateGameState(newGameState);
    setMessage(`Rematch requested with ${selectedTimeControl || "current"} timer... waiting for opponent.`);
  }, [gameState, playerColor, selectedTimeControl, updateGameState, setMessage]);

  // Listen for incoming rematch requests
  useEffect(() => {
    if (gameState.rematchRequest && gameState.rematchRequest !== playerColor) {
      // Opponent requested rematch - include their proposed timer
      setRematchState({ 
        isOpen: true, 
        requestFrom: gameState.rematchRequest,
        proposedTimer: gameState.rematchTimer || null,
      });
    }
  }, [gameState.rematchRequest, gameState.rematchTimer, playerColor]);

  // Handle Accept Rematch
  const handleAcceptRematch = useCallback(() => {
    setRematchState({ isOpen: false, requestFrom: null, proposedTimer: null });

    // Clear any pending idle timeout
    if (clearIdleTimeout) {
      clearIdleTimeout();
    }

    // Reset game with the proposed timer from the rematch request
    // This ensures both players use the timer that was proposed
    const proposedTimer = gameState.rematchTimer || null;
    resetGame(proposedTimer);
  }, [clearIdleTimeout, resetGame, gameState.rematchTimer]);

  // Handle Decline Rematch
  const handleDeclineRematch = useCallback(() => {
    setRematchState({ isOpen: false, requestFrom: null, proposedTimer: null });
    setMessage("Rematch declined. Disconnecting...");

    // Sync decline to opponent
    const newGameState = {
      ...gameState,
      rematchRequest: null,
      rematchTimer: null,
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
