# Engine Interface Specification

## Overview

The Engine Interface provides a clean, deterministic API for chess variant game operations. It's designed to support:
- Future C++ alpha-beta engine integration
- Network synchronization (WebRTC)
- UI components
- Undo/Redo functionality

## Core Principles

1. **Deterministic**: No hidden state, no randomness
2. **Immutable Snapshots**: Position data never mutates unexpectedly
3. **Serializable**: Full state can be saved/loaded
4. **Idempotent**: Actions can be safely re-applied
5. **Engine-Ready**: C++ engine can plug in without refactoring

## API Reference

### ChessEngine Class

Main entry point for all game operations.

```javascript
import { ChessEngine } from './core/EngineInterface.js';

const engine = new ChessEngine();
```

#### Methods

##### `getPositionSnapshot()`

Returns immutable position snapshot for engine evaluation.

**Returns:** `Object`
```javascript
{
  board: string[][],           // 8x8 board array
  sideToMove: string,          // 'white' or 'black'
  turnIndex: number,           // Ply number (starts at 0)
  castlingRights: Object,      // Reserved for future
  enPassantTarget: Object|null, // Reserved for future
  halfmoveClock: number,       // For 50-move rule
  positionKey: number,         // Zobrist hash
  ruleOptions: Object          // Variant rules
}
```

**Invariants:**
- Board is deep-copied (modifications don't affect engine state)
- Position key is deterministically computed
- No UI state is included

##### `getState()`

Returns full game state (includes captured pieces and other display data).

**Returns:** `GameState`

##### `listLegalActions()`

Generates all legal actions from current position.

**Returns:** `Action[]`

Includes:
- All legal MOVE actions
- All legal COMBINE actions (if enabled)
- All legal DECOMBINE actions (if enabled)

**Complexity:** O(n) where n = pieces × average moves per piece

**Example:**
```javascript
const actions = engine.listLegalActions();
console.log(`${actions.length} legal actions`);

actions.forEach(action => {
  console.log(action.serialize());
});
```

##### `applyAction(action, recordHistory = true)`

Validates and applies an action.

**Parameters:**
- `action` (Action): Action to apply
- `recordHistory` (boolean): Whether to add to undo/redo history

**Returns:** `Object`
```javascript
{
  success: boolean,
  state?: GameState,    // New state if successful
  action?: Action,      // Applied action with result_checksum
  reason?: string,      // Error message if failed
  duplicate?: boolean   // True if action was already applied (idempotent)
}
```

**Validation Checks:**
1. Turn index matches current state
2. Actor color matches side to move
3. Action is legal (move validation, king safety)
4. Not a duplicate (idempotency)

**Side Effects:**
- Updates internal game state
- Increments turn index
- Switches side to move
- Adds to history (if recordHistory=true)
- Invalidates position key cache

**Example:**
```javascript
import { MoveAction } from './core/Action.js';

const action = new MoveAction('white', 0, 6, 4, 4, 4);
const result = engine.applyAction(action);

if (result.success) {
  console.log('Move applied!');
  console.log('Position key:', result.action.result_checksum);
} else {
  console.error('Move failed:', result.reason);
}
```

##### `undo()`

Undoes last action.

**Returns:** `Object`
```javascript
{
  success: boolean,
  state?: GameState,  // State after undo
  action?: Action,    // Action that was undone
  reason?: string     // Error if failed
}
```

**Effects:**
- Restores previous board state
- Reverts side to move
- Decrements turn index
- Moves action from past to future stack

##### `redo()`

Redoes last undone action.

**Returns:** Same format as `undo()`

**Effects:**
- Reapplies action from future stack
- Moves action from future to past stack

##### `canUndo()`

**Returns:** `boolean` - True if undo is available

##### `canRedo()`

**Returns:** `boolean` - True if redo is available

##### `checkGameStatus()`

Checks for game-ending conditions.

**Returns:** `Object`
```javascript
{
  gameOver: boolean,
  result: string|null,  // 'white_win', 'black_win', 'draw', 'stalemate'
  reason?: string       // 'checkmate', 'stalemate', 'threefold_repetition', 'fifty_move_rule'
}
```

##### `serialize()`

Serializes complete engine state.

**Returns:** `Object` - JSON-serializable state

**Includes:**
- Full game state
- Complete history (past and future)
- Applied action IDs

##### `static deserialize(data)`

Restores engine from serialized data.

**Parameters:**
- `data` (Object): Output from `serialize()`

**Returns:** `ChessEngine`

##### `reset()`

Resets to initial game state.

**Effects:**
- Clears history
- Resets action counter
- Creates new initial board

##### `loadGame(serializedData)`

Loads a saved game.

**Parameters:**
- `serializedData` (Object): Serialized engine state

**Returns:** `Object`
```javascript
{
  success: boolean,
  reason?: string
}
```

##### `getSummary()`

Gets game summary for display.

**Returns:** `Object`
```javascript
{
  turnIndex: number,
  sideToMove: string,
  fullmoveNumber: number,
  positionKey: number,
  inCheck: boolean,
  legalActionCount: number,
  history: Object,
  gameStatus: Object,
  capturedPieces: Object
}
```

## Data Structures

### Position Snapshot

The position snapshot is the **only** data visible to an engine. It contains everything needed to evaluate a position and generate legal moves.

**Exclusions (not in snapshot):**
- Captured pieces display data
- UI selections
- Highlights
- Animation state
- Modal dialogs

### Position Key (Hash)

- 32-bit unsigned integer
- Computed using Zobrist hashing
- Deterministic across platforms
- Seeded PRNG for reproducibility
- Used for:
  - Transposition tables (engine)
  - Threefold repetition detection
  - Network sync verification

## Integration Guide

### For UI Components

```javascript
// Initialize
const engine = new ChessEngine();

// Get current state for display
const state = engine.getState();
console.log('Current turn:', state.sideToMove);

// Handle user move
const action = new MoveAction(state.sideToMove, state.turnIndex, from.row, from.col, to.row, to.col);
const result = engine.applyAction(action);

if (result.success) {
  // Update UI
  updateBoard(engine.getState().board);
  
  // Check game status
  const status = engine.checkGameStatus();
  if (status.gameOver) {
    showGameOverDialog(status.result, status.reason);
  }
}

// Undo/Redo buttons
undoButton.disabled = !engine.canUndo();
redoButton.disabled = !engine.canRedo();

undoButton.onclick = () => {
  const result = engine.undo();
  if (result.success) {
    updateBoard(engine.getState().board);
  }
};
```

### For Network Sync

```javascript
import { NetworkSyncManager } from './network/NetworkSync.js';

const syncManager = new NetworkSyncManager(
  gameId,
  playerId,
  role,
  (message) => webrtcChannel.send(message)
);

// Propose action (sends to peer)
syncManager.proposeAction(action);

// Receive message from peer
webrtcChannel.onmessage = (event) => {
  syncManager.handleMessage(JSON.parse(event.data));
};

// React to state changes
syncManager.onStateChange = (newState) => {
  updateBoard(newState.board);
};
```

### For Future C++ Engine

```cpp
// Pseudo-code for C++ engine integration

struct PositionSnapshot {
    char board[8][8];
    Color sideToMove;
    int turnIndex;
    uint32_t positionKey;
    // ... other fields
};

// Engine receives snapshot
PositionSnapshot snapshot = getPositionSnapshotFromJS();

// Engine generates actions
std::vector<Action> actions = generateLegalActions(snapshot);

// Engine evaluates position
int score = alphaBeta(snapshot, depth, alpha, beta);

// Engine returns best action
Action bestAction = actions[bestMoveIndex];
```

## Performance Considerations

- **`listLegalActions()`**: Typically 20-50ms for a mid-game position
- **`applyAction()`**: < 1ms
- **`getPositionSnapshot()`**: < 1ms (includes deep copy)
- **Zobrist hashing**: < 1ms

## Thread Safety

**Not thread-safe**. All methods must be called from the same thread (typically the main/UI thread).

For multi-threaded engine integration, create read-only snapshots and process them in worker threads.

## Error Handling

All methods return structured error objects rather than throwing exceptions:

```javascript
{
  success: false,
  reason: "Detailed error message"
}
```

Always check `success` before accessing result data.

## Testing

See `tests/EngineInterface.test.js` for comprehensive test suite.

Key tests:
- Action validation
- Undo/Redo round-trips
- Serialization/deserialization
- Position key determinism
- Game status detection
