"use client";

import { useEffect, useRef } from "react";

/**
 * Hook to handle idle timeout disconnection after game ends in multiplayer.
 * If no rematch is requested within the timeout period, the connection will be disconnected.
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.isGameOver - Whether the game is over
 * @param {string} options.gameMode - Current game mode ('singlePlayer', 'host', 'guest', 'vsEngine')
 * @param {boolean} options.isConnected - Whether WebRTC is connected
 * @param {Function} options.onDisconnect - Callback to disconnect WebRTC
 * @param {Function} options.sendDisconnectNotification - Callback to notify peer of disconnect
 * @param {Function} options.setMessage - Callback to set status message
 * @param {number} options.timeoutMs - Timeout duration in milliseconds (default: 8 hours)
 * @returns {Object} - { idleTimeoutRef, clearIdleTimeout }
 */
const useIdleTimeout = ({
  isGameOver = false,
  gameMode = "singlePlayer",
  isConnected = false,
  onDisconnect = null,
  sendDisconnectNotification = null,
  setMessage = null,
  timeoutMs = 8 * 60 * 60 * 1000, // 8 hours default
}) => {
  const idleTimeoutRef = useRef(null);

  // Clear the idle timeout (useful when rematch is accepted/declined)
  const clearIdleTimeout = () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  };

  // Idle timeout: disconnect if no rematch is requested within timeout period after game ends
  useEffect(() => {
    const isMultiplayer = gameMode === "host" || gameMode === "guest";
    
    // Only start timeout if game is over in multiplayer mode and connected
    if (isGameOver && isMultiplayer && isConnected) {
      const timeoutId = setTimeout(() => {
        if (setMessage) {
          setMessage("Game ended 8 hours ago. Disconnecting due to inactivity.");
        }
        if (sendDisconnectNotification) {
          sendDisconnectNotification();
        }
        if (onDisconnect) {
          onDisconnect();
        }
      }, timeoutMs);
      
      idleTimeoutRef.current = timeoutId;
      
      return () => {
        clearTimeout(timeoutId);
        idleTimeoutRef.current = null;
      };
    }
  }, [isGameOver, gameMode, isConnected, onDisconnect, sendDisconnectNotification, setMessage, timeoutMs]);

  return {
    idleTimeoutRef,
    clearIdleTimeout,
  };
};

export default useIdleTimeout;
