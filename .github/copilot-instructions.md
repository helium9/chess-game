# Chess Piece Combination Game - AI Coding Agent Instructions

## Project Overview
A unique chess variant built with React + Vite that allows players to **combine and split pieces** (e.g., Rook + Bishop → Rook-Bishop hybrid). Supports single-player, peer-to-peer multiplayer via WebRTC, and vs AI engine mode.

## Architecture

### Game State Flow (Critical)
- **Single source of truth**: `App.jsx` owns `gameState`, passes down to `ChessBoard.jsx` via props
- **Controlled component pattern**: `ChessBoard` receives `gameState` and `onGameStateChange` callback
- **State updates propagate**: ChessBoard → App → WebRTC peer (if connected) / AI engine (if vs mode)
- **Timer state**: Managed in `App.jsx` via `timerStateRef` (ref to avoid re-renders), synchronized with game state

### Core Game State Structure
```javascript
{
  board: Array<Array<string>>,  // 8x8 grid, pieces like 'K', 'p', 'rb' (hybrid)
  currentTurn: 'white' | 'black',
  moveHistory: Array,
  capturedPieces: { white: [], black: [] },
  undoStack: Array,
  redoStack: Array,
  castlingRights: { white: {kingSide, queenSide}, black: {...} },
  enPassantTarget: {row, col} | null
}
```

## Unique Mechanics

### Piece Combinations
- **Allowed pairs**: `r+b`, `r+n`, `b+n`, `q+n` (same color only)
- **Hybrid notation**: lowercase 2-char (e.g., `'rb'` for black Rook-Bishop)
- **Cannot combine**: Pawns, Kings, existing hybrids
- **Placement rule**: Higher piece value wins placement square (ties → anchor square)
- **Reachability**: One piece must legally reach the other's square

### De-combination
- **Splitting hybrids**: Reverse process returns component pieces
- **Spawn squares**: Find adjacent empty squares for both components
- **Safety check**: Neither component can leave King in check after split
- **Assignment selection**: Deterministic algorithm (`computeLegalAssignments`)

### AI Engine (`src/ai/`)
- **Alpha-beta pruning**: Negamax framework with move ordering (MVV-LVA)
- **Transposition Table (Phase 2A)**: 128MB cache using Zobrist hashing
  - Thread-safe with Atomics (ready for web workers)
  - Hash includes: board + turn + castling rights + en passant
  - 40-60% hit rate at depth 6 (2x speedup)
- **Zobrist hashing**: 64-bit position fingerprints for TT
  - 1,280 keys for all pieces (including hybrids)
  - Incremental update functions (for future optimization)
- **Piece-square tables**: Positional evaluation for all pieces including hybrids
- **Hybrid PST strategy**: Weighted average of components (e.g., `rb = 0.6*ROOK_TABLE + 0.4*BISHOP_TABLE`)
- **Move types handled**: Normal, captures, castling, promotion, combine, de-combine
- **Difficulty levels**: `AI_DIFFICULTY.EASY/MEDIUM/HARD` (depth 2/4/6)
- **TODO Phase 2B-D**: Web workers, incremental hashing, iterative deepening

### WebRTC Multiplayer
- **Signaling**: Firebase Firestore for ICE candidate exchange
- **Data channel**: `gameState` channel for real-time state sync
- **Reconnection**: Up to 3 attempts with progressive delays (see `WebRTCSignalingService.js`)
- **Heartbeat**: 90-second timeout for connection health monitoring
- **Graceful disconnect**: Explicit "opponent left" vs connection failure
- **Role-based colors**: Host = White, Guest = Black

## Key Conventions

### File Organization
- **Hooks in `components/hooks/`**: Custom hooks prefixed with `use` (e.g., `useCombineMode`, `useMoveHandler`)
- **UI components in `components/ui/`**: Pure presentational components
- **Helpers in `components/helpers/`**: Non-hook utility functions for UI logic
- **Utils in `src/utils/`**: Core game logic (pure functions, no React)
- **AI in `src/ai/`**: Isolated AI engine (no UI dependencies)

### Game Mode States
```javascript
gameMode: 'singlePlayer' | 'host' | 'guest' | 'vsEngine'
playerColor: 'white' | 'black' | null  // null in singlePlayer
```
- **Move validation**: `canMakeMove()` checks gameMode + playerColor + currentTurn
- **Board flip**: Guest sees board flipped (black at bottom)

### Piece Notation (Case-sensitive)
- **White**: Uppercase (`'K'`, `'Q'`, `'RB'`)
- **Black**: Lowercase (`'k'`, `'q'`, `'rb'`)
- **Empty square**: `''` (empty string)
- **Hybrids**: Always 2 characters (`'rb'`, `'rn'`, `'bn'`, `'qn'`)

## Development Workflows

### Run Dev Server
```bash
npm run dev  # Vite dev server on http://localhost:5173
```

### Firebase Setup (Required for WebRTC)
1. Follow `FIREBASE_SETUP.md` to create project + Firestore
2. Add TURN server credentials to `.env`:
   ```
   VITE_TURN_SERVER_URL=...
   VITE_TURN_SERVER_USERNAME=...
   VITE_TURN_SERVER_CREDENTIAL=...
   ```
3. Update `src/config/firebase.js` with your Firebase config

### Test AI
```bash
node src/ai/test-ai.js  # Standalone AI test script
```

## Common Patterns

### Immutable State Updates
Always use helpers from `gameState.js`:
```javascript
const newBoard = copyBoard(board);  // Deep copy
const newBoard = makeMove(board, fromRow, fromCol, toRow, toCol);
const newState = saveStateForUndo(gameState);  // Before mutations
```

### Move Validation Chain
1. `calculateLegalMoves(board, row, col)` → basic legal moves
2. `wouldBeInCheck(board, fromRow, fromCol, toRow, toCol, turn)` → safety check
3. For combines: `canReachForCombine()` + `canCombinePieces()`

### Castling Rights Updates
- **Moving King/Rook**: Remove respective castling rights
- **AI search**: `applyMove()` returns `{newBoard, newCastlingRights}` to preserve rights through search tree

## Known Issues (See `docs/07-ISSUES-AND-BUGS.md`)
- En passant not implemented
- Hybrid promotion choices don't show hybrid options
- Undo/redo doesn't restore castling rights correctly

## Important Files for AI Context
- **Core game logic**: `utils/gameState.js`, `utils/moveCalculator.js`
- **Combination rules**: `utils/combinationRules.js`, `utils/deCombinationRules.js`
- **Main component**: `components/ChessBoard.jsx` (hooks coordination)
- **AI entry point**: `ai/alphaBeta.js` (findBestMove function)
- **WebRTC architecture**: `docs/WEBRTC_RECONNECTION_ARCHITECTURE.md`

## When Making Changes
- **Game logic changes**: Update pure functions in `utils/`, never modify state directly
- **UI changes**: Update components in `components/ui/`, use existing hooks
- **AI changes**: Modify `ai/` modules, test with `test-ai.js` before integrating
- **WebRTC changes**: Understand reconnection flow in `WebRTCSignalingService.js` before touching
- **State synchronization**: Always consider multiplayer sync when modifying game state
