# Phase 2 Chess Engine Optimization Plan

## Overview
This document outlines the high-level architecture for implementing three critical performance optimizations:
1. **Web Worker Parallelization** with Root Splitting
2. **Transposition Table** with Zobrist Hashing
3. **Shared Memory Transposition Table** using SharedArrayBuffer and Atomics

---

## Current Architecture Analysis

### Existing Implementation (`src/ai/`)
```
alphaBeta.js     - Core search engine (negamax + alpha-beta pruning)
evaluator.js     - Position evaluation (material + PST)
moveOrdering.js  - Move sorting (MVV-LVA + center control)
constants.js     - Piece values, PSTs, difficulty levels
```

### Current Flow
```
App.jsx (UI Thread)
    ↓
findBestMove(gameState, depth)
    ↓
getAllLegalMoves() → orderMoves()
    ↓
alphaBetaSearch() [recursive, blocking]
    ↓
evaluatePosition()
    ↓
Return bestMove to UI (freezes UI during search)
```

**Problems:**
- UI freezes during deep searches (depth 6+ takes seconds)
- No position caching → repeated work
- Single-threaded → doesn't utilize multi-core CPUs

---

## 1. Web Worker Parallelization (Root Splitting)

### Architecture

#### High-Level Design
```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx (Main Thread)               │
│  - Manages UI state                                         │
│  - Sends search request to WorkerManager                    │
│  - Receives best move and updates board                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              WorkerManager.js (Main Thread)                 │
│  - Spawns N workers (navigator.hardwareConcurrency)         │
│  - Implements ROOT SPLITTING strategy                       │
│  - Aggregates results from workers                          │
│  - Handles worker lifecycle and errors                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────┐
        ↓             ↓             ↓             ↓
    ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
    │Worker 1│   │Worker 2│   │Worker 3│   │Worker N│
    │Moves   │   │Moves   │   │Moves   │   │Moves   │
    │1-5     │   │6-10    │   │11-15   │   │16-20   │
    └────────┘   └────────┘   └────────┘   └────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
                Returns: { move, score, depth }
```

### Implementation Plan

#### Step 1: Create Search Worker (`src/ai/searchWorker.js`)
```javascript
// searchWorker.js - Runs in worker thread
import { alphaBetaSearch, applyMove, getAllLegalMoves } from './alphaBeta.js';
import { orderMoves } from './moveOrdering.js';
import { evaluatePosition } from './evaluator.js';

// Worker receives:
// - board, currentTurn, castlingRights
// - movesToSearch (subset of root moves)
// - depth, alpha, beta
// - transpositionTable (SharedArrayBuffer)

self.onmessage = (event) => {
    const { type, data } = event.data;
    
    if (type === 'SEARCH') {
        const { board, currentTurn, castlingRights, movesToSearch, depth, alpha, beta, ttBuffer } = data;
        
        // Initialize local TT view
        const tt = new TranspositionTable(ttBuffer);
        
        let localBestMove = null;
        let localBestScore = -Infinity;
        let localAlpha = alpha;
        
        // Search assigned moves
        for (const move of movesToSearch) {
            const { newBoard, newCastlingRights } = applyMove(board, move, currentTurn, castlingRights);
            const newTurn = switchTurn(currentTurn);
            
            // Search with TT
            const score = -alphaBetaSearchWithTT(
                newBoard, newTurn, depth - 1, -beta, -localAlpha, newCastlingRights, tt
            );
            
            if (score > localBestScore) {
                localBestScore = score;
                localBestMove = move;
            }
            
            localAlpha = Math.max(localAlpha, score);
            
            // Progress update
            self.postMessage({ 
                type: 'PROGRESS', 
                movesSearched: movesToSearch.indexOf(move) + 1,
                totalMoves: movesToSearch.length
            });
        }
        
        // Return result
        self.postMessage({
            type: 'RESULT',
            bestMove: localBestMove,
            bestScore: localBestScore
        });
    }
};
```

#### Step 2: Worker Manager (`src/ai/WorkerManager.js`)
```javascript
// WorkerManager.js - Main thread
class WorkerManager {
    constructor() {
        // Detect CPU cores (typically 4-16 on modern machines)
        this.numWorkers = navigator.hardwareConcurrency || 4;
        this.workers = [];
        this.sharedTTBuffer = null; // SharedArrayBuffer for TT
        
        this.initializeWorkers();
    }
    
    initializeWorkers() {
        for (let i = 0; i < this.numWorkers; i++) {
            const worker = new Worker(
                new URL('./searchWorker.js', import.meta.url),
                { type: 'module' }
            );
            this.workers.push(worker);
        }
    }
    
    async findBestMove(gameState, depth) {
        const { board, currentTurn, castlingRights } = gameState;
        
        // Generate and order root moves
        const allMoves = getAllLegalMoves(board, currentTurn, castlingRights);
        const orderedMoves = orderMoves(board, allMoves, currentTurn);
        
        // ROOT SPLITTING: Divide moves among workers
        const movesPerWorker = Math.ceil(orderedMoves.length / this.numWorkers);
        const workerPromises = [];
        
        for (let i = 0; i < this.numWorkers; i++) {
            const startIdx = i * movesPerWorker;
            const endIdx = Math.min(startIdx + movesPerWorker, orderedMoves.length);
            const movesToSearch = orderedMoves.slice(startIdx, endIdx);
            
            if (movesToSearch.length === 0) break;
            
            const promise = this.searchMoves(
                this.workers[i],
                { board, currentTurn, castlingRights },
                movesToSearch,
                depth
            );
            
            workerPromises.push(promise);
        }
        
        // Wait for all workers to complete
        const results = await Promise.all(workerPromises);
        
        // Find global best move
        let globalBestMove = null;
        let globalBestScore = -Infinity;
        
        for (const result of results) {
            if (result.bestScore > globalBestScore) {
                globalBestScore = result.bestScore;
                globalBestMove = result.bestMove;
            }
        }
        
        return globalBestMove;
    }
    
    searchMoves(worker, gameState, moves, depth) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Worker timeout'));
            }, 30000); // 30 second timeout
            
            worker.onmessage = (event) => {
                const { type, ...data } = event.data;
                
                if (type === 'RESULT') {
                    clearTimeout(timeout);
                    resolve(data);
                } else if (type === 'PROGRESS') {
                    // Optional: Update UI with progress
                    console.log(`Worker progress: ${data.movesSearched}/${data.totalMoves}`);
                }
            };
            
            worker.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };
            
            worker.postMessage({
                type: 'SEARCH',
                data: {
                    ...gameState,
                    movesToSearch: moves,
                    depth,
                    alpha: -Infinity,
                    beta: Infinity,
                    ttBuffer: this.sharedTTBuffer
                }
            });
        });
    }
    
    terminate() {
        this.workers.forEach(w => w.terminate());
    }
}
```

#### Step 3: Integration with App.jsx
```javascript
// App.jsx modifications
import WorkerManager from './ai/WorkerManager.js';

function App() {
    const workerManager = useRef(null);
    
    useEffect(() => {
        workerManager.current = new WorkerManager();
        return () => workerManager.current.terminate();
    }, []);
    
    const makeAiMove = async (currentGameState) => {
        setIsAiThinking(true);
        
        try {
            // Non-blocking worker-based search
            const bestMove = await workerManager.current.findBestMove(
                currentGameState,
                aiDifficulty.current.depth
            );
            
            // Apply move...
        } catch (error) {
            console.error('AI search error:', error);
            // Fallback to main thread search
        } finally {
            setIsAiThinking(false);
        }
    };
}
```

---

## 2. Transposition Table with Zobrist Hashing

### Concept
A **transposition table** (TT) is a hash table that caches previously evaluated positions to avoid redundant work. Chess positions can be reached via different move orders (transpositions), and the TT lets us reuse evaluations.

### Zobrist Hashing

#### What is Zobrist Hashing?
```
Zobrist hashing creates a unique 64-bit fingerprint for each position by:
1. Pre-generating random 64-bit numbers for each (piece, square) pair
2. XORing these numbers together for all pieces on the board
3. XORing additional bits for castling rights, en passant, turn

Example:
Position hash = 
    ZOBRIST[WHITE_ROOK][a1] ^
    ZOBRIST[WHITE_KING][e1] ^
    ZOBRIST[BLACK_QUEEN][d8] ^
    ... (all pieces) ^
    CASTLING_HASH[castlingRights] ^
    EN_PASSANT_HASH[enPassantSquare] ^
    TURN_HASH[currentTurn]

Properties:
✓ Fast (just XOR operations)
✓ Incremental updates (XOR is reversible)
✓ Low collision rate
```

#### Implementation

##### Step 1: Generate Zobrist Keys (`src/ai/zobrist.js`)
```javascript
// zobrist.js
import { PIECES, COLORS } from '../utils/constants.js';

class ZobristKeys {
    constructor() {
        this.pieceKeys = this.generatePieceKeys();
        this.castlingKeys = this.generateCastlingKeys();
        this.enPassantKeys = this.generateEnPassantKeys();
        this.turnKey = this.randomU64();
    }
    
    // Generate random 64-bit number (using BigInt)
    randomU64() {
        const high = Math.floor(Math.random() * 0x100000000);
        const low = Math.floor(Math.random() * 0x100000000);
        return (BigInt(high) << 32n) | BigInt(low);
    }
    
    generatePieceKeys() {
        const keys = {};
        const pieces = ['p', 'n', 'b', 'r', 'q', 'k', 'rb', 'rn', 'bn', 'qn'];
        const colors = ['white', 'black'];
        
        for (const color of colors) {
            for (const piece of pieces) {
                const pieceCode = color === 'white' ? piece.toUpperCase() : piece;
                keys[pieceCode] = [];
                
                for (let square = 0; square < 64; square++) {
                    keys[pieceCode][square] = this.randomU64();
                }
            }
        }
        
        return keys;
    }
    
    generateCastlingKeys() {
        // 4 castling rights: WK, WQ, BK, BQ
        return {
            whiteKingSide: this.randomU64(),
            whiteQueenSide: this.randomU64(),
            blackKingSide: this.randomU64(),
            blackQueenSide: this.randomU64()
        };
    }
    
    generateEnPassantKeys() {
        // 8 files for en passant
        const keys = [];
        for (let file = 0; file < 8; file++) {
            keys[file] = this.randomU64();
        }
        return keys;
    }
    
    // Hash a complete position
    hashPosition(board, currentTurn, castlingRights, enPassantTarget) {
        let hash = 0n;
        
        // Hash all pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    const square = row * 8 + col;
                    hash ^= this.pieceKeys[piece][square];
                }
            }
        }
        
        // Hash castling rights
        if (castlingRights.white.kingSide) hash ^= this.castlingKeys.whiteKingSide;
        if (castlingRights.white.queenSide) hash ^= this.castlingKeys.whiteQueenSide;
        if (castlingRights.black.kingSide) hash ^= this.castlingKeys.blackKingSide;
        if (castlingRights.black.queenSide) hash ^= this.castlingKeys.blackQueenSide;
        
        // Hash en passant
        if (enPassantTarget) {
            hash ^= this.enPassantKeys[enPassantTarget.col];
        }
        
        // Hash turn
        if (currentTurn === COLORS.BLACK) {
            hash ^= this.turnKey;
        }
        
        return hash;
    }
    
    // Incremental update (move a piece)
    updateHashAfterMove(hash, fromPiece, fromSquare, toPiece, toSquare, capturedPiece) {
        // Remove piece from source
        hash ^= this.pieceKeys[fromPiece][fromSquare];
        
        // Remove captured piece if any
        if (capturedPiece) {
            hash ^= this.pieceKeys[capturedPiece][toSquare];
        }
        
        // Add piece to destination
        hash ^= this.pieceKeys[toPiece][toSquare];
        
        // Toggle turn
        hash ^= this.turnKey;
        
        return hash;
    }
}

// Singleton instance
export const zobrist = new ZobristKeys();
```

##### Step 2: Transposition Table (`src/ai/TranspositionTable.js`)
```javascript
// TranspositionTable.js
const ENTRY_SIZE = 6; // [hashLow32, hashHigh32, score, depth, flag, bestMoveEncoded]

const FLAG_EXACT = 0;  // PV node (exact score)
const FLAG_LOWER = 1;  // Alpha cutoff (score >= beta, lower bound)
const FLAG_UPPER = 2;  // Beta cutoff (score <= alpha, upper bound)

class TranspositionTable {
    constructor(sizeInMB = 128, sharedBuffer = null) {
        // Calculate number of entries
        const bytesPerEntry = ENTRY_SIZE * 4; // 4 bytes per Int32
        const numEntries = Math.floor((sizeInMB * 1024 * 1024) / bytesPerEntry);
        
        // Use shared buffer if provided, otherwise create private buffer
        if (sharedBuffer) {
            this.buffer = sharedBuffer;
        } else {
            this.buffer = new SharedArrayBuffer(numEntries * bytesPerEntry);
        }
        
        this.table = new Int32Array(this.buffer);
        this.numEntries = numEntries;
        this.mask = numEntries - 1; // For fast modulo (assumes power of 2)
    }
    
    // Store position evaluation
    store(hash, score, depth, flag, bestMove) {
        const index = Number(hash & BigInt(this.mask)) * ENTRY_SIZE;
        
        // Split 64-bit hash into two 32-bit parts
        const hashLow = Number(hash & 0xFFFFFFFFn);
        const hashHigh = Number((hash >> 32n) & 0xFFFFFFFFn);
        
        // Encode best move (16 bits: from=6bits, to=6bits, type=4bits)
        const moveEncoded = this.encodeMove(bestMove);
        
        // Replace if:
        // 1. Slot is empty (hashHigh === 0)
        // 2. Same position (hashHigh matches)
        // 3. Deeper search (depth >= stored depth)
        const storedDepth = this.table[index + 3];
        if (this.table[index + 1] === 0 || 
            this.table[index + 1] === hashHigh || 
            depth >= storedDepth) {
            
            this.table[index] = hashLow;
            this.table[index + 1] = hashHigh;
            this.table[index + 2] = score;
            this.table[index + 3] = depth;
            this.table[index + 4] = flag;
            this.table[index + 5] = moveEncoded;
        }
    }
    
    // Probe table for cached evaluation
    probe(hash, depth, alpha, beta) {
        const index = Number(hash & BigInt(this.mask)) * ENTRY_SIZE;
        
        const hashLow = Number(hash & 0xFFFFFFFFn);
        const hashHigh = Number((hash >> 32n) & 0xFFFFFFFFn);
        
        // Check if entry exists and hash matches
        if (this.table[index + 1] !== hashHigh) {
            return null; // Miss
        }
        
        const storedDepth = this.table[index + 3];
        const storedScore = this.table[index + 2];
        const storedFlag = this.table[index + 4];
        const moveEncoded = this.table[index + 5];
        
        // Only use if stored depth >= current depth
        if (storedDepth >= depth) {
            // Check flag type
            if (storedFlag === FLAG_EXACT) {
                return { score: storedScore, move: this.decodeMove(moveEncoded) };
            } else if (storedFlag === FLAG_LOWER && storedScore >= beta) {
                return { score: storedScore, move: this.decodeMove(moveEncoded) };
            } else if (storedFlag === FLAG_UPPER && storedScore <= alpha) {
                return { score: storedScore, move: this.decodeMove(moveEncoded) };
            }
        }
        
        // Return best move hint (for move ordering)
        return { move: this.decodeMove(moveEncoded) };
    }
    
    encodeMove(move) {
        if (!move) return 0;
        
        const fromSquare = move.from.row * 8 + move.from.col; // 0-63
        const toSquare = move.to.row * 8 + move.to.col; // 0-63
        const typeCode = this.getMoveTypeCode(move.type);
        
        return (fromSquare << 10) | (toSquare << 4) | typeCode;
    }
    
    decodeMove(encoded) {
        if (encoded === 0) return null;
        
        const fromSquare = (encoded >> 10) & 0x3F;
        const toSquare = (encoded >> 4) & 0x3F;
        const typeCode = encoded & 0x0F;
        
        return {
            from: { row: Math.floor(fromSquare / 8), col: fromSquare % 8 },
            to: { row: Math.floor(toSquare / 8), col: toSquare % 8 },
            type: this.getMoveTypeFromCode(typeCode)
        };
    }
    
    getMoveTypeCode(type) {
        const types = { normal: 0, castling: 1, promotion: 2, combine: 3, decombine: 4 };
        return types[type] || 0;
    }
    
    getMoveTypeFromCode(code) {
        const types = ['normal', 'castling', 'promotion', 'combine', 'decombine'];
        return types[code] || 'normal';
    }
    
    clear() {
        this.table.fill(0);
    }
}

export default TranspositionTable;
```

##### Step 3: Integrate TT into Alpha-Beta (`src/ai/alphaBeta.js`)
```javascript
// Modified alphaBetaSearch with TT
const alphaBetaSearchWithTT = (board, currentTurn, depth, alpha, beta, castlingRights, tt, positionHash) => {
    // Probe TT
    const ttEntry = tt.probe(positionHash, depth, alpha, beta);
    
    if (ttEntry && ttEntry.score !== undefined) {
        return ttEntry.score; // TT hit - return cached score
    }
    
    // Generate moves (use TT move hint for ordering)
    const allMoves = getAllLegalMoves(board, currentTurn, castlingRights);
    const inCheck = isInCheck(board, currentTurn);
    
    if (depth === 0 || allMoves.length === 0) {
        const score = evaluatePosition(board, currentTurn, allMoves.length, inCheck);
        return currentTurn === COLORS.WHITE ? score : -score;
    }
    
    // Order moves (prioritize TT move)
    const orderedMoves = orderMoves(board, allMoves, currentTurn, ttEntry?.move);
    
    let maxScore = -Infinity;
    let bestMove = null;
    let flag = FLAG_UPPER; // Assume fail-low
    
    for (const move of orderedMoves) {
        const { newBoard, newCastlingRights } = applyMove(board, move, currentTurn, castlingRights);
        
        // Calculate new hash incrementally
        const newHash = zobrist.updateHashAfterMove(
            positionHash,
            /* piece movement details */
        );
        
        const score = -alphaBetaSearchWithTT(
            newBoard,
            switchTurn(currentTurn),
            depth - 1,
            -beta,
            -alpha,
            newCastlingRights,
            tt,
            newHash
        );
        
        if (score > maxScore) {
            maxScore = score;
            bestMove = move;
        }
        
        alpha = Math.max(alpha, score);
        
        if (alpha >= beta) {
            flag = FLAG_LOWER; // Fail-high (beta cutoff)
            break;
        }
    }
    
    if (maxScore > alpha) {
        flag = FLAG_EXACT; // Exact score
    }
    
    // Store in TT
    tt.store(positionHash, maxScore, depth, flag, bestMove);
    
    return maxScore;
};
```

---

## 3. Shared Memory Transposition Table

### Concept
Use `SharedArrayBuffer` + `Atomics` to create a single TT accessible by all worker threads.

### Benefits
- **Memory efficiency**: Single 128MB TT shared across 4+ workers vs 512MB+ total
- **Cross-worker learning**: Worker 1's TT entries help Worker 2
- **Thread-safe**: Atomics ensure no race conditions

### Implementation

#### Step 1: Create Shared TT in WorkerManager
```javascript
// WorkerManager.js
class WorkerManager {
    constructor() {
        this.numWorkers = navigator.hardwareConcurrency || 4;
        this.workers = [];
        
        // Create shared TT (128MB)
        const ttSizeInMB = 128;
        const bytesPerEntry = 6 * 4;
        const numEntries = Math.floor((ttSizeInMB * 1024 * 1024) / bytesPerEntry);
        this.sharedTTBuffer = new SharedArrayBuffer(numEntries * bytesPerEntry);
        
        this.initializeWorkers();
    }
    
    searchMoves(worker, gameState, moves, depth) {
        // Pass shared buffer to worker
        worker.postMessage({
            type: 'SEARCH',
            data: {
                ...gameState,
                movesToSearch: moves,
                depth,
                alpha: -Infinity,
                beta: Infinity,
                ttBuffer: this.sharedTTBuffer // ← Shared across all workers
            }
        });
    }
}
```

#### Step 2: Thread-Safe TT Operations
```javascript
// TranspositionTable.js - Atomic operations
class TranspositionTable {
    // Atomic store (thread-safe)
    storeAtomic(hash, score, depth, flag, bestMove) {
        const index = Number(hash & BigInt(this.mask)) * ENTRY_SIZE;
        
        const hashLow = Number(hash & 0xFFFFFFFFn);
        const hashHigh = Number((hash >> 32n) & 0xFFFFFFFFn);
        const moveEncoded = this.encodeMove(bestMove);
        
        // Use compare-and-swap to avoid race conditions
        // Only write if:
        // 1. Slot empty OR
        // 2. Same position with deeper search
        
        const storedHashHigh = Atomics.load(this.table, index + 1);
        const storedDepth = Atomics.load(this.table, index + 3);
        
        if (storedHashHigh === 0 || 
            storedHashHigh === hashHigh && depth >= storedDepth) {
            
            // Lock-free write (good enough for TT)
            Atomics.store(this.table, index, hashLow);
            Atomics.store(this.table, index + 1, hashHigh);
            Atomics.store(this.table, index + 2, score);
            Atomics.store(this.table, index + 3, depth);
            Atomics.store(this.table, index + 4, flag);
            Atomics.store(this.table, index + 5, moveEncoded);
        }
    }
    
    // Atomic load (thread-safe)
    probeAtomic(hash, depth, alpha, beta) {
        const index = Number(hash & BigInt(this.mask)) * ENTRY_SIZE;
        
        const hashHigh = Number((hash >> 32n) & 0xFFFFFFFFn);
        
        // Atomic read
        const storedHashHigh = Atomics.load(this.table, index + 1);
        
        if (storedHashHigh !== hashHigh) {
            return null; // Miss
        }
        
        const storedDepth = Atomics.load(this.table, index + 3);
        const storedScore = Atomics.load(this.table, index + 2);
        const storedFlag = Atomics.load(this.table, index + 4);
        const moveEncoded = Atomics.load(this.table, index + 5);
        
        // Same logic as before...
        if (storedDepth >= depth) {
            if (storedFlag === FLAG_EXACT) {
                return { score: storedScore, move: this.decodeMove(moveEncoded) };
            }
            // ... other flags
        }
        
        return { move: this.decodeMove(moveEncoded) };
    }
}
```

---

## Expected Performance Gains

### Baseline (Current)
- Depth 4: ~500ms (Medium difficulty)
- Depth 6: ~5000ms (Hard difficulty)
- UI: Freezes during search

### After Web Workers (Root Splitting)
- Depth 4: ~150ms (3.3x speedup on 4-core CPU)
- Depth 6: ~1500ms (3.3x speedup)
- UI: **Responsive** during search ✓

### After Transposition Table
- Depth 4: ~75ms (additional 2x from TT hits)
- Depth 6: ~750ms (additional 2x from TT hits)
- Effective depth: Can search deeper (depth 7-8)

### After Shared TT
- Depth 6: ~500ms (additional 1.5x from cross-worker learning)
- Memory: 128MB (vs 512MB for 4 private TTs)

### Combined Impact
```
Current:  Depth 6 = 5000ms, UI frozen
Optimized: Depth 8 = 500ms, UI responsive

~10x speedup + 2 extra ply + responsive UI
```

---

## Implementation Order

### Phase 2A: Foundation (Week 1)
1. Implement Zobrist hashing
2. Create TranspositionTable class
3. Integrate TT into alphaBeta.js
4. Test: Verify TT hit rate (should be 40-60% at depth 6)

### Phase 2B: Web Workers (Week 2)
1. Create searchWorker.js
2. Implement WorkerManager.js
3. Modify App.jsx to use workers
4. Test: Verify parallelization works, UI stays responsive

### Phase 2C: Shared Memory (Week 3)
1. Create SharedArrayBuffer in WorkerManager
2. Add Atomics to TranspositionTable
3. Pass shared buffer to workers
4. Test: Verify no race conditions, measure speedup

### Phase 2D: Tuning (Week 4)
1. Optimize TT replacement strategy (depth-preferred)
2. Add TT move ordering bonus
3. Profile and optimize hot paths
4. Benchmark different worker counts

---

## File Structure After Phase 2

```
src/ai/
├── alphaBeta.js              [Modified] - TT integration
├── evaluator.js              [Unchanged]
├── moveOrdering.js           [Modified] - TT move priority
├── constants.js              [Unchanged]
├── zobrist.js                [NEW] - Zobrist key generation
├── TranspositionTable.js     [NEW] - TT with atomic ops
├── searchWorker.js           [NEW] - Worker thread search
├── WorkerManager.js          [NEW] - Parallel orchestration
└── test-ai.js                [Modified] - TT benchmarks
```

---

## Testing Strategy

### Unit Tests
```javascript
// Test Zobrist hashing
test('Zobrist hash is deterministic', () => {
    const hash1 = zobrist.hashPosition(board, turn, castling, ep);
    const hash2 = zobrist.hashPosition(board, turn, castling, ep);
    expect(hash1).toBe(hash2);
});

// Test TT hit rate
test('TT hit rate > 40% at depth 6', () => {
    const stats = runSearchWithStats(position, 6);
    expect(stats.ttHitRate).toBeGreaterThan(0.4);
});

// Test worker parallelization
test('4 workers faster than 1 worker', async () => {
    const time1 = await benchmarkWorkers(1, position, 6);
    const time4 = await benchmarkWorkers(4, position, 6);
    expect(time4).toBeLessThan(time1 * 0.4); // At least 2.5x speedup
});
```

### Integration Tests
```javascript
// Test vs current implementation
test('Workers + TT produces same best move', async () => {
    const moveOld = findBestMove(position, 6); // Old implementation
    const moveNew = await workerManager.findBestMove(position, 6);
    expect(moveNew).toEqual(moveOld);
});
```

---

## Potential Issues & Mitigations

### Issue 1: Worker Overhead for Shallow Depths
**Problem**: Worker spawn time > search time for depth 2-3  
**Solution**: Only use workers for depth >= 5

### Issue 2: TT Collisions (Hash Collisions)
**Problem**: Two positions map to same TT slot  
**Solution**: Store 32-bit hash verification in each entry

### Issue 3: SharedArrayBuffer Browser Support
**Problem**: Requires HTTPS + COOP/COEP headers  
**Solution**: Fallback to worker-local TTs if SharedArrayBuffer unavailable

### Issue 4: Debuggability
**Problem**: Worker errors are hard to trace  
**Solution**: Add comprehensive logging, error forwarding to main thread

---

## Next Steps

1. **Review this plan** - Confirm approach aligns with your goals
2. **Prioritize features** - Do you want all three, or start with TT only?
3. **Set milestones** - Which optimization to implement first?
4. **Prepare test positions** - Create benchmark suite for performance testing

Let me know which part you'd like to dive deeper into, or if you want me to start implementing any specific component!
