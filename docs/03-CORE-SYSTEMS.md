# Core Systems

This document details the core game engine components: GameState, Action, History, EngineInterface, and PositionKey.

## GameState (`src/core/GameState.js`)

### Purpose

The **single source of truth** for the game position. Represents a complete, authoritative snapshot of the game at any point in time.

### Design Philosophy

- **Immutable**: Never modified in place, always create new instances
- **Serializable**: Can be converted to/from JSON for network sync
- **Engine-Compatible**: Can be passed to external chess engines
- **Deterministic**: Same state always produces same behavior

### Class Structure

```javascript
class GameState {
  // AUTHORITATIVE FIELDS (Position Snapshot)
  board; // 8x8 array of piece identifiers
  sideToMove; // 'white' or 'black'
  turnIndex; // Ply number (starts at 0)
  castlingRights; // {white: {kingSide, queenSide}, black: {...}}
  enPassantTarget; // {row, col} or null
  halfmoveClock; // For 50-move rule
  fullmoveNumber; // Traditional chess notation
  gameResult; // null, 'white_win', 'black_win', 'draw'
  _positionKey; // Zobrist hash (cached)
  ruleOptions; // {allowCombinations, allowDecombinations}

  // DISPLAY-ONLY FIELDS (not part of position)
  capturedPieces; // {white: [...], black: [...]}
}
```

### Key Methods

#### `getPositionSnapshot()`

Returns immutable position for engine evaluation:

```javascript
{
    board: [...],
    sideToMove: 'white',
    turnIndex: 12,
    castlingRights: {...},
    enPassantTarget: null
}
```

#### `getPositionKey()`

Returns Zobrist hash for transposition tables and draw detection:

```javascript
const key = gameState.getPositionKey(); // "a4f2d8e..."
```

#### `clone()`

Creates deep copy of the game state:

```javascript
const newState = gameState.clone();
```

#### `serialize()` / `deserialize()`

Converts to/from JSON for network sync:

```javascript
const json = gameState.serialize();
const restored = GameState.deserialize(json);
```

### Board Representation

The board is an 8×8 array where:

- **Row 0** = Black's back rank (row 8 in algebraic notation)
- **Row 7** = White's back rank (row 1 in algebraic notation)
- **Column 0** = a-file
- **Column 7** = h-file

```javascript
board[0][0]; // a8 (top-left for Black)
board[7][0]; // a1 (bottom-left for White)
board[7][7]; // h1 (bottom-right for White)
```

### Piece Encoding

Pieces are represented as strings:

- **Lowercase** = Black pieces: `'r', 'n', 'b', 'q', 'k', 'p'`
- **Uppercase** = White pieces: `'R', 'N', 'B', 'Q', 'K', 'P'`
- **Empty squares** = `''` (empty string)
- **Hybrid pieces**: `'rb', 'rn', 'bn', 'qn'` (lowercase for black, uppercase for white)

Examples:

```javascript
"R"; // White Rook
"n"; // Black Knight
"RB"; // White Rook-Bishop hybrid
"qn"; // Black Queen-Knight hybrid
""; // Empty square
```

### Creating GameState

#### Initial Board

```javascript
const state = GameState.createInitial();
```

#### Custom Position

```javascript
const state = new GameState({
  board: customBoard,
  sideToMove: "black",
  turnIndex: 10,
});
```

#### From Snapshot

```javascript
const state = GameState.fromSnapshot(snapshot);
```

### State Transitions

GameState is immutable. All modifications create new instances:

```javascript
// ❌ WRONG: Mutating existing state
gameState.board[3][4] = "R";
gameState.sideToMove = "black";

// ✅ CORRECT: Create new state
const newState = new GameState({
  ...gameState,
  board: modifiedBoard,
  sideToMove: "black",
  turnIndex: gameState.turnIndex + 1,
});
```

### Performance Characteristics

- **Creation**: O(1) shallow copy + O(64) board copy = O(1)
- **Clone**: O(64) for board deep copy
- **Position Key**: O(64) but cached after first call
- **Serialize**: O(64)

---

## Action System (`src/core/Action.js`)

### Purpose

Encapsulates all game operations as **command objects**. Actions are:

- **Immutable**: Cannot be modified after creation
- **Serializable**: Can be sent over network
- **Reversible**: Can be undone/redone
- **Validatable**: Can check if action is legal before applying

### Design Pattern

**Command Pattern**: Each action type is a class that knows how to:

1. Validate itself against a game state
2. Apply itself to produce a new game state
3. Serialize itself for network transmission

### Action Types

```javascript
const ACTION_TYPES = {
  MOVE: "MOVE", // Standard piece move
  COMBINE: "COMBINE", // Merge two pieces
  DECOMBINE: "DECOMBINE", // Split hybrid piece
  CASTLE: "CASTLE", // Castling (reserved)
  PROMOTE: "PROMOTE", // Pawn promotion (reserved)
  SYSTEM: "SYSTEM", // Resign, draw offers, etc.
};
```

### Base Action Class

```javascript
class Action {
  constructor(actorColor, turnIndex, actionId) {
    this.action_id = actionId || generateActionId(actorColor, turnIndex);
    this.actor_color = actorColor;
    this.turn_index = turnIndex;
    this.timestamp = Date.now();
  }

  // MUST IMPLEMENT in subclasses:
  validate(gameState) {
    throw new Error("Not implemented");
  }
  apply(gameState) {
    throw new Error("Not implemented");
  }
  serialize() {
    throw new Error("Not implemented");
  }
}
```

### MoveAction

Represents a piece moving from one square to another:

```javascript
class MoveAction extends Action {
  constructor(actorColor, turnIndex, fromPos, toPos, capturedPiece = null) {
    super(actorColor, turnIndex);
    this.type = ACTION_TYPES.MOVE;
    this.from = fromPos; // {row, col}
    this.to = toPos; // {row, col}
    this.captured = capturedPiece; // piece identifier or null
  }

  validate(gameState) {
    // Check if move is legal
    // Returns {valid: boolean, error: string}
  }

  apply(gameState) {
    // Move piece on board
    // Update turn, history, captured pieces
    // Return new GameState
  }
}
```

### CombineAction

Represents merging two pieces into a hybrid:

```javascript
class CombineAction extends Action {
  constructor(actorColor, turnIndex, piece1Pos, piece2Pos, resultPos) {
    super(actorColor, turnIndex);
    this.type = ACTION_TYPES.COMBINE;
    this.piece1_pos = piece1Pos;
    this.piece2_pos = piece2Pos;
    this.result_pos = resultPos; // Where hybrid will be placed
    this.piece1_type = null; // Filled during validation
    this.piece2_type = null;
    this.hybrid_type = null; // e.g., 'RB'
  }

  validate(gameState) {
    // Check if pieces can combine
    // Check if placement is legal
  }

  apply(gameState) {
    // Remove both pieces
    // Place hybrid at result position
    // Return new GameState
  }
}
```

### DeCombineAction

Represents splitting a hybrid piece:

```javascript
class DeCombineAction extends Action {
  constructor(actorColor, turnIndex, hybridPos, stayingPos, spawningPos) {
    super(actorColor, turnIndex);
    this.type = ACTION_TYPES.DECOMBINE;
    this.hybrid_pos = hybridPos;
    this.staying_pos = stayingPos; // Where one component stays
    this.spawning_pos = spawningPos; // Where other component spawns
    this.staying_piece = null; // Filled during validation
    this.spawning_piece = null;
  }

  validate(gameState) {
    // Check if piece is hybrid
    // Check if spawn square is safe
  }

  apply(gameState) {
    // Split hybrid into components
    // Place pieces at specified positions
    // Return new GameState
  }
}
```

### Action Lifecycle

```
1. CREATE
   ↓
   new MoveAction(color, turn, from, to)

2. VALIDATE
   ↓
   action.validate(gameState)
   → {valid: true} or {valid: false, error: "..."}

3. APPLY (if valid)
   ↓
   newState = action.apply(gameState)

4. STORE (in History)
   ↓
   history.pushEntry(action, oldState, newState)

5. SERIALIZE (for network)
   ↓
   json = action.serialize()
   sendToOpponent(json)
```

### Action ID Format

Each action gets a unique ID: `{actorColor}_{turnIndex}_{counter}`

Examples:

- `white_0_0` - First action of the game
- `black_5_12` - Black's action on turn 5

### Serialization

Actions can be converted to JSON:

```javascript
const action = new MoveAction(
  "white",
  0,
  { row: 6, col: 4 },
  { row: 4, col: 4 }
);
const json = action.serialize();
// {
//   action_id: "white_0_0",
//   type: "MOVE",
//   actor_color: "white",
//   turn_index: 0,
//   from: {row: 6, col: 4},
//   to: {row: 4, col: 4},
//   timestamp: 1696521234567
// }

const restored = deserializeAction(json);
```

---

## History System (`src/core/History.js`)

### Purpose

Implements **undo/redo** functionality with efficient state storage.

### Design

- Stores actions with state diffs (not full states)
- Supports branching (redo cleared on new action)
- Memory efficient
- Fast undo/redo operations

### Class Structure

```javascript
class History {
  entries = []; // Array of HistoryEntry
  undoneEntries = []; // Redo stack
  positionCounts = {}; // For draw detection (threefold repetition)
}
```

### HistoryEntry

```javascript
class HistoryEntry {
  action; // The Action object
  stateDiff; // Only changed fields
  turnIndex;
  positionKey; // Zobrist hash
  timestamp;
}
```

### State Diff Format

Instead of storing full states, only differences:

```javascript
{
    board: {
        '3,4': 'R',    // board[3][4] = 'R'
        '6,4': ''      // board[6][4] = '' (cleared)
    },
    sideToMove: 'black',
    turnIndex: 1,
    capturedPieces: {
        black: ['P']   // Added 'P' to black's captured pieces
    }
}
```

### Key Methods

#### `pushEntry(action, stateBefore, stateAfter)`

Adds a new action to history:

```javascript
history.pushEntry(moveAction, oldState, newState);
```

**Effects**:

- Clears redo stack (branching semantics)
- Stores state diff
- Updates position counts (for draw detection)

#### `undo()`

Reverts the last action:

```javascript
const previousState = history.undo();
```

**Returns**: Previous GameState or null if nothing to undo

#### `redo()`

Re-applies the last undone action:

```javascript
const nextState = history.redo();
```

**Returns**: Next GameState or null if nothing to redo

#### `canUndo()` / `canRedo()`

Check if undo/redo is available:

```javascript
if (history.canUndo()) {
  // Show undo button
}
```

#### `getLastAction()`

Retrieve most recent action without undoing:

```javascript
const lastAction = history.getLastAction();
// Returns Action object or null
```

### Draw Detection

History tracks position repetition for threefold repetition rule:

```javascript
history.positionCounts = {
  "a4f2d8e...": 2, // This position occurred 2 times
  "b8c3f1a...": 1,
};

if (history.positionCounts[posKey] >= 3) {
  // Threefold repetition - draw can be claimed
}
```

### Memory Management

**Storage Efficiency**:

- Full GameState: ~1-2 KB
- State Diff: ~100-200 bytes (typical move)
- 100 moves: ~10-20 KB (with diffs) vs ~100-200 KB (full states)

**Optimization**: Consider limiting history depth for very long games

---

## EngineInterface (`src/core/EngineInterface.js`)

### Purpose

High-level API for game operations. Facade pattern over GameState + Actions + History.

### Status

⚠️ **Partially Implemented**: Structure exists, but many methods are stubs

### Class Structure

```javascript
class ChessEngine {
    constructor(initialState) {
        this.state = initialState || GameState.createInitial();
        this.history = new History();
    }

    // Core Operations
    applyAction(action) { ... }
    listLegalActions(position) { ... }
    isGameOver() { ... }

    // Undo/Redo
    undo() { ... }
    redo() { ... }

    // Analysis (future)
    evaluatePosition() { ... }
    suggestMove() { ... }

    // State Access
    getState() { ... }
    getHistory() { ... }
}
```

### Key Methods

#### `applyAction(action)`

Apply an action to the current state:

```javascript
const moveAction = new MoveAction("white", 0, from, to);
const result = engine.applyAction(moveAction);
// Returns {success: boolean, state: GameState, error: string}
```

#### `listLegalActions(position = null)`

Generate all legal actions for current position:

```javascript
const actions = engine.listLegalActions();
// Returns: [MoveAction, MoveAction, CombineAction, ...]
```

⚠️ **Current Status**: Partially implemented, returns only move actions

#### `isGameOver()`

Check if game has ended:

```javascript
const result = engine.isGameOver();
// Returns: {over: boolean, result: 'white_win' | 'black_win' | 'draw' | null}
```

⚠️ **Current Status**: Stub implementation

#### `undo()` / `redo()`

Delegates to History system:

```javascript
const previousState = engine.undo();
```

### Future Enhancements

#### Position Evaluation

```javascript
evaluatePosition(state) {
    // Calculate position score
    // Positive = white advantage, negative = black advantage
    return {
        score: +2.5,
        evaluation: "White is better",
        factors: {
            material: +3.0,
            position: -0.5,
            combinations: +1.0
        }
    };
}
```

#### Move Suggestions (AI)

```javascript
suggestMove(depth = 3) {
    // Use minimax or alpha-beta search
    return {
        action: bestMoveAction,
        score: 2.5,
        principalVariation: [action1, action2, action3]
    };
}
```

---

## PositionKey (`src/core/PositionKey.js`)

### Purpose

Generate unique hash for board positions using **Zobrist hashing**.

### Use Cases

1. **Transposition Tables**: Cache position evaluations in AI
2. **Draw Detection**: Identify threefold repetition
3. **Position Comparison**: Fast equality check

### Zobrist Hashing

Assigns random 64-bit numbers to each (piece, square) combination:

```javascript
zobristTable[piece][row][col] = random64BitNumber;
```

Position hash = XOR of all piece positions:

```javascript
hash = 0
for each piece on board:
    hash ^= zobristTable[piece.type][piece.row][piece.col]
hash ^= sideToMoveHash
hash ^= castlingRightsHash
hash ^= enPassantHash
```

### Key Properties

- **Fast**: O(64) to compute, O(1) to update incrementally
- **Unique**: Collisions extremely rare (2^-64 probability)
- **Incremental**: Can update hash when moving piece without recalculating

### Implementation

```javascript
function computePositionKey(gameState) {
  let key = 0n; // BigInt for 64-bit operations

  // Hash all pieces
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece) {
        key ^= zobristTable[piece][row][col];
      }
    }
  }

  // Hash side to move
  if (gameState.sideToMove === "black") {
    key ^= sideToMoveHash;
  }

  // Hash castling rights
  // ... (if implemented)

  // Hash en passant
  // ... (if implemented)

  return key.toString(16); // Convert to hex string
}
```

### Caching

GameState caches position key:

```javascript
getPositionKey() {
    if (!this._positionKey) {
        this._positionKey = computePositionKey(this);
    }
    return this._positionKey;
}
```

### Incremental Updates (Future)

Instead of recalculating entire hash:

```javascript
// Remove piece from old position
newKey = oldKey ^ zobristTable[piece][oldRow][oldCol];
// Add piece to new position
newKey ^= zobristTable[piece][newRow][newCol];
```

---

## Integration Example

How all core systems work together:

```javascript
// 1. Initialize
const engine = new ChessEngine();
const state = engine.getState();

// 2. User selects piece and destination
const from = { row: 6, col: 4 };
const to = { row: 4, col: 4 };

// 3. Create action
const action = new MoveAction(state.sideToMove, state.turnIndex, from, to);

// 4. Validate
const validation = action.validate(state);
if (!validation.valid) {
  console.error(validation.error);
  return;
}

// 5. Apply
const result = engine.applyAction(action);
if (result.success) {
  // Update UI with result.state
  setGameState(result.state);
}

// 6. User clicks undo
const previousState = engine.undo();
if (previousState) {
  setGameState(previousState);
}

// 7. Network sync (future)
const serialized = action.serialize();
sendToOpponent(serialized);
```

---

## Known Issues in Core Systems

1. **Action.js line 68, 89, 393**: Unused parameters `gameState` and `json`
2. **PositionKey.js line 65**: Unused variable `turnIndex`
3. **EngineInterface.js**: Many unused imports
4. **History.js**: `require()` instead of `import` (line 43)
5. **No unit tests**: Core systems lack test coverage

See [Known Issues](./07-ISSUES-AND-BUGS.md) for details and fixes.

---

**Next**: Read [Game Mechanics](./04-GAME-MECHANICS.md) to understand the gameplay rules.
