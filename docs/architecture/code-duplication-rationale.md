# Code Duplication Rationale

This document explains why certain code appears to be duplicated in the codebase and why this duplication is **intentional and necessary**.

## 1. alphaBetaSearch Duplication (alphaBeta.js vs searchWorker.js)

### The Duplication

The `alphaBetaSearch` function exists in both:
- `src/ai/alphaBeta.js` (main thread version)
- `src/ai/searchWorker.js` (worker thread version)

Both implementations are nearly identical, performing the same alpha-beta pruning algorithm.

### Why This Is Necessary

**Web Workers run in completely separate JavaScript contexts.** When you import a module in a worker, the worker gets its **own copy** of that module with its **own global state**.

#### The Problem with Importing

If `searchWorker.js` imported `alphaBetaSearch` from `alphaBeta.js`:

```javascript
// ❌ This would NOT work correctly
import { alphaBetaSearch } from './alphaBeta.js';
```

**What would happen:**

1. The worker's import would create a NEW instance of alphaBeta.js in the worker context
2. This new instance would have its OWN global variables:
   ```javascript
   // alphaBeta.js globals (in worker context)
   const transpositionTable = new TranspositionTable(256);  // ← NEW TT created!
   let nodesSearched = 0;  // ← SEPARATE counter!
   ```
3. This new TT would be a **regular ArrayBuffer**, NOT the shared buffer!
4. The worker would not use the shared transposition table at all
5. Node counts would be wrong (worker's count ≠ main thread's count)

#### Why Separate Contexts Matter

```
┌─────────────────────────────────────────────────────────┐
│                    Main Thread                           │
│                                                          │
│  alphaBeta.js (instance 1)                              │
│  ├── transpositionTable = new TT(256) ← Regular buffer │
│  ├── nodesSearched = 0                                  │
│  └── alphaBetaSearch() uses these globals              │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Worker Thread                         │
│                                                          │
│  alphaBeta.js (instance 2 - if imported)                │
│  ├── transpositionTable = new TT(256) ← NEW buffer!    │
│  ├── nodesSearched = 0                   ← Different!   │
│  └── alphaBetaSearch() uses THESE globals (wrong ones!) │
│                                                          │
│  searchWorker.js (actual file)                          │
│  ├── transpositionTable = (shared buffer) ← CORRECT    │
│  ├── nodesSearched = 0                   ← CORRECT      │
│  └── alphaBetaSearch() NEEDS to use these instead!     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### The Solution: Intentional Duplication

By duplicating the function in `searchWorker.js`, we ensure it references the **worker-local globals**:

```javascript
// searchWorker.js
let transpositionTable = null;  // ← Worker's TT (wraps shared buffer)
let nodesSearched = 0;          // ← Worker's counter

const alphaBetaSearch = (board, ...) => {
    nodesSearched++;                           // ← Uses WORKER's counter
    const ttEntry = transpositionTable.probe(...);  // ← Uses WORKER's TT
    // ...
};
```

This ensures:
- ✅ Worker uses the shared transposition table (passed via SharedArrayBuffer)
- ✅ Worker tracks its own node count correctly
- ✅ Worker has its own timeout checking (`shouldAbortSearch()`)
- ✅ All statistics are accurate and properly isolated

### Trade-off: Maintainability vs Correctness

**Disadvantage:** Any bug fix or optimization in `alphaBetaSearch` must be applied to **both** versions.

**Why we accept this:** 
- The duplication is **unavoidable** given Web Workers' architecture
- The function is **mature and stable** (algorithm is well-defined)
- The alternative (importing) would cause **silent bugs** that are hard to debug
- The worker version includes clear comments noting it must match alphaBeta.js

### What IS Shared (No Duplication)

The following **are** imported from `alphaBeta.js` without duplication:

| Function | Reason It Can Be Shared |
|----------|------------------------|
| `getAllLegalMoves()` | Pure function, no global state |
| `applyMove()` | Pure function, no global state |

These functions don't rely on `transpositionTable` or `nodesSearched`, so they can safely be imported in workers.

---

## 2. Move Application Logic (alphaBeta.js vs App.jsx)

### The Duplication

Move execution logic appears in both:
- `src/ai/applyMove()` (returns `{ newBoard, newCastlingRights }`)
- `src/App.jsx` (switch statement handling all move types)

### Why This Is Necessary

**AI needs different data than UI needs.**

#### What AI Needs (applyMove)

```javascript
export const applyMove = (board, move, currentTurn, castlingRights) => {
    // ... apply move logic ...
    return { newBoard, newCastlingRights };
};
```

The AI only cares about:
- **New board state** (for evaluation)
- **Updated castling rights** (for legal move generation)

The AI does **NOT** need:
- Captured pieces (doesn't affect evaluation)
- Move history (doesn't affect position)
- Timer updates (not part of position)
- UI state (completely irrelevant)

#### What UI Needs (App.jsx)

```javascript
// App.jsx needs to track:
let capturedPiece = board[move.to.row][move.to.col];  // ← Detect BEFORE moving
let newBoard = applyMove(...);
let newCapturedPieces = addCapturedPiece(...);        // ← Update captured pieces UI
let moveHistory = [...oldHistory, move];               // ← Move list display
// Update timers, check for game over, etc.
```

The UI needs:
- **Captured pieces** (to display to player)
- **Move history** (for move list)
- **Timer updates** (game clock)
- **Turn switching** (game flow)
- **En passant target** (game state)

#### The Problem: Captured Pieces

**Captured pieces cannot be retrieved after the move is applied!**

```javascript
// BEFORE move:
board[2][3] = 'r';  // Black rook

// Apply move (pawn captures rook):
board = applyMove(board, { from: {row: 3, col: 2}, to: {row: 2, col: 3} });

// AFTER move:
board[2][3] = 'P';  // White pawn (rook is GONE!)
// ❌ We can't tell what was captured anymore!
```

`applyMove()` uses functions like `makeMove()` that **overwrite** the destination square. The captured piece is lost.

To track captures, App.jsx must:
1. **Read the destination square BEFORE** applying the move
2. Apply the move
3. Update the captured pieces list

This cannot be done by calling `applyMove()` alone.

### Could We Refactor?

**Option A: Make applyMove return captured pieces**

```javascript
export const applyMove = (board, move, currentTurn, castlingRights) => {
    // Detect capture BEFORE moving
    const capturedPiece = (move.type === 'normal' || move.type === 'promotion')
        ? board[move.to.row][move.to.col]
        : null;
    
    // ... apply move logic ...
    
    return { 
        newBoard, 
        newCastlingRights,
        capturedPiece  // ← NEW
    };
};
```

**Pros:**
- Eliminates switch statement duplication in App.jsx
- Single source of truth for move application

**Cons:**
- Adds AI-irrelevant data to return value
- AI code now tracks something it doesn't use (slight overhead)
- Mixes concerns (position evaluation vs UI state)

**Decision:** Keep them separate because:
- The duplication is minimal (just a switch statement)
- AI and UI have fundamentally different concerns
- Clear separation of responsibilities
- AI performance shouldn't be affected by UI needs

---

## Summary

### alphaBetaSearch Duplication

**Status:** Unavoidable, intentional

**Reason:** Web Workers run in separate contexts with separate global state. Importing would cause workers to use wrong TT and wrong counters.

**Maintenance:** Any changes to alphaBetaSearch must be applied to both files.

### Move Application Duplication

**Status:** Acceptable trade-off

**Reason:** AI needs (board + castling) differ from UI needs (captured pieces + history + timers). Captured pieces must be detected before move is applied.

**Alternative:** Could refactor `applyMove()` to return captured pieces, but would mix concerns.

---

## Guidelines for Future Changes

### When Modifying alphaBetaSearch

1. Make the change in `src/ai/alphaBeta.js` first
2. Apply the **identical** change to `src/ai/searchWorker.js`
3. Verify both versions have matching logic
4. Test both single-threaded and parallel search

### When Adding New Move Types

1. Update `applyMove()` in `src/ai/alphaBeta.js`
2. Update the switch statement in `src/App.jsx` to handle UI concerns
3. Ensure captured piece detection works for the new move type
4. Test that move works in both AI and player contexts

### What Can Be Shared

✅ **Safe to import in workers:**
- Pure functions (no global state)
- Utility functions (constants, helpers)
- Functions that only depend on parameters

❌ **Cannot import in workers:**
- Functions that use module-level variables
- Functions that reference `transpositionTable` or `nodesSearched`
- Functions with side effects on main thread state
