# Parallel Search Architecture - Web Workers Implementation

## Overview

The chess AI engine implements true multi-threaded parallelization using Web Workers and SharedArrayBuffer. This architecture transforms a single-threaded negamax search into a parallel search system that distributes move evaluation across 4 worker threads, all sharing a unified transposition table for position caching.

## Architecture Components

### Core Components

| Component | File | Purpose |
|-----------|------|---------|
| **WorkerManager** | `src/ai/WorkerManager.js` | Orchestrates worker pool, distributes moves, aggregates results |
| **Search Worker** | `src/ai/searchWorker.js` | Worker thread that performs alpha-beta search on assigned moves |
| **Transposition Table** | `src/ai/TranspositionTable.js` | Thread-safe shared hash table using SharedArrayBuffer |
| **Zobrist Hashing** | `src/ai/zobrist.js` | Generates 64-bit position fingerprints for TT lookups |
| **Alpha-Beta Search** | `src/ai/alphaBeta.js` | Core minimax search with alpha-beta pruning |
| **Configuration** | `src/ai/constants.js` | Search parameters (worker count, TT size, timeouts) |

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Thread (UI)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          WorkerManager (Singleton)                    │  │
│  │  - Manages 4 worker pool                             │  │
│  │  - Distributes moves (root splitting)                │  │
│  │  - Aggregates results from workers                   │  │
│  └────────┬────────────────────────────────────┬─────────┘  │
│           │                                    │             │
└───────────┼────────────────────────────────────┼─────────────┘
            │                                    │
    ┌───────┴────────┐                  ┌────────┴────────┐
    │  Message Bus   │                  │ SharedArrayBuffer│
    │  (postMessage) │                  │  (256MB TT)      │
    └───────┬────────┘                  └────────┬─────────┘
            │                                     │
    ┌───────┴─────────────────────────────────────┴────────┐
    │          Worker Threads (4 instances)                 │
    │                                                       │
    │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │
    │  │  Worker 0   │  │  Worker 1   │  │  Worker 2/3  │ │
    │  │             │  │             │  │              │ │
    │  │ - Searches  │  │ - Searches  │  │ - Searches   │ │
    │  │   moves 0-5 │  │   moves 6-11│  │   moves 12+  │ │
    │  │ - Uses TT   │  │ - Uses TT   │  │ - Uses TT    │ │
    │  │ - Reports   │  │ - Reports   │  │ - Reports    │ │
    │  │   results   │  │   results   │  │   results    │ │
    │  └─────────────┘  └─────────────┘  └──────────────┘ │
    └───────────────────────────────────────────────────────┘
```

## Configuration

### Search Parameters (constants.js)

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `NUM_WORKERS` | 4 | Number of parallel worker threads |
| `TRANSPOSITION_TABLE_SIZE_MB` | 256 | Shared TT size (megabytes) |
| `MAX_SEARCH_TIME_MS` | 10000 | Maximum time per search (10 seconds) |
| `AI_DIFFICULTY.EASY` | 3 | Search depth for easy mode |
| `AI_DIFFICULTY.MEDIUM` | 5 | Search depth for medium mode |
| `AI_DIFFICULTY.HARD` | 6 | Search depth for hard mode |

## WorkerManager - Orchestration Layer

### Responsibilities

1. **Worker Pool Management**: Creates and maintains 4 worker threads
2. **Move Distribution**: Splits legal moves into contiguous batches per worker
3. **Result Aggregation**: Collects results from all workers and selects best move
4. **Shared TT Initialization**: Passes SharedArrayBuffer to all workers
5. **Timeout Handling**: Enforces search time limits
6. **Performance Logging**: Tracks and displays detailed metrics

### Key Methods

| Method | Parameters | Returns | Purpose |
|--------|-----------|---------|---------|
| `initialize()` | None | `Promise<boolean>` | Creates worker pool, initializes shared TT |
| `searchParallel()` | `{board, currentTurn, castlingRights, moves, depth}` | `Promise<{bestMove, bestScore, ...}>` | Distributes search across workers |
| `_distributeMoves()` | `moves[]` | `moves[][]` | Splits moves into contiguous chunks |
| `_searchWithWorker()` | `workerIndex, searchData` | `Promise<result>` | Sends search task to specific worker |
| `cleanup()` | None | `void` | Terminates all workers |

### Move Distribution Strategy

**Contiguous Chunking**: Divides legal moves into sequential batches.

Example with 22 moves and 4 workers:
- Worker 0: moves[0-5] (6 moves)
- Worker 1: moves[6-11] (6 moves)
- Worker 2: moves[12-17] (6 moves)
- Worker 3: moves[18-21] (4 moves)

**Rationale**: Simpler implementation, minimal communication overhead. Move ordering (MVV-LVA, killer moves) typically places better moves first, so Worker 0 often finishes faster.

## Search Worker - Computation Layer

### Worker Lifecycle

1. **Initialization**: Receives SharedArrayBuffer for TT, initializes Zobrist tables
2. **Search Loop**: Waits for SEARCH messages from WorkerManager
3. **Move Evaluation**: Performs alpha-beta search on assigned moves
4. **Result Reporting**: Sends best move and statistics back to main thread
5. **Cancellation**: Respects CANCEL messages and timeout deadlines

### Message Protocol

| Message Type | Direction | Payload | Purpose |
|--------------|-----------|---------|---------|
| `INIT_TT` | Main → Worker | `{buffer: SharedArrayBuffer, sizeInEntries}` | Initialize shared TT |
| `INIT_TT_SUCCESS` | Worker → Main | `{isShared: boolean}` | Confirm TT initialization |
| `SEARCH` | Main → Worker | `{board, currentTurn, castlingRights, movesToSearch, depth, timeoutMs}` | Start search task |
| `SEARCH_RESULT` | Worker → Main | `{bestMove, bestScore, nodesSearched, searchTime, ttStats, ...}` | Report search results |
| `CANCEL` | Main → Worker | None | Abort current search |
| `ERROR` | Worker → Main | `{error: string}` | Report error condition |

### Search Algorithm

Each worker executes the following for its assigned moves:

1. **Reset State**: Clear node counter, reset timeout deadline, clear TT stats
2. **Root Iteration**: For each assigned move:
   - Apply move to board
   - Call `alphaBetaSearch()` with depth-1
   - Track best score found so far
   - Update alpha (fail-soft alpha-beta)
   - Check timeout condition before next move
3. **Result Compilation**: Package best move, score, and statistics
4. **Send Result**: Post message back to WorkerManager

### Performance Metrics Collected

| Metric | Description |
|--------|-------------|
| `nodesSearched` | Total positions evaluated by this worker |
| `movesAssigned` | Number of moves given to this worker |
| `movesSearched` | Actual moves searched (may be less due to timeout) |
| `betaCutoffs` | Number of early terminations (always 0 at root level) |
| `searchTime` | Worker's actual search duration (ms) |
| `ttStats.hits` | Transposition table cache hits |
| `ttStats.misses` | TT cache misses |
| `ttStats.stores` | New positions stored in TT |
| `ttStats.collisions` | Hash collisions (overwritten entries) |

## Transposition Table - Shared Memory Layer

### Thread-Safe Design

The TT uses SharedArrayBuffer with Atomics for thread-safe concurrent access:

| Operation | Atomics Method | Purpose |
|-----------|---------------|---------|
| **Store Position** | `Atomics.store()` | Write hash/score/depth atomically |
| **Load Position** | `Atomics.load()` | Read hash/score/depth atomically |
| **Collision Handling** | Compare-and-swap pattern | Depth-preferred replacement |

### Entry Structure

Each TT entry occupies 4 Int32 slots (16 bytes):

| Slot | Field | Type | Content |
|------|-------|------|---------|
| 0 | Hash High | int32 | Upper 32 bits of Zobrist hash |
| 1 | Hash Low | int32 | Lower 32 bits of Zobrist hash |
| 2 | Score | int32 | Position evaluation |
| 3 | Depth | int32 | Search depth at which stored |

### Replacement Policy

**Depth-Preferred Replacement**: Only overwrite existing entry if new search is deeper.

Benefits:
- Preserves more valuable deep search results
- Reduces collision waste
- Improves hit rate over time

### Key Methods

| Method | Purpose |
|--------|---------|
| `store(hash, score, depth)` | Store position if deeper than existing entry |
| `probe(hash)` | Retrieve cached evaluation or null |
| `clear()` | Zero out all entries |
| `getStats()` | Return hit/miss/collision counters |
| `resetStats()` | Clear statistics for new search |
| `getBuffer()` | Return SharedArrayBuffer reference |
| `isSharedBuffer()` | Check if using shared memory |

## Zobrist Hashing - Position Fingerprinting

### Purpose

Generates unique 64-bit hash values for chess positions to enable TT lookups.

### Hash Components

The position hash incorporates:
- **Piece placement**: Each piece type + square combination
- **Side to move**: White vs Black
- **Castling rights**: KQkq availability
- **En passant**: Target square if available (not currently used)

### Implementation

Uses pre-initialized random 64-bit values:
- 64 squares × 12 piece types = 768 piece-square hashes
- 1 side-to-move hash
- 4 castling right hashes
- 8 en passant file hashes

Hash calculation: XOR all applicable random values together.

## Alpha-Beta Search - Core Engine

### Exported Functions for Workers

| Function | Purpose |
|----------|---------|
| `getAllLegalMoves(board, turn, castling)` | Generate all legal moves for position |
| `applyMove(board, move, turn, castling)` | Execute move and return new state |
| `alphaBetaSearch(board, turn, depth, alpha, beta, castling, hash)` | Recursive minimax with pruning |
| `findBestMoveParallel(board, turn, castling, difficulty)` | Main entry point for parallel search |

### Search Flow (Parallel Mode)

1. **Generate Legal Moves**: Get all legal moves for current position
2. **Initialize Workers**: WorkerManager.initialize() if not already ready
3. **Distribute Work**: WorkerManager.searchParallel() splits moves across workers
4. **Wait for Results**: Promise.all() blocks until all workers complete
5. **Select Best**: WorkerManager chooses highest-scoring move
6. **Return Result**: Best move + metadata returned to UI

## Performance Monitoring

### Aggregate Metrics

Displayed after each search:

| Metric | Calculation | Interpretation |
|--------|-------------|----------------|
| **Total Time** | End time - Start time | Wall-clock time for parallel search |
| **Total Nodes** | Sum of all worker nodes | Positions evaluated across all threads |
| **Nodes/sec** | Total nodes ÷ (Time / 1000) | Search throughput |
| **TT Hit Rate** | (Total hits ÷ Total probes) × 100% | Cache effectiveness |

### Per-Worker Metrics

Detailed breakdown table shows:

| Column | Meaning |
|--------|---------|
| **Worker** | Thread index (0-3) |
| **Moves** | Number of moves assigned |
| **Searched** | Moves actually evaluated (before timeout) |
| **Time (ms)** | Worker's search duration |
| **Nodes** | Positions evaluated by this worker |
| **Nodes/s** | Worker's search speed |
| **TT Hits** | Cache hits for this worker |
| **Hit Rate** | Worker's TT hit percentage |

### Efficiency Analysis

| Metric | Formula | Target |
|--------|---------|--------|
| **Load Imbalance** | (Max time - Min time) ÷ Max time × 100% | <30% |
| **Parallel Overhead** | Total time - Max worker time | <200ms |
| **Speedup** | (Theoretical single-thread time ÷ Actual time) | 2.5-3.5× |

## Thread Safety Guarantees

### SharedArrayBuffer Requirements

Enabled via Vite configuration with COOP/COEP headers:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

### Atomics Usage

All TT operations use Atomics to prevent:
- **Race conditions**: Concurrent read/write conflicts
- **Torn reads**: Reading partially-written values
- **Memory ordering issues**: Instruction reordering by CPU

### Worker Isolation

Each worker has:
- **Private state**: Node counter, timeout deadline, local variables
- **Shared read access**: Board state (immutable during search)
- **Shared read-write**: Transposition table (via Atomics)

No worker modifies another worker's state or the original board.

## Integration with Main Application

### Entry Point (App.jsx)

The UI calls:

```javascript
const result = await findBestMoveParallel(board, currentTurn, castlingRights, difficulty);
```

This function:
1. Generates all legal moves
2. Initializes WorkerManager (if first call)
3. Calls `WorkerManager.searchParallel()`
4. Returns best move to UI

### Result Structure

Returns object containing:

| Field | Type | Description |
|-------|------|-------------|
| `bestMove` | Object | `{from: {row, col}, to: {row, col}}` |
| `bestScore` | Number | Position evaluation (centipawns) |
| `totalNodes` | Number | Positions searched |
| `searchTime` | Number | Time taken (ms) |
| `nps` | Number | Nodes per second |

## Known Limitations

### Current Constraints

1. **Fixed Worker Count**: Always uses 4 workers (not adaptive to depth/hardware)
2. **No Move Ordering**: Moves distributed as generated (not pre-sorted by quality)
3. **No Work Stealing**: Workers can't rebalance if some finish early
4. **Root Splitting Only**: Parallelization only at top level (not deeper nodes)
5. **Timeout Handling**: Individual moves can still exceed 10s limit

### Load Imbalance Issue

Workers may have vastly different search times:
- Worker 0: 3-6 seconds (often gets easier moves)
- Workers 2-3: 10 seconds (timeout on hard moves)

Root cause: Some positions have exponentially larger search trees than others, regardless of distribution strategy.

### TT Hit Rate

Typical hit rate: 10-15%

This is lower than single-threaded search because:
- Workers explore different move subtrees (less position overlap)
- Root splitting reduces transposition opportunities
- Shared TT helps prevent collisions but doesn't increase shared learning much

## Performance Characteristics

### Expected Speedup by Depth

| Depth | Theoretical | Actual | Efficiency |
|-------|-------------|--------|------------|
| 3 (EASY) | 4.0× | 1.5-2.0× | 38-50% |
| 5 (MEDIUM) | 4.0× | 2.0-2.5× | 50-63% |
| 6+ (HARD) | 4.0× | 2.5-3.0× | 63-75% |

Efficiency increases with depth because parallel overhead becomes negligible compared to search time.

### Bottlenecks

1. **Slowest worker determines total time** (Amdahl's Law)
2. **Message passing overhead** (~50-100ms for serialization)
3. **Shared TT contention** (Atomics slower than direct memory access)
4. **Unbalanced move difficulty** (some moves 10× harder than others)

## Future Optimization Opportunities

### Potential Improvements

1. **Move Ordering Before Distribution**: Sort moves by likely quality (captures first, killer moves, history heuristic)
2. **Dynamic Work Stealing**: Allow idle workers to take moves from busy workers
3. **Iterative Deepening**: Use shallow search to predict move difficulty
4. **Lazy SMP**: All workers search full tree with slight randomization
5. **Adaptive Worker Count**: Use fewer workers for shallow depths
6. **Principal Variation Sharing**: Share PV between workers for better ordering
7. **Aspiration Windows**: Narrow alpha-beta window based on previous iteration
8. **Parallel Quiescence Search**: Parallelize capture search as well

### Expected Impact

Implementing move ordering + work stealing could improve:
- Load imbalance: 40-60% → 10-20%
- Actual speedup: 2.0-2.5× → 3.0-3.5×
- Workers timing out: 2/4 → 0/4

## Summary

The parallel search architecture successfully implements multi-threaded chess AI using:
- **4 Web Workers** for true parallel processing
- **256MB SharedArrayBuffer** for unified transposition table
- **Contiguous move distribution** for simple load balancing
- **Comprehensive performance monitoring** for optimization insights

Current performance achieves **2.0-2.5× speedup** at medium difficulty (depth 5), with headroom for improvement through better move ordering and work distribution strategies.
