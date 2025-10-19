# Copilot Instructions for Chess Combination Game

## Project Overview
This is a unique chess variant with **piece combination/splitting mechanics** and **peer-to-peer multiplayer via WebRTC**. Players can merge compatible pieces (e.g., Rook+Bishop) into hybrid pieces with combined abilities, and later split them back.

## Architecture & Core Concepts

### State Management Pattern
This project uses **unidirectional data flow with ref-based optimization**:
- `App.jsx` owns game state and timer state (via `useRef` to prevent re-renders)
- `ChessBoard.jsx` receives state as props and calls `onGameStateChange` callback
- Game state flows: `App → ChessBoard → UI Components`
- Timer state uses `timerStateRef` (ref) to avoid 100ms re-render cascades

### Game Modes & State
Three distinct modes tracked in `gameState` and WebRTC hook:
1. **singlePlayer**: Local play, any move allowed
2. **host**: Multiplayer initiator, plays White, validates moves by turn
3. **guest**: Multiplayer joiner, plays Black, validates moves by turn

### Hybrid Piece System
Hybrids are identified by **two-letter lowercase/uppercase strings**:
- `rb`/`RB` = Rook+Bishop (queen-like movement)
- `rn`/`RN` = Rook+Knight
- `bn`/`BN` = Bishop+Knight  
- `qn`/`QN` = Queen+Knight

**Critical constraints** (see `combinationRules.js`):
- Cannot combine: Pawns, Kings, or existing hybrids (Issue #17)
- Must be same color and reachable (piece can legally move to partner's square)
- Placement determined by piece value hierarchy (see `PIECE_VALUES` in `constants.js`)

## Key Files & Responsibilities

### Core Game Logic (`src/utils/`)
- **`constants.js`**: All piece types, allowed combinations, initial board, helper functions for piece color/type
- **`gameState.js`**: State creation, move execution, undo/redo, combination execution
- **`moveValidation.js`**: Piece-specific move validation (includes hybrid movement logic)
- **`moveCalculator.js`**: Legal move generation, check detection, checkmate detection
- **`combinationRules.js`**: Combination eligibility, reachability checks, hybrid creation
- **`deCombinationRules.js`**: Hybrid splitting logic with adjacent square priority order

### React Architecture (`src/components/`)
- **`ChessBoard.jsx`**: Main orchestrator, delegates to custom hooks for different game modes
- **Custom hooks** (`hooks/`): 
  - `useMoveHandler`: Normal piece movement
  - `useCombineMode`: Two-click piece combination
  - `useDeCombineMode`: Hybrid splitting with confirmation dialog
  - `usePromotion`: Pawn promotion handling

### Multiplayer System
- **`useWebRTC.js`**: WebRTC state management, connection lifecycle
- **`WebRTCSignalingService.js`**: Core P2P logic with automatic reconnection (max 3 attempts)
- **Firebase Firestore**: Signaling server for ICE candidate exchange
- **Heartbeat system**: 90-second timeout, prevents indefinite hangs

## Development Workflows

### Running the App
```bash
npm run dev        # Start Vite dev server (default: http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint check
```

### Firebase Setup Required
1. Create Firebase project and enable Firestore (see `FIREBASE_SETUP.md`)
2. Create `.env` file with Firebase credentials:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. Environment validation happens in `src/config/firebase.js` on startup

### Testing Multiplayer Locally
Open two browser windows/tabs:
1. Window 1: Click "Host Game" → Share connection ID
2. Window 2: Enter connection ID → Click "Join Game"
3. Game state syncs via WebRTC data channel

## Project-Specific Conventions

### Piece Representation
- **Single character**: Standard pieces (`k, q, r, b, n, p`)
- **Two characters**: Hybrid pieces (`rb, rn, bn, qn`)
- **Case = Color**: Uppercase = White, lowercase = Black
- **Empty square**: Empty string `''` (not `null`)

### Board Coordinate System
- Row 0 = Black's back rank, Row 7 = White's back rank
- `board[row][col]` indexing (not algebraic notation internally)
- Board flipping in multiplayer: Black player sees flipped board (`isBoardFlipped` prop)

### Move Validation Layers
1. **Basic validation**: `isValidMove()` checks piece movement rules
2. **Check prevention**: `wouldBeInCheck()` prevents exposing king
3. **Turn validation**: `canMakeMove()` in ChessBoard enforces multiplayer turn order
4. **Reachability**: For combinations, `isReachable()` validates pieces can reach each other

### WebRTC Message Protocol
Messages sent via data channel have structure:
```javascript
{
  type: 'gameStateSync',
  gameState: { board, currentTurn, capturedPieces, ... },
  timerState: { whiteTime, blackTime, lastUpdate },
  timestamp: Date.now()
}
```

### Timer Implementation
- **Ref-based**: `timerStateRef` in App.jsx prevents parent re-renders
- **Multiplayer only**: Timers hidden in single-player mode
- **Pause on reconnect**: Both clocks freeze when `isReconnecting === true`
- **Time deduction**: Happens in `handleGameStateChange()` when moves complete

## Common Patterns

### Adding a New Piece Type
1. Add to `PIECES` object in `constants.js`
2. Add symbol to `PIECE_SYMBOLS`
3. Add value to `PIECE_VALUES`
4. Implement movement in `moveValidation.js` (add case in `isValidMove`)
5. Update `moveCalculator.js` for legal move generation

### Adding a New Game Mode
1. Create custom hook in `src/components/hooks/`
2. Import and use in `ChessBoard.jsx`
3. Add mode toggle in `GameControls.jsx`
4. Handle state in `gameState.js` if persistence needed

### WebRTC State Synchronization
Always update `timerStateRef.current` when game state changes in multiplayer:
```javascript
if (webRTC.isConnected) {
  webRTC.sendGameState({
    type: 'gameStateSync',
    gameState: newGameState,
    timerState: { ...timerStateRef.current },
    timestamp: Date.now()
  });
}
```

## Known Issues & Constraints
- **Issue #17**: Hybrid pieces cannot be combined with any other piece
- Undo/redo does NOT sync across multiplayer peers (local only)
- Reconnection limited to 3 attempts with exponential backoff (2s, 4s, 8s delays)
- Firebase security rules should be tightened for production (see `FIREBASE_SETUP.md`)

## Documentation
Extensive docs in `/docs/`:
- `TIMER_IMPLEMENTATION.md`: Timer architecture and synchronization details
- `WEBRTC_RECONNECTION_ARCHITECTURE.md`: Connection lifecycle, states, edge cases
- `WEBRTC_DISCONNECTION_DEBUGGING.md`: Troubleshooting multiplayer issues

## AI Agent Tips
- When modifying game logic, check BOTH `moveValidation.js` and `moveCalculator.js`
- Hybrid piece logic is split: combination in `combinationRules.js`, splitting in `deCombinationRules.js`
- Always test multiplayer changes with two browser windows
- Board state is immutable - use `copyBoard()` from `gameState.js` before modifications
- Console logs are extensive - check browser console for state flow debugging
