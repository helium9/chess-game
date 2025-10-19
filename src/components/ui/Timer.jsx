import React, { useState, useEffect } from "react";
import { COLORS } from "../../utils/constants";

const Timer = React.memo(
  ({
    timerStateRef,
    color,
    currentTurn,
    gameMode,
    isConnected,
    isReconnecting,
  }) => {
    const [displayTime, setDisplayTime] = useState(180000); // 3 minutes in ms

    useEffect(() => {
      // Don't run timer logic if in single player mode, not connected (for multiplayer), or reconnecting
      // Timer is visible in vsEngine mode and multiplayer modes
      if (
        gameMode === "singlePlayer" ||
        (gameMode !== "vsEngine" && !isConnected) ||
        isReconnecting
      ) {
        // Freeze timer - read current value from ref
        const timeToDisplay =
          color === COLORS.WHITE
            ? timerStateRef.current.whiteTime
            : timerStateRef.current.blackTime;
        setDisplayTime(timeToDisplay);
        return;
      }

      const isMyTurn = currentTurn === color;

      if (!isMyTurn) {
        // Frozen - just read from ref once
        const timeToDisplay =
          color === COLORS.WHITE
            ? timerStateRef.current.whiteTime
            : timerStateRef.current.blackTime;
        setDisplayTime(timeToDisplay);
        return;
      }

      // My turn - countdown
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - timerStateRef.current.lastUpdate;
        const baseTime =
          color === COLORS.WHITE
            ? timerStateRef.current.whiteTime
            : timerStateRef.current.blackTime;
        const newTime = baseTime - elapsed;

        setDisplayTime(Math.max(0, newTime));

        // If time runs out, we could trigger a timeout here
        if (newTime <= 0) {
          console.log(`${color} ran out of time!`);
        }
      }, 100); // Update every 100ms for smooth countdown

      return () => clearInterval(interval);
    }, [
      currentTurn,
      color,
      gameMode,
      isConnected,
      isReconnecting,
      timerStateRef,
    ]);

    // Format time as MM:SS.d
    const formatTime = (ms) => {
      const totalSeconds = Math.max(0, Math.floor(ms / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const deciseconds = Math.floor((ms % 1000) / 100);
      return `${minutes}:${seconds.toString().padStart(2, "0")}.${deciseconds}`;
    };

    const isActive =
      currentTurn === color &&
      (gameMode === "vsEngine" || (gameMode !== "singlePlayer" && isConnected));
    const isLowTime = displayTime < 30000; // Less than 30 seconds
    const isCriticalTime = displayTime < 10000; // Less than 10 seconds

    return (
      <div
        className={`
      px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-mono text-base sm:text-lg md:text-xl lg:text-2xl font-bold transition-all duration-300
      ${
        isActive
          ? "bg-green-600 text-white shadow-lg shadow-green-500/50 scale-105"
          : "bg-gray-700 text-gray-300"
      }
      ${isLowTime && isActive ? "bg-yellow-600" : ""}
      ${isCriticalTime && isActive ? "bg-red-600 animate-pulse" : ""}
    `}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
              isActive ? "bg-white animate-pulse" : "bg-gray-500"
            }`}
          />
          <span>{formatTime(displayTime)}</span>
        </div>
      </div>
    );
  }
);

Timer.displayName = "Timer";

export default Timer;
