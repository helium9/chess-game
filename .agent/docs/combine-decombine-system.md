# Combine/Decombine System & Past Move Highlighting

> **PURPOSE**: This document contains complete implementation details, code, and bug notes.  
> If you need to implement this system in another branch, read this document carefully to avoid repeating bugs.

---

## Table of Contents

1. [Overview](#overview)
2. [Critical Bugs We Fixed](#critical-bugs-we-fixed)
3. [useDoubleTap Hook (Complete Implementation)](#usedoubletap-hook-complete-implementation)
4. [Local vs Global Mode Distinction](#local-vs-global-mode-distinction)
5. [useDeCombineMode Hook (Key Parts)](#usedecombinemode-hook-key-parts)
6. [useCombineMode Hook (Key Parts)](#usecombinemode-hook-key-parts)
7. [ChessBoard handleSquareClick Logic](#chessboard-handlesquareclick-logic)
8. [ChessBoard handleDoubleTap Logic](#chessboard-handledoubletap-logic)
9. [Highlighting State Object](#highlighting-state-object)
10. [squareStyling.js Highlighting Rules](#squarestylingjs-highlighting-rules)
11. [Past Move Highlighting](#past-move-highlighting)
12. [ChessSquare Component](#chesssquare-component)
13. [Implementation Checklist](#implementation-checklist)

---

## Overview

**Two mechanics:**
- **Combine**: Merge Rook + Knight → hybrid "RN" piece  
- **Decombine**: Split hybrid "RN" → Rook + Knight

**Two activation modes:**
- **Global (Button)**: Shows ALL eligible pieces, uses confirmation modal for decombine
- **Local (Double-Tap)**: Shows ONLY tapped piece + candidates, dims others, NO modal for decombine

---

## Critical Bugs We Fixed

> ⚠️ **READ THESE CAREFULLY** - These bugs took significant time to fix.

### Bug 1: Clicking eligible piece exits mode prematurely

**Problem**: In global mode, clicking an eligible piece/square would exit the mode instead of selecting it.

**Root Cause**: `handleSquareClick` had return statements that exited before calling the mode handlers.

**Fix**: In global mode, ALWAYS pass clicks to the mode handler:
```javascript
// DE-COMBINE MODE
if (deCombine.mode) {
  if (deCombine.isLocalMode && deCombine.activeHybrid) {
    // LOCAL: Only respond to spawn squares
    const isValidSpawn = deCombine.eligibleSquares.some(
      sq => sq.row === row && sq.col === col
    );
    if (isValidSpawn) {
      handleDeCombineClick(row, col);
    } else {
      exitDeCombineMode();  // Exit if clicked elsewhere
    }
  } else {
    // GLOBAL: Let hook handle EVERYTHING
    handleDeCombineClick(row, col);
  }
  return;
}
```

### Bug 2: executeDeCombination result check was wrong

**Problem**: After calling `executeDeCombination`, we checked `!result.success` but the function returns `null` on failure, not `{ success: false }`.

**Root Cause**: Incorrect understanding of API.

**Fix**:
```javascript
// WRONG:
if (!result.success) { ... }

// CORRECT:
if (!result) { ... }
```

### Bug 3: switchTurn was not imported

**Problem**: `ReferenceError: switchTurn is not defined` in useDeCombineMode.js

**Root Cause**: Function was used but not imported.

**Fix**: Add import:
```javascript
import { switchTurn } from "../../utils/gameState.js";
```

### Bug 4: State lag with isSpawnSquare check

**Problem**: After selecting a hybrid, clicking spawn square would fail because state hadn't updated yet.

**Root Cause**: `isSpawnSquare(row, col)` used stale boolean, not current eligibleSquares array.

**Fix**: Check against `eligibleSquares` array directly:
```javascript
// WRONG (uses stale state):
if (isSpawnSquare(row, col)) { ... }

// CORRECT (uses current state):
const isValidSpawn = deCombine.eligibleSquares.some(
  sq => sq.row === row && sq.col === col
);
if (isValidSpawn) { ... }
```

### Bug 5: Local mode logic was missing isLocalMode flag

**Problem**: Double-tap entered mode but LOCAL behaviors (no modal, direct execution) didn't work.

**Root Cause**: `isLocalMode` was not being set or checked.

**Fix**: Set flag in enterDeCombineMode:
```javascript
isLocalMode: !!initialPiece, // true if double-tap, false if button
```

And check in handleDeCombineClick:
```javascript
if (deCombine.isLocalMode) {
  // Execute directly
  executeDeCombination(...);
  exitDeCombineMode();
} else {
  // Show confirmation modal
  setDeCombine(prev => ({ ...prev, isConfirmOpen: true }));
}
```

---

## useDoubleTap Hook (Complete Implementation)

```javascript
// File: src/components/hooks/useDoubleTap.js

import { useRef, useCallback } from 'react';

/**
 * Custom hook to detect double tap/click events
 * @param {Function} onDoubleTap - Callback to execute on double tap
 * @param {Function} onSingleTap - Callback to execute on single tap (after delay)
 * @param {Object} options - Options for the hook
 * @param {number} options.delay - Max time between taps in ms (default: 300)
 */
const useDoubleTap = (onDoubleTap, onSingleTap, { delay = 300 } = {}) => {
  const lastTapTime = useRef(0);
  const singleTapTimeout = useRef(null);

  const handleTap = useCallback(
    (event) => {
      const currentTime = Date.now();
      const timeSinceLastTap = currentTime - lastTapTime.current;

      // Clear any pending single tap
      if (singleTapTimeout.current) {
        clearTimeout(singleTapTimeout.current);
        singleTapTimeout.current = null;
      }

      if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
        // Double tap detected
        lastTapTime.current = 0; // Reset
        if (onDoubleTap) {
          onDoubleTap(event);
        }
      } else {
        // First tap - wait to see if it's a double tap
        lastTapTime.current = currentTime;
        singleTapTimeout.current = setTimeout(() => {
          // No second tap came - trigger single tap
          if (onSingleTap) {
            onSingleTap(event);
          }
          lastTapTime.current = 0;
          singleTapTimeout.current = null;
        }, delay);
      }
    },
    [onDoubleTap, onSingleTap, delay]
  );

  return {
    onClick: handleTap,
  };
};

export default useDoubleTap;
```

---

## Local vs Global Mode Distinction

### State Flags

```javascript
// In useCombineMode:
combineAnchor: null        // null = global mode, {row,col} = local mode

// In useDeCombineMode:
isLocalMode: false         // false = global (button), true = local (double-tap)
```

### How isLocalMode is Set

```javascript
// enterDeCombineMode(initialPiece)
const enterDeCombineMode = useCallback((initialPiece = null) => {
  const newState = {
    mode: true,
    isLocalMode: !!initialPiece,  // KEY: true if piece provided (double-tap)
    // ...
  };
  
  if (initialPiece) {
    // Auto-select the clicked piece
    newState.activeHybrid = { row, col, piece };
    newState.eligibleSquares = findSpawnSquares(...);
  }
  
  setDeCombine(newState);
}, [...]);
```

### Entry Points

| Mode | Trigger | Initial Piece | isLocalMode |
|------|---------|---------------|-------------|
| Global Combine | Button click | null | false (no anchor) |
| Local Combine | Double-tap | {row, col} | true (has anchor) |
| Global Decombine | Button click | null | false |
| Local Decombine | Double-tap | {row, col} | true |

---

## useDeCombineMode Hook (Key Parts)

### State Structure

```javascript
const [deCombine, setDeCombine] = useState({
  mode: false,                   // Is mode active?
  activeHybrid: null,            // { row, col, piece } - selected hybrid
  eligibleSquares: [],           // [{ row, col, direction }] - spawn options
  selectedSquare: null,          // Chosen spawn square
  assignment: null,              // Which component goes where
  isConfirmOpen: false,          // Show confirmation modal?
  isLocalMode: false,            // Double-tap mode (no modal)
});
```

### handleDeCombineClick (Critical Logic)

```javascript
const handleDeCombineClick = useCallback((row, col) => {
  const piece = gameState.board[row][col];

  // Phase 1: Select hybrid (if not already selected)
  if (!deCombine.activeHybrid) {
    const isEligible = eligibleHybrids.some(h => h.row === row && h.col === col);
    if (!isEligible) {
      setMessage(announceError(DE_COMBINE_ERRORS.NOT_HYBRID));
      return;
    }
    
    const squares = findSpawnSquares(gameState.board, row, col);
    if (squares.length === 0) {
      setMessage(announceError(DE_COMBINE_ERRORS.NO_ADJACENT_SQUARES));
      return;
    }
    
    setDeCombine({
      ...deCombine,
      activeHybrid: { row, col, piece },
      eligibleSquares: squares,
    });
    return;
  }

  // Phase 2: Select spawn square
  const isValidSpawn = deCombine.eligibleSquares.some(
    sq => sq.row === row && sq.col === col
  );
  
  if (!isValidSpawn) {
    setMessage(announceError(DE_COMBINE_ERRORS.SQUARE_NOT_ADJACENT));
    return;
  }

  // Check legality
  const assignmentResult = computeLegalAssignments(...);
  if (assignmentResult.legal.length === 0) {
    setMessage(announceError(assignmentResult.reason));
    return;
  }

  // *** KEY DIFFERENCE: Local vs Global ***
  if (deCombine.isLocalMode) {
    // LOCAL MODE: Execute directly, NO modal
    const result = executeDeCombination(
      gameState.board,
      deCombine.activeHybrid.row,
      deCombine.activeHybrid.col,
      { row, col },
      gameState.currentTurn
    );

    if (!result) {  // Note: result is null on failure, not { success: false }
      setMessage(announceError(DE_COMBINE_ERRORS.INVALID_PLACEMENT));
      return;
    }

    const newGameState = {
      ...gameState,
      board: result.board,
      currentTurn: switchTurn(gameState.currentTurn),
      moveHistory: [...gameState.moveHistory, {
        type: 'de-combine',
        hybridSquare: { row: deCombine.activeHybrid.row, col: deCombine.activeHybrid.col },
        selectedSquare: { row, col },
        assignment: result.assignment,
      }],
    };
    setGameState(newGameState);
    setMessage(announceSuccess(getSuccessMessage(result)));
    exitDeCombineMode(true);
  } else {
    // GLOBAL MODE: Show confirmation modal
    setDeCombine(prev => ({
      ...prev,
      selectedSquare: { row, col },
      assignment: assignmentResult.chosen,
      isConfirmOpen: true,
    }));
  }
}, [...]);
```

---

## useCombineMode Hook (Key Parts)

### State Structure

```javascript
combineMode: boolean           // Is mode active?
combineAnchor: { row, col }    // Selected piece (null in global until click)
eligiblePairs: [...]           // All valid pairs on board
eligiblePartners: [...]        // Partners for current anchor
```

### enterCombineMode

```javascript
const enterCombineMode = useCallback((initialPiece = null) => {
  setCombineMode(true);
  setEligiblePairs(memoizedEligiblePairs);
  
  if (initialPiece) {
    // LOCAL: Piece already selected
    setCombineAnchor(initialPiece);
    const partners = getPartnersForPiece(initialPiece);
    setEligiblePartners(partners);
  } else {
    // GLOBAL: No anchor yet
    setCombineAnchor(null);
    setEligiblePartners([]);
  }
}, [...]);
```

---

## ChessBoard handleSquareClick Logic

```javascript
const handleSquareClick = (row, col) => {
  if (gameState.gameStatus?.isGameOver) {
    setMessage("Game is over. Please reset to start a new game.");
    return;
  }

  const piece = gameState.board[row][col];

  // *** DE-COMBINE MODE ***
  if (deCombine.mode) {
    if (deCombine.isLocalMode && deCombine.activeHybrid) {
      // LOCAL: Hybrid already selected, respond only to spawn squares
      if (deCombine.activeHybrid.row === row && deCombine.activeHybrid.col === col) {
        return;  // Clicking hybrid again - ignore
      }
      // Use direct array check, not stale boolean
      const isValidSpawn = deCombine.eligibleSquares.some(
        sq => sq.row === row && sq.col === col
      );
      if (isValidSpawn) {
        handleDeCombineClick(row, col);
      } else {
        exitDeCombineMode();  // Clicked elsewhere - exit
      }
    } else {
      // GLOBAL: Let hook handle everything
      handleDeCombineClick(row, col);
    }
    return;
  }

  // *** COMBINE MODE ***
  if (combineMode) {
    if (combineAnchor) {
      // LOCAL: Anchor set, respond only to partners
      if (isEligiblePartner(row, col)) {
        handleCombineClick(row, col);
      } else if (isCombineAnchor(row, col)) {
        return;  // Clicking anchor again - ignore
      } else {
        exitCombineMode();  // Clicked elsewhere - exit
      }
    } else {
      // GLOBAL: Let hook handle everything
      handleCombineClick(row, col);
    }
    return;
  }

  // *** NORMAL MODE ***
  if (piece && selectedSquare === null && !canMakeMove(piece, [row, col])) {
    setMessage(`It's ${gameState.currentTurn}'s turn.`);
    return;
  }
  
  handleNormalMove(row, col);
};
```

---

## ChessBoard handleDoubleTap Logic

```javascript
const handleDoubleTap = (row, col) => {
  if (gameState.gameStatus?.isGameOver) return;

  const piece = gameState.board[row][col];
  if (!canMakeMove(piece, [row, col])) return;

  // Priority 1: Try De-Combine (if hybrid)
  if (isHybridPiece(piece)) {
    const isEligibleHybrid = eligibleHybrids.some(
      h => h.row === row && h.col === col
    );
    if (!isEligibleHybrid) return;

    if (combineMode) exitCombineMode();
    clearSelection();
    enterDeCombineMode({ row, col });  // LOCAL MODE: Pass piece
  }
  // Priority 2: Try Combine
  else {
    const partnersThisPieceCanReach = eligiblePairs.filter(pair => {
      if (pair.piece1.row === row && pair.piece1.col === col) {
        return canReachForCombine(
          gameState.board, row, col,
          pair.piece2.row, pair.piece2.col,
          gameState.currentTurn
        );
      }
      if (pair.piece2.row === row && pair.piece2.col === col) {
        return canReachForCombine(
          gameState.board, row, col,
          pair.piece1.row, pair.piece1.col,
          gameState.currentTurn
        );
      }
      return false;
    });

    if (partnersThisPieceCanReach.length === 0) return;

    if (deCombine.mode) exitDeCombineMode();
    clearSelection();
    enterCombineMode({ row, col });  // LOCAL MODE: Pass piece
  }
};
```

---

## Highlighting State Object

Passed to each ChessSquare via BoardGrid:

```javascript
const highlightState = {
  // Normal selection
  selected: isSelected(rowIndex, colIndex),
  isLegalMove: isLegalMoveSquare(rowIndex, colIndex),
  
  // Combine mode
  combineMode: combineMode,
  hasAnchor: !!combineAnchor,
  isLocalCombine: combineMode && !!combineAnchor,
  anchor: isCombineAnchor(rowIndex, colIndex),
  partner: isEligiblePartner(rowIndex, colIndex),
  eligible: isEligibleForCombine(rowIndex, colIndex),
  
  // Decombine mode
  deCombineMode: deCombine.mode,
  hasActiveHybrid: !!deCombine.activeHybrid,
  isLocalDeCombine: deCombine.isLocalMode,
  hybridSelected: isSelectedHybrid(rowIndex, colIndex),
  spawnSquare: isSpawnSquare(rowIndex, colIndex),
  eligibleHybrid: isEligibleForDeCombine(rowIndex, colIndex),
  
  // Last move
  isLastMoveSource: isLastMoveSource,
  isLastMoveTarget: isLastMoveTarget,
};
```

---

## squareStyling.js Highlighting Rules

```javascript
export const getSquareStyles = (highlightState, isLightSquare) => {
  const {
    combineMode, hasAnchor, isLocalCombine, anchor, partner, eligible,
    deCombineMode, hasActiveHybrid, isLocalDeCombine, hybridSelected, spawnSquare, eligibleHybrid,
    isLastMoveSource, isLastMoveTarget,
  } = highlightState;

  let opacity = "";

  // *** DECOMBINE MODE ***
  if (deCombineMode) {
    if (hybridSelected) {
      // Purple glow - the selected hybrid
      return { ringClass: "ring-4 ring-purple-500", opacity: "" };
    }
    if (spawnSquare) {
      // Green glow - spawn options
      return { ringClass: "ring-2 ring-green-400", opacity: "" };
    }
    if (eligibleHybrid && !isLocalDeCombine) {
      // Teal glow - other hybrids (GLOBAL only)
      return { ringClass: "ring-2 ring-teal-400", opacity: "" };
    }
    // LOCAL mode: Dim everything else
    if (isLocalDeCombine && !hybridSelected && !spawnSquare) {
      opacity = "opacity-50";
    }
  }
  
  // *** COMBINE MODE ***
  else if (combineMode) {
    if (anchor) {
      // Purple solid - the anchor
      return { squareColor: "bg-purple-600", opacity: "" };
    }
    if (partner) {
      // Purple outline - valid partners
      return { ringClass: "ring-2 ring-purple-400", opacity: "" };
    }
    if (eligible && !isLocalCombine) {
      // Blue glow - all eligible (GLOBAL only)
      return { ringClass: "ring-2 ring-blue-400", opacity: "" };
    }
    // LOCAL mode: Dim everything else
    if (isLocalCombine && !anchor && !partner) {
      opacity = "opacity-50";
    }
  }
  
  // *** LAST MOVE HIGHLIGHTING ***
  if (isLastMoveSource && !combineMode && !deCombineMode) {
    return {
      squareColor: isLightSquare
        ? "bg-gradient-to-br from-yellow-100 to-yellow-200"
        : "bg-gradient-to-br from-yellow-600 to-yellow-700",
      opacity: ""
    };
  }
  if (isLastMoveTarget && !combineMode && !deCombineMode) {
    return {
      squareColor: isLightSquare
        ? "bg-gradient-to-br from-yellow-200 to-yellow-300"
        : "bg-gradient-to-br from-yellow-500 to-yellow-600",
      ringClass: "ring-2 ring-yellow-400",
      opacity: ""
    };
  }

  return { opacity };
};
```

---

## Past Move Highlighting

In BoardGrid.jsx, calculate lastMove source/target:

```javascript
const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];

let isLastMoveSource = false;
let isLastMoveTarget = false;

if (lastMove) {
  if (lastMove.type === 'castle') {
    // TODO: Highlight king and rook positions
  } else if (lastMove.type === 'combination') {
    // Highlight where hybrid was placed
    if (lastMove.placement.row === rowIndex && lastMove.placement.col === colIndex) {
      isLastMoveTarget = true;
    }
  } else if (lastMove.type === 'de-combine') {
    // Highlight spawn square (target) and original hybrid position (source)
    if (lastMove.selectedSquare.row === rowIndex && lastMove.selectedSquare.col === colIndex) {
      isLastMoveTarget = true;
    }
    if (lastMove.hybridSquare.row === rowIndex && lastMove.hybridSquare.col === colIndex) {
      isLastMoveSource = true;
    }
  } else if (lastMove.from && lastMove.to) {
    // Normal move
    if (lastMove.from.row === rowIndex && lastMove.from.col === colIndex) {
      isLastMoveSource = true;
    }
    if (lastMove.to.row === rowIndex && lastMove.to.col === colIndex) {
      isLastMoveTarget = true;
    }
  }
}
```

---

## ChessSquare Component

```javascript
// src/components/ui/ChessSquare.jsx

import useDoubleTap from '../hooks/useDoubleTap';

const ChessSquare = ({ row, col, piece, onClick, onDoubleTap, highlightState, ... }) => {
  const tapHandlers = useDoubleTap(
    () => onDoubleTap(row, col),  // Double-tap → combine/decombine
    () => onClick(row, col),      // Single-tap → normal move/selection
    { delay: 300 }
  );

  const styles = getSquareStyles(highlightState, isLightSquare);

  return (
    <div
      className={`${styles.squareColor} ${styles.ringClass} ${styles.opacity}`}
      {...tapHandlers}  // Uses onClick from useDoubleTap
    >
      {piece && <ChessPiece piece={piece} />}
    </div>
  );
};
```

---

## Implementation Checklist

When implementing in another branch:

- [ ] Create `useDoubleTap.js` hook (exact code above)
- [ ] Add `isLocalMode` flag to `useDeCombineMode` state
- [ ] Set `isLocalMode: !!initialPiece` in `enterDeCombineMode`
- [ ] Add local vs global check in `handleDeCombineClick`
- [ ] In local mode: Execute directly, NO modal, check `!result` not `!result.success`
- [ ] Import `switchTurn` from gameState.js
- [ ] Add `isLocalCombine` and `isLocalDeCombine` to highlightState
- [ ] Update `handleSquareClick` to use direct array check for spawn squares
- [ ] In global mode: Pass ALL clicks to mode handler (don't exit early)
- [ ] Update `squareStyling.js` to dim non-relevant squares in local mode
- [ ] Update ChessSquare to use useDoubleTap
- [ ] Add lastMove source/target calculation to BoardGrid

---

*Last Updated: December 16, 2025*
