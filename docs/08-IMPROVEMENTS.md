# Improvement Roadmap

This document outlines potential improvements, enhancements, and new features for the chess combination game.

## Quick Wins (1-2 days each)

### Code Quality Improvements

#### 1. Fix Linting Issues

**Priority**: 🔴 Critical  
**Effort**: 1 day  
**Impact**: High

- Remove invalid Unicode characters
- Fix ESLint configuration
- Remove unused imports/variables
- Clean up code warnings

**Benefits**: Clean codebase, proper linting, better DX

---

#### 2. Add PropTypes or TypeScript

**Priority**: 🟠 High  
**Effort**: 2-3 days  
**Impact**: Medium

**Current**: No type checking

```javascript
function ChessSquare({ row, col, piece, onClick }) { ... }
```

**Option A - PropTypes**:

```javascript
import PropTypes from "prop-types";

ChessSquare.propTypes = {
  row: PropTypes.number.isRequired,
  col: PropTypes.number.isRequired,
  piece: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};
```

**Option B - TypeScript** (recommended):

```typescript
interface ChessSquareProps {
    row: number;
    col: number;
    piece: string | null;
    onClick: (row: number, col: number) => void;
}

function ChessSquare({ row, col, piece, onClick }: ChessSquareProps) { ... }
```

**Benefits**: Type safety, better IDE support, catch bugs early

---

#### 3. Extract Utility Constants

**Priority**: 🟡 Medium  
**Effort**: 1 day  
**Impact**: Low

Create centralized configuration:

```javascript
// config/gameConfig.js
export const GAME_CONFIG = {
  BOARD_SIZE: 8,
  MAX_HISTORY_ENTRIES: 100,
  UNDO_LIMIT: 50,
  ANIMATION_DURATION: 300,
  COLORS: {
    WHITE: "#ffffff",
    BLACK: "#1a1a1a",
    HIGHLIGHT: "#4ade80",
    SELECT: "#3b82f6",
  },
};
```

**Benefits**: Easy to adjust, single source of truth

---

#### 4. Add Code Formatting

**Priority**: 🟡 Medium  
**Effort**: 0.5 days  
**Impact**: Low

Setup Prettier:

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

Add format script:

```json
"scripts": {
  "format": "prettier --write \"src/**/*.{js,jsx}\"",
  "format:check": "prettier --check \"src/**/*.{js,jsx}\""
}
```

**Benefits**: Consistent code style, less bike-shedding

---

### UI/UX Improvements

#### 5. Add Move Animations

**Priority**: 🟠 High  
**Effort**: 2 days  
**Impact**: High

Animate piece movements:

```javascript
function ChessSquare({ piece, row, col }) {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (piece) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
    }
  }, [piece]);

  return (
    <div className={`square ${animating ? "animate-move" : ""}`}>{piece}</div>
  );
}
```

**Animations**:

- Slide pieces between squares
- Fade in/out for captures
- Pop effect for combinations
- Pulse for de-combinations

**Benefits**: Better visual feedback, more engaging

---

#### 6. Add Sound Effects

**Priority**: 🟡 Medium  
**Effort**: 1 day  
**Impact**: Medium

```javascript
const sounds = {
  move: new Audio("/sounds/move.mp3"),
  capture: new Audio("/sounds/capture.mp3"),
  combine: new Audio("/sounds/combine.mp3"),
  check: new Audio("/sounds/check.mp3"),
};

function playSound(type) {
  sounds[type].currentTime = 0;
  sounds[type].play();
}
```

**Sound Effects**:

- Move piece (subtle click)
- Capture piece (sharper sound)
- Combine pieces (synthesis sound)
- De-combine (split sound)
- Check warning (alert tone)
- Checkmate (game end sound)

**Benefits**: Immersive experience, audio feedback

---

#### 7. Improve Mobile Responsiveness

**Priority**: 🟠 High  
**Effort**: 3 days  
**Impact**: High

**Current Issues**:

- Board too large on mobile
- Buttons too small to tap
- No touch gestures

**Improvements**:

```javascript
// Responsive board size
const boardSize = window.innerWidth < 768 ? "small" : "large";

// Touch-friendly controls
<button className="min-h-[44px] min-w-[44px]">Combine Mode</button>;

// Swipe gestures for undo/redo
const swipeHandlers = useSwipe({
  onSwipeLeft: () => handleRedo(),
  onSwipeRight: () => handleUndo(),
});
```

**Benefits**: Playable on mobile, wider audience

---

#### 8. Add Dark/Light Theme Toggle

**Priority**: 🟡 Medium  
**Effort**: 1 day  
**Impact**: Medium

```javascript
const [theme, setTheme] = useState("dark");

const themes = {
  dark: {
    background: "from-slate-900 via-purple-900",
    square: { light: "bg-gray-300", dark: "bg-gray-700" },
  },
  light: {
    background: "from-blue-50 via-purple-50",
    square: { light: "bg-gray-100", dark: "bg-gray-400" },
  },
};
```

**Benefits**: User preference, accessibility

---

## Medium Features (1-2 weeks each)

### Gameplay Enhancements

#### 9. Implement Checkmate Detection

**Priority**: 🔴 Critical  
**Effort**: 1 week  
**Impact**: High

**Current**: Game ends on king capture  
**Goal**: Standard chess checkmate

```javascript
function isCheckmate(gameState) {
  // 1. King must be in check
  if (!isKingInCheck(gameState, gameState.sideToMove)) {
    return false;
  }

  // 2. No legal move can escape check
  const allMoves = getAllLegalMoves(gameState);
  for (const move of allMoves) {
    const testState = applyMove(gameState, move);
    if (!isKingInCheck(testState, gameState.sideToMove)) {
      return false; // Found escape move
    }
  }

  return true; // Checkmate!
}
```

**Includes**:

- Check detection
- Escape move validation
- Checkmate UI notification
- Win/loss tracking

**Benefits**: Proper chess rules, better gameplay

---

#### 10. Add Castling

**Priority**: 🟡 Medium  
**Effort**: 1 week  
**Impact**: Medium

**Rules**:

- King and rook haven't moved
- No pieces between them
- King not in check
- King doesn't pass through check
- King doesn't land in check

```javascript
function canCastle(gameState, side) {
  const rights = gameState.castlingRights[gameState.sideToMove][side];
  if (!rights) return false;

  // Check path is clear and safe
  const path = getCastlingPath(side);
  for (const square of path) {
    if (board[square.row][square.col] !== "") return false;
    if (isSquareAttacked(square, opponent)) return false;
  }

  return true;
}
```

**Benefits**: Standard chess feature, strategic depth

---

#### 11. Add En Passant

**Priority**: 🟢 Low  
**Effort**: 3 days  
**Impact**: Low

Special pawn capture:

```javascript
function checkEnPassant(gameState, fromPos, toPos) {
  const piece = board[fromPos.row][fromPos.col];
  if (getBasePieceType(piece) !== "p") return false;

  const target = gameState.enPassantTarget;
  if (!target) return false;

  return toPos.row === target.row && toPos.col === target.col;
}
```

**Benefits**: Complete pawn rules

---

#### 12. Implement Pawn Promotion

**Priority**: 🟡 Medium  
**Effort**: 3 days  
**Impact**: Medium

**Current**: Dialog exists but not fully integrated

**Enhancements**:

- Support promotion to hybrid pieces
- Add promotion animation
- Allow under-promotion (to rook, bishop, knight)

```javascript
function handlePromotion(pawnPos, promoteTo) {
  // Support standard pieces
  if (["Q", "R", "B", "N"].includes(promoteTo)) {
    // Standard promotion
  }

  // Support hybrid pieces (unique feature!)
  if (["RB", "RN", "BN", "QN"].includes(promoteTo)) {
    // Promote to hybrid (if unlocked)
  }
}
```

**Benefits**: Complete pawn mechanics, unique twist

---

#### 13. Add Stalemate Detection

**Priority**: 🟡 Medium  
**Effort**: 2 days  
**Impact**: Low

```javascript
function isStalemate(gameState) {
  // King NOT in check
  if (isKingInCheck(gameState)) return false;

  // But no legal moves available
  const legalMoves = getAllLegalMoves(gameState);
  return legalMoves.length === 0;
}
```

**Benefits**: Correct draw rules

---

### Testing & Quality

#### 14. Add Unit Tests

**Priority**: 🔴 Critical  
**Effort**: 2 weeks  
**Impact**: High

**Setup Jest**:

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Test Coverage Goals**:

- Utils: 80%+ coverage
- Core: 90%+ coverage
- Components: 60%+ coverage

**Example Tests**:

```javascript
// moveCalculator.test.js
describe('calculateLegalMoves', () => {
    describe('Rook', () => {
        it('should move horizontally', () => { ... });
        it('should move vertically', () => { ... });
        it('should stop at friendly pieces', () => { ... });
        it('should capture enemy pieces', () => { ... });
    });

    describe('Hybrid Rook-Bishop', () => {
        it('should combine rook and bishop moves', () => { ... });
    });
});

// combinationRules.test.js
describe('canCombinePieces', () => {
    it('should allow rook + bishop', () => { ... });
    it('should reject king combinations', () => { ... });
    it('should reject hybrid combinations', () => { ... });
});
```

**Benefits**: Confidence in refactoring, regression prevention

---

#### 15. Add E2E Tests

**Priority**: 🟡 Medium  
**Effort**: 1 week  
**Impact**: Medium

**Setup Playwright**:

```bash
npm install --save-dev @playwright/test
```

**Test Scenarios**:

```javascript
test("Complete game flow", async ({ page }) => {
  await page.goto("http://localhost:5173");

  // Move white pawn
  await page.click('[data-square="e2"]');
  await page.click('[data-square="e4"]');

  // Move black pawn
  await page.click('[data-square="e7"]');
  await page.click('[data-square="e5"]');

  // Combine pieces
  await page.click('button:has-text("Combine Mode")');
  await page.click('[data-square="f1"]'); // Bishop
  await page.click('[data-square="g1"]'); // Knight

  // Verify hybrid created
  await expect(page.locator('[data-square="g1"]')).toHaveAttribute(
    "data-piece",
    "BN"
  );
});
```

**Benefits**: Full workflow validation, confidence in UI changes

---

### Performance Optimizations

#### 16. Memoize Expensive Calculations

**Priority**: 🟡 Medium  
**Effort**: 2 days  
**Impact**: Low

```javascript
// Memoize legal moves
const legalMoves = useMemo(
  () => calculateLegalMoves(board, selectedSquare, currentTurn),
  [board, selectedSquare, currentTurn]
);

// Memoize eligible combinations
const eligiblePairs = useMemo(
  () => findAllEligibleCombinationPairs(board, currentTurn),
  [board, currentTurn]
);

// Memoize components
const ChessSquare = React.memo(ChessSquareComponent);
```

**Benefits**: Faster rendering, smoother UX

---

#### 17. Implement Virtual Scrolling

**Priority**: 🟢 Low  
**Effort**: 1 day  
**Impact**: Low

For move history (if grows large):

```javascript
import { FixedSizeList } from "react-window";

<FixedSizeList height={400} itemCount={history.length} itemSize={35}>
  {({ index, style }) => <div style={style}>{history[index].notation}</div>}
</FixedSizeList>;
```

**Benefits**: Handle very long games efficiently

---

## Large Features (3+ weeks each)

### AI Opponent

#### 18. Implement Minimax AI

**Priority**: 🟠 High  
**Effort**: 4 weeks  
**Impact**: High

**Algorithm**:

```javascript
function minimax(gameState, depth, maximizing, alpha, beta) {
  // Base case: reached depth limit or game over
  if (depth === 0 || isGameOver(gameState)) {
    return evaluatePosition(gameState);
  }

  const moves = getAllLegalMoves(gameState);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newState = applyMove(gameState, move);
      const eval = minimax(newState, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newState = applyMove(gameState, move);
      const eval = minimax(newState, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}
```

**Position Evaluation**:

```javascript
function evaluatePosition(gameState) {
  let score = 0;

  // Material count
  score += countMaterial(gameState);

  // Piece position (center control)
  score += evaluatePositioning(gameState);

  // King safety
  score += evaluateKingSafety(gameState);

  // Hybrid piece bonuses
  score += evaluateHybrids(gameState);

  // Mobility (legal move count)
  score += evaluateMobility(gameState);

  return score;
}
```

**Difficulty Levels**:

- Easy: Depth 2, random opening
- Medium: Depth 4, opening book
- Hard: Depth 6, advanced evaluation

**Benefits**: Single-player mode, practice opponent

---

#### 19. Add Opening Book

**Priority**: 🟡 Medium  
**Effort**: 1 week  
**Impact**: Low

Database of common openings:

```javascript
const openingBook = {
  e2e4: {
    // White's first move
    e7e5: "Nf3", // Italian/Spanish opening
    c7c5: "d4", // Sicilian
    e7e6: "d4", // French
  },
};

function getBookMove(gameState) {
  const moveHistory = gameState.history.map((m) => m.notation);
  let node = openingBook;

  for (const move of moveHistory) {
    if (!node[move]) return null; // Out of book
    node = node[move];
  }

  return node; // Suggested next move
}
```

**Benefits**: AI plays stronger openings

---

### Multiplayer

#### 20. Implement Network Sync

**Priority**: 🟠 High  
**Effort**: 4 weeks  
**Impact**: High

**Architecture** (already designed in `src/network/`):

```
Player 1 (Host)              Player 2 (Guest)
     |                              |
     | 1. Action Proposed           |
     |----------------------------->|
     |                              |
     | 2. Validate & Apply          |
     |      Action Applied          |
     |<-----------------------------|
     |                              |
     | 3. Update UI                 | 3. Update UI
```

**WebRTC Integration**:

```javascript
// Signaling server (Node.js + Socket.io)
io.on("connection", (socket) => {
  socket.on("offer", (offer, room) => {
    socket.to(room).emit("offer", offer);
  });

  socket.on("answer", (answer, room) => {
    socket.to(room).emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate, room) => {
    socket.to(room).emit("ice-candidate", candidate);
  });
});

// Client (React)
const peerConnection = new RTCPeerConnection(config);
const dataChannel = peerConnection.createDataChannel("game");

dataChannel.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleNetworkMessage(message);
};

function sendAction(action) {
  const message = action.serialize();
  dataChannel.send(JSON.stringify(message));
}
```

**Components Needed**:

- Lobby/matchmaking UI
- Room creation
- Join room by code
- Connection status indicator
- Reconnection logic
- Chat (optional)

**Benefits**: Play with friends, main feature unlock

---

#### 21. Add Game Lobby

**Priority**: 🟠 High  
**Effort**: 2 weeks  
**Impact**: High

```javascript
function GameLobby() {
  const [rooms, setRooms] = useState([]);

  return (
    <div>
      <h2>Available Games</h2>
      <button onClick={createRoom}>Create Game</button>

      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <span>{room.host}</span>
            <button onClick={() => joinRoom(room.id)}>Join</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Features**:

- Create private/public rooms
- Room codes for friends
- Player profiles
- ELO ratings (future)

**Benefits**: Matchmaking, social features

---

### Advanced Features

#### 22. Add Move History Notation

**Priority**: 🟡 Medium  
**Effort**: 1 week  
**Impact**: Medium

**Standard Notation**:

```javascript
function toAlgebraicNotation(move) {
  const piece = getPieceSymbol(move.piece);
  const from = positionToAlgebraic(move.from);
  const to = positionToAlgebraic(move.to);
  const capture = move.captured ? "x" : "";

  // Standard move: Nf3, e4, Rxf7
  return `${piece}${capture}${to}`;
}

// Extended for combinations
function toCombinationNotation(combine) {
  const p1 = getPieceSymbol(combine.piece1);
  const p2 = getPieceSymbol(combine.piece2);
  const hybrid = getPieceSymbol(combine.hybrid);
  const pos = positionToAlgebraic(combine.resultPos);

  // Custom notation: R+B→RB@d4
  return `${p1}+${p2}→${hybrid}@${pos}`;
}
```

**Benefits**: Game replay, sharing games, analysis

---

#### 23. Implement Game Replay

**Priority**: 🟡 Medium  
**Effort**: 1 week  
**Impact**: Medium

```javascript
function GameReplay({ gameHistory }) {
  const [currentMove, setCurrentMove] = useState(0);

  const goToMove = (index) => {
    const state = replayToMove(gameHistory, index);
    setCurrentMove(index);
    setGameState(state);
  };

  return (
    <div>
      <button onClick={() => goToMove(0)}>⏮ Start</button>
      <button onClick={() => goToMove(currentMove - 1)}>⏪ Prev</button>
      <button onClick={() => goToMove(currentMove + 1)}>⏩ Next</button>
      <button onClick={() => goToMove(gameHistory.length)}>⏭ End</button>

      <div>
        Move {currentMove} / {gameHistory.length}
      </div>

      <ChessBoard gameState={currentGameState} readonly />
    </div>
  );
}
```

**Benefits**: Learn from games, show to friends

---

#### 24. Add Position Analysis

**Priority**: 🟡 Medium  
**Effort**: 2 weeks  
**Impact**: Medium

```javascript
function analyzePosition(gameState) {
  return {
    evaluation: +2.5, // White is winning
    bestMove: suggestBestMove(),
    threats: findThreats(),
    opportunities: findTactics(),
    material: {
      white: 39,
      black: 35,
    },
    activity: {
      white: 15, // Number of legal moves
      black: 12,
    },
    hybridAdvantage: {
      white: 2, // 2 hybrids
      black: 0,
    },
  };
}
```

**UI**:

- Position evaluation bar
- Best move suggestion
- Threat indicators
- Opportunity highlights

**Benefits**: Learning tool, strategic insights

---

#### 25. Save/Load Games

**Priority**: 🟡 Medium  
**Effort**: 1 week  
**Impact**: Medium

```javascript
// Save to localStorage
function saveGame(gameState, name) {
  const saved = {
    name,
    date: new Date().toISOString(),
    state: gameState.serialize(),
    history: gameState.history,
  };

  localStorage.setItem(`game_${name}`, JSON.stringify(saved));
}

// Load from localStorage
function loadGame(name) {
  const saved = localStorage.getItem(`game_${name}`);
  if (!saved) return null;

  const data = JSON.parse(saved);
  return {
    gameState: GameState.deserialize(data.state),
    history: data.history,
  };
}

// Export to JSON file
function exportGame(gameState) {
  const json = JSON.stringify(gameState.serialize(), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `chess-game-${Date.now()}.json`;
  a.click();
}
```

**Benefits**: Resume later, share games, backup

---

## Long-Term Vision

### 26. Tournament Mode

**Effort**: 6 weeks  
**Features**:

- Bracket system
- Swiss system
- Time controls
- Standings/rankings

### 27. Puzzle Mode

**Effort**: 4 weeks  
**Features**:

- Daily puzzles
- Puzzle ratings
- Combination tactics
- Checkmate patterns

### 28. Tutorial System

**Effort**: 3 weeks  
**Features**:

- Interactive lessons
- Combination tutorial
- Strategy guide
- Practice mode

### 29. Leaderboards

**Effort**: 3 weeks  
**Features**:

- ELO ratings
- Global rankings
- Friend comparisons
- Stats tracking

### 30. Custom Piece Creator

**Effort**: 4 weeks  
**Features**:

- Define new piece types
- Custom movement rules
- Create custom combinations
- Share community pieces

---

## Priority Matrix

| Feature           | Priority    | Effort | Impact | Score |
| ----------------- | ----------- | ------ | ------ | ----- |
| Fix Linting       | 🔴 Critical | 1d     | High   | 10    |
| Checkmate         | 🔴 Critical | 1w     | High   | 9     |
| Unit Tests        | 🔴 Critical | 2w     | High   | 9     |
| Move Animations   | 🟠 High     | 2d     | High   | 8     |
| Mobile Responsive | 🟠 High     | 3d     | High   | 8     |
| AI Opponent       | 🟠 High     | 4w     | High   | 8     |
| Multiplayer       | 🟠 High     | 4w     | High   | 8     |
| TypeScript        | 🟠 High     | 3d     | Med    | 7     |
| Castling          | 🟡 Medium   | 1w     | Med    | 6     |
| Sound Effects     | 🟡 Medium   | 1d     | Med    | 6     |

---

**Next**: Read [Developer Guide](./09-DEVELOPER-GUIDE.md) for contribution guidelines.
