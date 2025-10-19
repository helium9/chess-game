# Architecture Guide

## High-Level Architecture

This project follows a **layered architecture** with clear separation between UI, game logic, and core systems.

```
┌─────────────────────────────────────────────────────────┐
│                     React UI Layer                       │
│  (components/, hooks/, presentation logic)              │
├─────────────────────────────────────────────────────────┤
│                   Game Logic Layer                       │
│  (utils/, move calculation, validation, rules)          │
├─────────────────────────────────────────────────────────┤
│                    Core Engine Layer                     │
│  (core/, GameState, Actions, History, Engine)           │
├─────────────────────────────────────────────────────────┤
│                   Network Layer (Future)                 │
│  (network/, synchronization, messaging)                 │
└─────────────────────────────────────────────────────────┘
```

## Design Principles

### 1. **Immutability**

- Game state is never mutated directly
- All changes produce new state objects
- Enables undo/redo and time travel debugging

### 2. **Action-Command Pattern**

- All game changes are represented as Action objects
- Actions are serializable and can be replayed
- Supports network sync and game replay

### 3. **Pure Functions**

- Calculation functions have no side effects
- Given same inputs, always return same outputs
- Easy to test and reason about

### 4. **Separation of Concerns**

- UI components only handle presentation
- Game logic is UI-agnostic
- Core engine is framework-agnostic

### 5. **Single Source of Truth**

- GameState is the authoritative representation
- UI derives from state, never vice versa
- No duplicate state management

## Directory Structure

### `/src/components/` - React UI Components

```
components/
├── ChessBoard.jsx          # Main container component (286 lines)
├── ChessBoard.backup.jsx   # Backup version
├── hooks/                  # Custom React hooks
│   ├── useCombineMode.js   # Combination mode logic
│   ├── useDeCombineMode.js # De-combination mode logic
│   ├── useMoveHandler.js   # Move handling logic
│   └── usePromotion.js     # Promotion dialog logic
├── helpers/                # UI helper functions
│   ├── castlingLogic.js    # Castling checks (unused)
│   ├── messageHelpers.js   # Message formatting
│   └── squareStyling.js    # CSS class generation
└── ui/                     # Presentational components
    ├── CapturedPieces.jsx
    ├── ChessSquare.jsx
    ├── CombineModeIndicator.jsx
    ├── DeCombineConfirmDialog.jsx
    ├── DeCombineModeIndicator.jsx
    ├── GameControls.jsx
    ├── GameLegend.jsx
    ├── PromotionDialog.jsx
    └── StatusMessage.jsx
```

**Purpose**: Handle all UI rendering and user interaction
**Pattern**: Container/Presenter pattern (ChessBoard is container, ui/ are presenters)
**State**: Managed by React hooks, delegated to custom hooks

### `/src/core/` - Core Game Engine

```
core/
├── GameState.js       # Canonical game state model (293 lines)
├── Action.js          # Action/command system (907 lines)
├── History.js         # Undo/redo system (336 lines)
├── EngineInterface.js # Game engine facade (complex)
├── PositionKey.js     # Zobrist hashing for positions
└── rules/             # Rule modules (empty, future)
```

**Purpose**: Provide framework-agnostic game logic
**Pattern**: Command pattern (Actions), Memento pattern (History)
**Key Classes**:

- `GameState`: Immutable snapshot of game position
- `Action`: Base class for all game operations
- `History`: Manages undo/redo stack
- `ChessEngine`: High-level API for game operations

### `/src/utils/` - Game Logic Utilities

```
utils/
├── constants.js           # Game constants, piece definitions
├── gameState.js           # GameState manipulation functions
├── moveCalculator.js      # Legal move generation (275 lines)
├── moveValidation.js      # Move validity checking
├── combinationRules.js    # Piece combination logic (205 lines)
└── deCombinationRules.js  # Piece splitting logic
```

**Purpose**: Pure functions for game calculations
**Pattern**: Functional programming, utility modules
**No Dependencies**: Can be used independently of React

### `/src/network/` - Network Synchronization (Future)

```
network/
├── NetworkSync.js   # Synchronization manager (499 lines)
└── MessageSchema.js # Network message definitions
```

**Purpose**: Enable multiplayer gameplay
**Status**: Designed but not integrated
**Pattern**: Observer pattern, message passing

### `/src/tests/` - Tests (Empty)

**Status**: No tests currently
**Planned**: Jest unit tests, React Testing Library

## Key Architectural Patterns

### 1. Command Pattern (Actions)

All game operations are encapsulated as Action objects:

```javascript
class MoveAction extends Action {
  constructor(actorColor, turnIndex, fromPos, toPos, capturedPiece) {
    super(actorColor, turnIndex);
    this.type = ACTION_TYPES.MOVE;
    this.from = fromPos;
    this.to = toPos;
    this.captured = capturedPiece;
  }

  apply(gameState) {
    // Apply the move to game state
    // Returns new GameState
  }

  validate(gameState) {
    // Check if move is legal
    // Returns {valid: boolean, error: string}
  }
}
```

**Benefits**:

- Encapsulates all information about an operation
- Serializable for network sync and replay
- Reversible for undo/redo
- Testable in isolation

### 2. Observer Pattern (React Hooks)

Custom hooks observe game state and provide derived data:

```javascript
function useCombineMode(gameState, setGameState, setMessage) {
  const [combineMode, setCombineMode] = useState(false);
  const [eligiblePairs, setEligiblePairs] = useState([]);

  // Computed based on gameState
  const enterCombineMode = () => {
    /* ... */
  };
  const exitCombineMode = () => {
    /* ... */
  };

  return { combineMode, eligiblePairs, enterCombineMode, exitCombineMode };
}
```

**Benefits**:

- Separates complex logic from components
- Reusable across components
- Testable independently

### 3. Strategy Pattern (Move Calculation)

Different piece types use different move strategies:

```javascript
function generatePossibleMoves(board, row, col, pieceType) {
  switch (pieceType) {
    case PIECES.PAWN:
      return generatePawnMoves(board, row, col);
    case PIECES.ROOK:
      return generateRookMoves(board, row, col);
    // ... etc
  }
}
```

**Benefits**:

- Easy to add new piece types
- Each strategy is isolated and testable

### 4. Memento Pattern (History)

Game history stores state snapshots for undo/redo:

```javascript
class History {
  constructor() {
    this.entries = []; // Past actions
    this.undoneEntries = []; // Future actions (for redo)
  }

  pushEntry(action, stateBefore, stateAfter) {
    // Store action and state diff
    // Clear redo stack
  }

  undo() {
    // Restore previous state
  }

  redo() {
    // Re-apply undone action
  }
}
```

**Benefits**:

- Efficient state snapshots (only store diffs)
- Bidirectional navigation (undo/redo)
- Memory efficient

## Data Flow

### Normal Move Flow

```
User Clicks Square
       ↓
ChessBoard.handleSquareClick()
       ↓
useMoveHandler.handleSquareClick()
       ↓
calculateLegalMoves() [utils/moveCalculator.js]
       ↓
isValidMove() [utils/moveValidation.js]
       ↓
makeMove() [utils/gameState.js]
       ↓
setGameState() [React state update]
       ↓
Re-render ChessBoard with new state
```

### Combination Flow

```
User Clicks "Combine Mode"
       ↓
useCombineMode.enterCombineMode()
       ↓
findAllEligibleCombinationPairs() [utils/combinationRules.js]
       ↓
Display eligible pieces with indicators
       ↓
User Selects Two Pieces
       ↓
handleCombineClick()
       ↓
executeCombine() [utils/combinationRules.js]
       ↓
setGameState() [React state update]
       ↓
Re-render with hybrid piece
```

### Undo Flow

```
User Clicks "Undo"
       ↓
ChessBoard.handleUndo()
       ↓
undoMove() [utils/gameState.js]
       ↓
History.undo()
       ↓
Restore previous GameState
       ↓
setGameState() [React state update]
       ↓
Re-render with previous board position
```

## State Management

### Game State Structure

```javascript
{
    board: [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        // ... 8x8 array of piece identifiers
    ],
    currentTurn: 'white' | 'black',
    capturedPieces: {
        white: ['p', 'n', ...],
        black: ['P', 'R', ...]
    },
    history: [
        // Array of HistoryEntry objects
    ],
    historyIndex: 0, // Current position in history
    metadata: {
        lastMove: { from: {row, col}, to: {row, col} },
        check: false,
        checkmate: false
    }
}
```

### UI State Structure

Managed in ChessBoard component:

```javascript
{
    selectedSquare: { row: 2, col: 3 } | null,
    legalMoves: [{ row: 2, col: 4 }, ...],
    combineMode: boolean,
    deCombineMode: boolean,
    message: string,
    promotionDialog: { ... } | null,
    deCombineDialog: { ... } | null
}
```

## Component Hierarchy

```
App
└── ChessBoard (Container)
    ├── StatusMessage
    ├── CombineModeIndicator
    ├── DeCombineModeIndicator
    ├── GameLegend
    ├── CapturedPieces
    ├── [Board Grid]
    │   └── ChessSquare (64 instances)
    ├── GameControls
    ├── PromotionDialog (conditional)
    └── DeCombineConfirmDialog (conditional)
```

## Module Dependencies

### Dependency Graph

```
ChessBoard.jsx
├── useMoveHandler
│   ├── moveCalculator
│   │   ├── moveValidation
│   │   └── constants
│   └── gameState
├── useCombineMode
│   ├── combinationRules
│   │   ├── constants
│   │   ├── moveValidation
│   │   └── moveCalculator
│   └── gameState
├── useDeCombineMode
│   ├── deCombinationRules
│   │   └── constants
│   └── gameState
└── UI Components
    ├── ChessSquare
    ├── GameControls
    └── [others]
```

### Circular Dependency Issues

⚠️ **Current Problem**: Some modules have circular dependencies

Example:

- `moveCalculator.js` imports `moveValidation.js`
- `moveValidation.js` imports `moveCalculator.js`

**Resolution Strategy**:

- Extract shared utilities to separate module
- Use dependency injection where possible
- Consider refactoring to break cycles

## Performance Considerations

### Current Performance Profile

- **Board Rendering**: Re-renders on every state change

  - Impact: Low (64 squares, simple components)
  - Optimization: React.memo on ChessSquare (not yet implemented)

- **Legal Move Calculation**: O(n) where n = board squares

  - Impact: Medium (called on every piece selection)
  - Optimization: Memoization, incremental updates

- **History Storage**: Linear growth with game length
  - Impact: Low (state diffs are small)
  - Optimization: Not needed yet

### Optimization Opportunities

1. **Memoize Legal Move Calculations**

   ```javascript
   const legalMoves = useMemo(
     () => calculateLegalMoves(board, row, col, currentTurn),
     [board, row, col, currentTurn]
   );
   ```

2. **Virtualize Large Lists** (if game history grows)

3. **Web Workers** (for AI move calculation, future)

4. **Code Splitting** (separate bundle for network code)

## Extensibility Points

### Adding New Piece Types

1. Add piece identifier to `PIECES` in `constants.js`
2. Add symbol to `PIECE_SYMBOLS`
3. Implement move generation in `moveCalculator.js`
4. Add combination rules in `combinationRules.js`

### Adding New Action Types

1. Extend `Action` base class in `core/Action.js`
2. Implement `validate()` and `apply()` methods
3. Add to `ACTION_TYPES` enum
4. Update History system if needed

### Adding Network Multiplayer

1. Integrate `NetworkSync.js` with ChessBoard
2. Implement WebRTC signaling server
3. Add lobby/matchmaking UI
4. Handle connection state and errors

## Design Decisions & Trade-offs

### Decision: Custom Chess Implementation (No chess.js)

**Pros**:

- Full control over combination mechanics
- No external dependencies
- Learning opportunity

**Cons**:

- More bugs (no battle-tested library)
- Missing features (PGN, FEN notation)
- More maintenance

**Verdict**: Worth it for unique mechanics

### Decision: Local State vs Redux

**Pros of Local State**:

- Simpler codebase
- No boilerplate
- Fast iteration

**Cons**:

- Harder to debug complex state
- No time-travel debugging (without Redux DevTools)

**Verdict**: Local state sufficient for current scope

### Decision: Class-Based Actions vs Functional

**Pros of Classes**:

- Encapsulation
- Inheritance (MoveAction extends Action)
- Matches Command pattern

**Cons**:

- More verbose
- Harder to serialize

**Verdict**: Classes appropriate for complex action system

---

**Next**: Read [Core Systems](./03-CORE-SYSTEMS.md) to understand the engine architecture.
