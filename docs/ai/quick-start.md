# Chess AI - Quick Start Guide

## 🚀 Testing the AI (Phase 1)

### **Option 1: Run Test Suite**

```bash
# From project root
node src/ai/test-ai.js
```

This will test:
- ✅ Initial position evaluation (should be ~0)
- ✅ AI opening move at depth 2 (Easy)
- ✅ AI opening move at depth 4 (Medium)
- ✅ Material advantage detection
- ✅ Hybrid piece evaluation

### **Option 2: Quick Integration Test**

Add to your main game file:

```javascript
import { findBestMove } from './ai/alphaBeta.js';
import { AI_DIFFICULTY } from './ai/constants.js';

// In your game component
const handleAIMove = () => {
  const { board, currentTurn, castlingRights } = gameState;
  
  const bestMove = findBestMove(
    { board, currentTurn, castlingRights },
    AI_DIFFICULTY.EASY.depth  // Start with depth 2
  );
  
  if (bestMove) {
    console.log('AI plays:', bestMove);
    // Apply the move to your game state
  }
};
```

---

## 📝 Using the AI

### **Basic Usage**

```javascript
import { findBestMove } from './ai/alphaBeta.js';

const gameState = {
  board: /* your 8x8 board array */,
  currentTurn: 'white',  // or 'black'
  castlingRights: {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
  }
};

const bestMove = findBestMove(gameState, 4);  // depth = 4 (medium)

// bestMove will be one of:
// { from: {row, col}, to: {row, col}, type: 'normal' }
// { from: {row, col}, to: {row, col}, type: 'promotion', promoteTo: 'q' }
// { from: {row, col}, to: {row, col}, type: 'castling', side: 'kingside' }
// { from: {row, col}, to: {row, col}, type: 'combine', pieces: {...} }
// { from: {row, col}, to: {row, col}, type: 'decombine', assignment: {...} }
```

### **Difficulty Levels**

```javascript
import { AI_DIFFICULTY } from './ai/constants.js';

// Easy (instant, ~400 nodes)
findBestMove(gameState, AI_DIFFICULTY.EASY.depth);      // depth = 2

// Medium (5 seconds, ~160k nodes)
findBestMove(gameState, AI_DIFFICULTY.MEDIUM.depth);    // depth = 4

// Hard (Phase 2 with web workers)
findBestMove(gameState, AI_DIFFICULTY.HARD.depth);      // depth = 6
```

### **Executing AI Moves**

```javascript
const executeAIMove = (move) => {
  const newBoard = copyBoard(gameState.board);
  
  switch (move.type) {
    case 'normal':
      // Standard move
      newBoard[move.to.row][move.to.col] = newBoard[move.from.row][move.from.col];
      newBoard[move.from.row][move.from.col] = '';
      break;
      
    case 'promotion':
      // Pawn promotes
      newBoard[move.to.row][move.to.col] = move.promoteTo;
      newBoard[move.from.row][move.from.col] = '';
      break;
      
    case 'castling':
      // Use executeCastleMove from castlingLogic.js
      return executeCastleMove(newBoard, currentTurn, move.side === 'kingside');
      
    case 'combine':
      // Use executeCombination from gameState.js
      const result = executeCombination(
        newBoard,
        move.pieces.piece1.row,
        move.pieces.piece1.col,
        move.pieces.piece2.row,
        move.pieces.piece2.col,
        move.pieces.piece1.row,  // anchor (doesn't matter)
        move.pieces.piece1.col
      );
      return result.board;
      
    case 'decombine':
      // Split hybrid
      newBoard[move.from.row][move.from.col] = move.assignment.staying;
      newBoard[move.to.row][move.to.col] = move.assignment.spawning;
      break;
  }
  
  return newBoard;
};
```

---

## 🔍 Debugging

### **Log AI Thinking**

```javascript
import { moveToAlgebraic } from './ai/alphaBeta.js';

const bestMove = findBestMove(gameState, 4);
console.log('AI suggests:', moveToAlgebraic(bestMove));
// Output: "e2e4" or "O-O" or "e7e8q (promotion)"
```

### **Detailed Position Analysis**

```javascript
import { evaluatePositionDetailed } from './ai/evaluator.js';
import { countLegalMoves } from './ai/alphaBeta.js';
import { isInCheck } from './utils/moveCalculator.js';

const legalMoves = countLegalMoves(board, currentTurn, castlingRights);
const inCheck = isInCheck(board, currentTurn);

const analysis = evaluatePositionDetailed(board, currentTurn, legalMoves, inCheck);

console.log('Position Analysis:', analysis);
/*
{
  score: 245,
  isTerminal: false,
  breakdown: {
    material: { white: 3900, black: 3655, difference: 245 },
    positional: { white: 85, black: 60, difference: 25 },
    totalMaterial: 7555,
    isEndgame: false
  }
}
*/
```

---

## ⚠️ Known Issues (Phase 1)

### **1. Slow at Depth 4+**

**Problem:** AI blocks UI for several seconds

**Solution (Phase 2):**
```javascript
// Use web worker
const worker = new Worker('./ai-worker.js');
worker.postMessage({ gameState, depth: 4 });
worker.onmessage = (e) => {
  const bestMove = e.data;
  executeMove(bestMove);
};
```

### **2. Castling Rights Not Updated in Search**

**Problem:** AI may consider illegal castling in deep variations

**Workaround:** For Phase 1, this is rare and won't break the AI

**Fix (Phase 2):** Track castling rights in `applyMove()`:
```javascript
const newCastlingRights = {...castlingRights};
if (move.piece === 'K' || move.piece === 'k') {
  newCastlingRights[currentTurn] = { kingSide: false, queenSide: false };
}
// Pass newCastlingRights to recursive search
```

### **3. No En Passant**

**Status:** Not implemented in moveCalculator.js

**Impact:** Rare, AI will still play well without it

---

## 🎯 Testing Scenarios

### **Test 1: Opening Moves**
```javascript
const gameState = createInitialGameState();
const move = findBestMove(gameState, 2);
// Should suggest: e2-e4, d2-d4, or knight moves
```

### **Test 2: Capture High-Value Piece**
```javascript
// Setup: Black queen on e5, white knight can capture
const board = setupPosition('White knight on d3, Black queen on e5');
const move = findBestMove({board, currentTurn: 'white', ...}, 2);
// Should capture the queen (MVV-LVA prioritizes this)
```

### **Test 3: Avoid Blunder**
```javascript
// Setup: Moving piece would hang it
const move = findBestMove(gameState, 3);
// AI should NOT blunder pieces even at low depth
```

### **Test 4: Find Mate in 2**
```javascript
// Setup: Scholar's Mate position
const move = findBestMove(gameState, 4);
// Should find the checkmate move
```

### **Test 5: Combination Move**
```javascript
// Setup: White rook and bishop can combine
const move = findBestMove(gameState, 3);
// AI may choose to combine if strategically sound
```

---

## 📊 Performance Benchmarks

Run these to verify performance:

```javascript
const depths = [1, 2, 3, 4];
const gameState = createInitialGameState();

for (const depth of depths) {
  const start = Date.now();
  const move = findBestMove(gameState, depth);
  const time = Date.now() - start;
  
  console.log(`Depth ${depth}: ${time}ms`);
}

// Expected:
// Depth 1: <10ms
// Depth 2: <100ms
// Depth 3: <500ms
// Depth 4: <5000ms (5 seconds)
```

---

## 🚧 Phase 2 Roadmap

Once Phase 1 is working:

1. **Web Workers** - Non-blocking search
2. **Iterative Deepening** - Progressive depth with time limits
3. **Transposition Table** - Cache evaluated positions
4. **Quiescence Search** - Extend tactical sequences
5. **Opening Book** - Pre-computed opening moves
6. **Endgame Tablebases** - Perfect endgame play

---

## 🆘 Troubleshooting

### **AI returns null**
- Check if `getAllLegalMoves()` returns empty array
- Verify castling rights are passed correctly
- Check for checkmate/stalemate position

### **AI is too slow**
- Reduce depth (use AI_DIFFICULTY.EASY)
- Profile `getAllLegalMoves()` - may be generating too many moves
- Consider move ordering improvements

### **AI makes illegal moves**
- Verify move execution in `applyMove()`
- Check if `calculateLegalMoves()` filters properly
- Ensure castling validation is correct

### **Hybrid pieces crash the AI**
- Check `PIECE_VALUES` in constants.js has rb, rn, bn, qn
- Verify `getPieceSquareTable()` handles hybrids
- Test `executeCombination()` separately

---

## 📚 API Quick Reference

```javascript
// Find best move
findBestMove(gameState, depth) → move | null

// Evaluate position
evaluatePosition(board, turn, legalMoves, inCheck) → number
evaluatePositionDetailed(board, turn, legalMoves, inCheck) → object

// Count moves (for checkmate detection)
countLegalMoves(board, color, castlingRights) → number

// Convert move to notation
moveToAlgebraic(move) → string
```

---

**Happy Testing! 🎉**

For questions or issues, refer to:
- `docs/AI_IMPLEMENTATION_SUMMARY.md` - Full implementation details
- `src/ai/test-ai.js` - Test suite
- Phase 1 plan document
