/**
 * Square styling helper - determines colors and effects based on game state
 */

/**
 * Get square styling based on game mode and state
 * @param {boolean} isLightSquare - Whether the square is light colored
 * @param {object} highlightState - Object containing highlight flags
 * @returns {object} - Object with squareColor, ringClass, opacity, and extraEffects
 */
export const getSquareStyling = (isLightSquare, highlightState) => {
  const {
    // De-combine mode highlights
    hybridSelected,
    spawnSelected,
    spawnSquare,
    eligibleHybrid,
    // Combine mode highlights
    anchor,
    partner,
    eligible,
    // Normal mode highlights
    selected,
    isLegalMove,
    // Mode flags
    deCombineMode,
    combineMode,
  } = highlightState;

  let squareColor = isLightSquare
    ? "bg-gradient-to-br from-amber-50 to-amber-100"
    : "bg-gradient-to-br from-amber-700 to-amber-900";
  let ringClass = "";
  let opacity = "opacity-100";
  let extraEffects = "";

  // De-Combine mode highlighting
  if (deCombineMode) {
    if (hybridSelected) {
      squareColor = "bg-gradient-to-br from-teal-300 to-teal-500";
      ringClass =
        "ring-4 ring-teal-400 ring-inset animate-pulse shadow-lg shadow-teal-500/50";
    } else if (spawnSelected) {
      squareColor = "bg-gradient-to-br from-lime-300 to-lime-500";
      ringClass =
        "ring-4 ring-lime-400 ring-inset animate-pulse shadow-lg shadow-lime-500/50";
    } else if (spawnSquare) {
      squareColor = isLightSquare
        ? "bg-gradient-to-br from-green-200 to-green-300"
        : "bg-gradient-to-br from-green-500 to-green-700";
      ringClass = "ring-2 ring-green-400 ring-inset shadow-inner";
    } else if (eligibleHybrid) {
      squareColor = isLightSquare
        ? "bg-gradient-to-br from-teal-200 to-teal-300"
        : "bg-gradient-to-br from-teal-500 to-teal-700";
      ringClass = "ring-2 ring-teal-300 ring-inset animate-pulse";
    } else {
      opacity = "opacity-50";
    }
  }
  // Combine mode highlighting
  else if (combineMode) {
    if (anchor) {
      squareColor = "bg-gradient-to-br from-purple-300 to-purple-500";
      ringClass =
        "ring-4 ring-purple-400 ring-inset shadow-lg shadow-purple-500/50";
    } else if (partner) {
      squareColor = isLightSquare
        ? "bg-gradient-to-br from-purple-200 to-purple-300"
        : "bg-gradient-to-br from-purple-500 to-purple-700";
      ringClass = "ring-2 ring-purple-300 ring-inset shadow-inner";
    } else if (eligible) {
      squareColor = isLightSquare
        ? "bg-gradient-to-br from-blue-200 to-blue-300"
        : "bg-gradient-to-br from-blue-500 to-blue-700";
      ringClass = "ring-2 ring-blue-300 ring-inset animate-pulse";
    }
  }
  // Normal move mode highlighting
  else {
    if (selected) {
      squareColor = "bg-gradient-to-br from-yellow-300 to-yellow-500";
      extraEffects = "shadow-lg shadow-yellow-500/50";
    } else if (isLegalMove) {
      squareColor = isLightSquare
        ? "bg-gradient-to-br from-green-200 to-green-300"
        : "bg-gradient-to-br from-green-500 to-green-700";
      ringClass = "ring-2 ring-green-400 ring-inset shadow-inner";
    }
  }

  return {
    squareColor,
    ringClass,
    opacity,
    extraEffects,
  };
};

/**
 * Get piece styling with text shadow based on color
 * @param {string} piece - The piece symbol
 * @returns {object} - Style object with textShadow and filter
 */
export const getPieceStyling = (piece) => {
  const isWhitePiece = piece === piece.toUpperCase();

  return {
    textShadow: isWhitePiece
      ? "3px 3px 6px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.5)"
      : "2px 2px 4px rgba(255,255,255,1), -1px -1px 2px rgba(255,255,255,0.6)",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
  };
};
