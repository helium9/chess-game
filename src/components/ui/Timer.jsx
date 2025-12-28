"use client";

import React, { useState, useEffect } from "react";
import { COLORS } from "../../utils/constants";
import { TIMER_CONFIG } from "../../config/timerConfig";

/**
 * Timer component - chess.com-inspired minimal styling
 */
const Timer = React.memo(
  ({
    timerStateRef,
    color,
    currentTurn,
    gameMode,
    isConnected,
    isReconnecting,
    onTimeout,
    isGameOver = false,
    playerName = null,
  }) => {
    const [displayTime, setDisplayTime] = useState(
      TIMER_CONFIG.getTimeValue(TIMER_CONFIG.DEFAULT)
    );

    useEffect(() => {
      if (
        gameMode === "singlePlayer" ||
        (gameMode !== "vsEngine" && !isConnected) ||
        isReconnecting ||
        isGameOver
      ) {
        const timeToDisplay =
          color === COLORS.WHITE
            ? timerStateRef.current.whiteTime
            : timerStateRef.current.blackTime;
        setDisplayTime(timeToDisplay);
        return;
      }

      const isMyTurn = currentTurn === color;

      if (!isMyTurn) {
        const timeToDisplay =
          color === COLORS.WHITE
            ? timerStateRef.current.whiteTime
            : timerStateRef.current.blackTime;
        setDisplayTime(timeToDisplay);
        return;
      }

      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - timerStateRef.current.lastUpdate;
        const baseTime =
          color === COLORS.WHITE
            ? timerStateRef.current.whiteTime
            : timerStateRef.current.blackTime;
        const newTime = baseTime - elapsed;

        setDisplayTime(Math.max(0, newTime));

        if (newTime <= 0 && onTimeout) {
          onTimeout(color);
        }
      }, 100);

      return () => clearInterval(interval);
    }, [
      currentTurn,
      color,
      gameMode,
      isConnected,
      isReconnecting,
      timerStateRef,
      isGameOver,
      onTimeout,
    ]);

    const formatTime = (ms) => {
      const totalSeconds = Math.max(0, Math.floor(ms / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      // Only show deciseconds when under 20 seconds
      if (totalSeconds < 20) {
        const deciseconds = Math.floor((ms % 1000) / 100);
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${deciseconds}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const isActive =
      currentTurn === color &&
      (gameMode === "vsEngine" || (gameMode !== "singlePlayer" && isConnected));
    const isLowTime = displayTime < 30000;
    const isCriticalTime = displayTime < 10000;

    return (
      <div
        className={`
          flex items-center justify-between px-3 py-2 rounded-md min-w-[180px]
          transition-all duration-200
          ${isActive 
            ? isCriticalTime
              ? "bg-red-600 text-white"
              : isLowTime 
                ? "bg-yellow-600 text-white" 
                : "bg-[var(--accent-primary)] text-white"
            : "bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)]"
          }
        `}
      >
        {/* Player indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-sm ${color === COLORS.WHITE ? "bg-white border border-gray-400" : "bg-gray-800"}`} />
          <span className="text-sm font-medium">
            {playerName || (color === COLORS.WHITE ? "White" : "Black")}
          </span>
        </div>

        {/* Time display */}
        <span className={`font-mono font-bold ${isCriticalTime && isActive ? "animate-pulse" : ""}`}>
          {formatTime(displayTime)}
        </span>
      </div>
    );
  }
);

Timer.displayName = "Timer";

export default Timer;
