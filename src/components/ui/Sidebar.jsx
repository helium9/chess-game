"use client";

import React, { useState } from "react";
import CapturedPieces from "./CapturedPieces.jsx";
import MoveHistory from "./MoveHistory.jsx";
import GameControls from "./GameControls.jsx";

/**
 * Sidebar component - persistent right sidebar for desktop layout
 * Contains: Captured pieces, Move history (resizable), Game controls
 */
const Sidebar = ({
  gameState,
  moveHistory = [],
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
  isConnected = false,
}) => {
  // Resizable move history - track collapsed state
  const [historyExpanded, setHistoryExpanded] = useState(true);

  return (
    <div className="hidden lg:flex flex-col w-[280px] h-full bg-[var(--bg-primary)] border-l border-[var(--border-color)]/30">
      {/* Captured Pieces Section - Compact */}
      <div className="px-3 py-2 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Captured</span>
        </div>
        <div className="flex justify-between gap-4">
          {/* White's captures (black pieces) */}
          <div className="flex-1">
            <div className="text-[10px] text-[var(--text-muted)] mb-0.5">White</div>
            <CapturedPieces
              pieces={gameState.capturedPieces.black}
              isWhitePieces={false}
              compact={true}
            />
          </div>
          {/* Black's captures (white pieces) */}
          <div className="flex-1">
            <div className="text-[10px] text-[var(--text-muted)] mb-0.5">Black</div>
            <CapturedPieces
              pieces={gameState.capturedPieces.white}
              isWhitePieces={true}
              compact={true}
            />
          </div>
        </div>
      </div>

      {/* Move History Section - Resizable */}
      <div className="flex-1 min-h-0 flex flex-col border-b border-[var(--border-color)]">
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Moves
          </span>
          <svg
            className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${historyExpanded ? "" : "-rotate-90"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {historyExpanded && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <MoveHistory moveHistory={moveHistory} />
          </div>
        )}
      </div>

      {/* Game Controls Section */}
      <div className="p-3">
        <GameControls
          gameState={gameState}
          onUndo={onUndo}
          onRedo={onRedo}
          onCombineToggle={onCombineToggle}
          onDeCombineToggle={onDeCombineToggle}
          onReset={onReset}
          onResign={onResign}
          onRematchRequest={onRematchRequest}
          combineMode={combineMode}
          deCombineMode={deCombineMode}
          promotionMode={promotionMode}
          canUndoMove={canUndoMove}
          canRedoMove={canRedoMove}
          hasEligiblePairs={hasEligiblePairs}
          hasEligibleHybrids={hasEligibleHybrids}
          gameMode={gameMode}
          compact={true}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
};

export default Sidebar;
