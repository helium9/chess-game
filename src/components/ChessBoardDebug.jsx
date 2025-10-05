import React, { useState, useEffect } from "react";

console.log("1. React imports OK");

try {
  const {
    createInitialGameState,
    undoMove,
    redoMove,
    canUndo,
    canRedo,
  } = require("../utils/gameState.js");
  console.log("2. gameState imports OK");
} catch (e) {
  console.error("2. gameState imports FAILED:", e);
}

try {
  const {
    announceTurn,
    capitalizeColor,
  } = require("./helpers/messageHelpers.js");
  console.log("3. messageHelpers imports OK");
} catch (e) {
  console.error("3. messageHelpers imports FAILED:", e);
}

try {
  const { useCombineMode } = require("./hooks/useCombineMode.js");
  console.log("4. useCombineMode import OK");
} catch (e) {
  console.error("4. useCombineMode import FAILED:", e);
}

try {
  const { useDeCombineMode } = require("./hooks/useDeCombineMode.js");
  console.log("5. useDeCombineMode import OK");
} catch (e) {
  console.error("5. useDeCombineMode import FAILED:", e);
}

try {
  const { usePromotion } = require("./hooks/usePromotion.js");
  console.log("6. usePromotion import OK");
} catch (e) {
  console.error("6. usePromotion import FAILED:", e);
}

try {
  const { useMoveHandler } = require("./hooks/useMoveHandler.js");
  console.log("7. useMoveHandler import OK");
} catch (e) {
  console.error("7. useMoveHandler import FAILED:", e);
}

const ChessBoardDebug = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="text-white text-center">
        <h1 className="text-4xl font-bold mb-4">Debug Mode</h1>
        <p>Check console for import results</p>
      </div>
    </div>
  );
};

export default ChessBoardDebug;
