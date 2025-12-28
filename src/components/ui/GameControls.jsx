"use client";

import React from "react";

/**
 * GameControls component - buttons for game actions
 * chess.com-inspired minimal, icon-driven design
 */
const GameControls = ({
  gameState,
  onUndo,
  onRedo,
  onCombineToggle,
  onDeCombineToggle,
  onReset,
  onResign,
  onRematchRequest,
  combineMode,
  deCombineMode,
  promotionMode,
  canUndoMove,
  canRedoMove,
  hasEligiblePairs,
  hasEligibleHybrids,
  gameMode = "singlePlayer",
  compact = false, // For sidebar compact mode
  iconOnly = false, // For mobile horizontal strip
  isConnected = true, // Default to true for single player, will be passed as false/true for P2P
}) => {
  const isSpecialModeActive = combineMode || deCombineMode || promotionMode;
  const showResetButton = gameMode !== "host" && gameMode !== "guest";
  const showUndoRedo = gameMode === "singlePlayer";
  const isGameOver = gameState.gameStatus?.isGameOver || false;
  const isInCheck = gameState.gameStatus?.isCheck || false;

  // Icon-only button for mobile strip
  if (iconOnly) {
    return (
      <div className="flex items-center gap-1">
        {/* Undo - Single player only */}
        {showUndoRedo && (
          <button
            onClick={onUndo}
            disabled={!canUndoMove || isSpecialModeActive}
            title="Undo"
            className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
            </svg>
          </button>
        )}

        {/* Redo - Single player only */}
        {showUndoRedo && (
          <button
            onClick={onRedo}
            disabled={!canRedoMove || isSpecialModeActive}
            title="Redo"
            className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a5 5 0 00-5 5v2M21 10l-4-4m4 4l-4 4" />
            </svg>
          </button>
        )}

        {/* Combine */}
        <button
          onClick={onCombineToggle}
          disabled={(!combineMode && !hasEligiblePairs) || isGameOver || isInCheck}
          aria-pressed={combineMode}
          title={combineMode ? "Cancel Combine" : "Combine"}
          className={`p-1.5 rounded transition-colors ${
            combineMode 
              ? "bg-purple-600 text-white" 
              : "hover:bg-[var(--bg-elevated)] text-purple-400 disabled:opacity-30 disabled:cursor-not-allowed"
          }`}
        >
          <span className="text-lg">🔮</span>
        </button>

        {/* De-Combine */}
        <button
          onClick={onDeCombineToggle}
          disabled={(!deCombineMode && !hasEligibleHybrids) || isGameOver || isInCheck}
          aria-pressed={deCombineMode}
          title={deCombineMode ? "Cancel Split" : "Split"}
          className={`p-1.5 rounded transition-colors ${
            deCombineMode 
              ? "bg-teal-600 text-white" 
              : "hover:bg-[var(--bg-elevated)] text-teal-400 disabled:opacity-30 disabled:cursor-not-allowed"
          }`}
        >
          <span className="text-lg">⚡</span>
        </button>

        {/* Resign - Multiplayer */}
        {!showUndoRedo && !showResetButton && !isGameOver && (
          <button
            onClick={onResign}
            disabled={!isConnected}
            title={!isConnected ? "Waiting for opponent..." : "Resign"}
            className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--accent-danger)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-lg">🏳️</span>
          </button>
        )}

        {/* Rematch - Multiplayer game over */}
        {!showUndoRedo && !showResetButton && isGameOver && (
          <button
            onClick={onRematchRequest}
            title="Rematch"
            className="p-1.5 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white transition-colors"
          >
            <span className="text-lg">🔄</span>
          </button>
        )}

        {/* Reset - Single player and AI */}
        {showResetButton && (
          <button
            onClick={onReset}
            title="Reset"
            className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Compact button layout for sidebar
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "justify-center" : "justify-center"}`}>
      {/* Undo - Only in single player */}
      {showUndoRedo && (
        <button
          onClick={onUndo}
          disabled={!canUndoMove || isSpecialModeActive}
          title="Undo"
          className="p-2 rounded bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
          </svg>
        </button>
      )}

      {/* Redo - Only in single player */}
      {showUndoRedo && (
        <button
          onClick={onRedo}
          disabled={!canRedoMove || isSpecialModeActive}
          title="Redo"
          className="p-2 rounded bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a5 5 0 00-5 5v2M21 10l-4-4m4 4l-4 4" />
          </svg>
        </button>
      )}

      {/* Combine */}
      <button
        onClick={onCombineToggle}
        disabled={(!combineMode && !hasEligiblePairs) || isGameOver || isInCheck}
        aria-pressed={combineMode}
        title={combineMode ? "Cancel Combine" : "Combine Pieces"}
        className={`px-3 py-2 rounded text-sm font-medium flex items-center gap-1 transition-colors ${
          combineMode 
            ? "bg-purple-600 hover:bg-purple-700 text-white" 
            : "bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 disabled:opacity-30 disabled:cursor-not-allowed"
        }`}
      >
        <span>🔮</span>
        <span className="hidden sm:inline">{combineMode ? "Cancel" : "Combine"}</span>
      </button>

      {/* De-Combine */}
      <button
        onClick={onDeCombineToggle}
        disabled={(!deCombineMode && !hasEligibleHybrids) || isGameOver || isInCheck}
        aria-pressed={deCombineMode}
        title={deCombineMode ? "Cancel Split" : "Split Pieces"}
        className={`px-3 py-2 rounded text-sm font-medium flex items-center gap-1 transition-colors ${
          deCombineMode 
            ? "bg-teal-600 hover:bg-teal-700 text-white" 
            : "bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 disabled:opacity-30 disabled:cursor-not-allowed"
        }`}
      >
        <span>⚡</span>
        <span className="hidden sm:inline">{deCombineMode ? "Cancel" : "Split"}</span>
      </button>

      {/* Resign - Multiplayer when game active */}
      {!showUndoRedo && !showResetButton && !isGameOver && (
        <button
          onClick={onResign}
          disabled={!isConnected}
          title={!isConnected ? "Waiting for opponent..." : "Resign"}
          className="px-3 py-2 rounded text-sm font-medium bg-[var(--accent-danger)] hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          🏳️ Resign
        </button>
      )}

      {/* Rematch - Multiplayer when game over */}
      {!showUndoRedo && !showResetButton && isGameOver && (
        <button
          onClick={onRematchRequest}
          className="px-3 py-2 rounded text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white transition-colors"
        >
          🔄 Rematch
        </button>
      )}

      {/* Reset - Single player and AI modes */}
      {showResetButton && (
        <button
          onClick={onReset}
          className="p-2 rounded bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default GameControls;
