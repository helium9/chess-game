# Phase 2B: Load Balancing Fix - Interleaved Move Distribution

## Problem Diagnosis

### Performance Report from First Move:
```
⚡ Parallel Efficiency Analysis:
   Worker times: min=5809.6ms, avg=8477.8ms, max=9999.2ms
   Load imbalance: 41.9% (lower is better)
   Parallel overhead: 1.0ms

Per-Worker Breakdown:
│ Worker │ Moves │ Searched │ Time (ms) │ Nodes  │
├────────┼───────┼──────────┼───────────┼────────┤
│   0    │   6   │    6     │  5809.6   │ 34,181 │  ← Finished early
│   1    │   6   │    6     │  8103.2   │ 51,482 │
│   2    │   6   │    1     │  9999.1   │ 61,773 │  ← HIT TIMEOUT (only 1/6 moves)
│   3    │   4   │    2     │  9999.2   │ 65,821 │  ← HIT TIMEOUT (only 2/4 moves)
```

### Root Cause: Contiguous Move Batching

**Original distribution** (contiguous chunks):
```
Total moves: 22
Worker 0: moves[0-5]   → [move0, move1, move2, move3, move4, move5]
Worker 1: moves[6-11]  → [move6, move7, move8, move9, move10, move11]
Worker 2: moves[12-17] → [move12, move13, move14, move15, move16, move17]
Worker 3: moves[18-21] → [move18, move19, move20, move21]
```

**Why this is terrible:**
1. **Move ordering** puts best moves first (MVV-LVA, killer moves, etc.)
2. **Best moves** (Worker 0) finish quickly due to alpha-beta cutoffs in child nodes
3. **Worst moves** (Workers 2&3) require searching the entire tree (no cutoffs)
4. **Result**: Worker 0 finishes in 5.8s, Workers 2&3 timeout at 10s
5. **Load imbalance: 41.9%** - Extremely poor parallelization

### Why Beta Cutoffs Show 0%

The confusion about β:0% in the logs:
- **Root level doesn't have beta cutoffs** because we're maximizing (finding the best move)
- Beta cutoffs only happen in **child nodes** during minimax
- Worker 0's moves finish faster because their **child nodes** have many cutoffs
- Worker 3's moves are slow because their **child nodes** have few cutoffs
- The β:0% at root is **normal** - it's not measuring the real issue

## Solution: Interleaved (Round-Robin) Distribution

**New distribution** (interleaved):
```
Total moves: 22
Worker 0: moves[0, 4, 8, 12, 16, 20]  → Every 4th move starting at 0
Worker 1: moves[1, 5, 9, 13, 17, 21]  → Every 4th move starting at 1
Worker 2: moves[2, 6, 10, 14, 18]     → Every 4th move starting at 2
Worker 3: moves[3, 7, 11, 15, 19]     → Every 4th move starting at 3
```

**Why this works:**
1. Each worker gets a **mix of good and bad moves**
2. Load is distributed **evenly** across workers
3. No single worker gets stuck with only slow moves
4. Expected load imbalance: **<15%** (down from 41.9%)

### Implementation

```javascript
_distributeMoves(moves) {
    // Interleaved distribution using modulo
    const batches = Array.from({ length: SEARCH_CONFIG.NUM_WORKERS }, () => []);

    moves.forEach((move, index) => {
        const workerIndex = index % SEARCH_CONFIG.NUM_WORKERS;
        batches[workerIndex].push(move);
    });

    return batches;
}
```

**Before:** Contiguous slicing
```javascript
Worker 0: moves.slice(0, 6)   // First 6 moves
Worker 1: moves.slice(6, 12)  // Next 6 moves
Worker 2: moves.slice(12, 18) // Next 6 moves
Worker 3: moves.slice(18, 22) // Last 4 moves
```

**After:** Interleaved round-robin
```javascript
Worker 0: moves[0, 4, 8, ...]   // Every 4th move
Worker 1: moves[1, 5, 9, ...]   // Every 4th move offset by 1
Worker 2: moves[2, 6, 10, ...]  // Every 4th move offset by 2
Worker 3: moves[3, 7, 11, ...]  // Every 4th move offset by 3
```

## Expected Performance Improvement

### Before (Contiguous):
- Load imbalance: **41.9%**
- Workers timing out: **2/4**
- Actual speedup: **~1.5x** (most time spent waiting for slowest worker)

### After (Interleaved):
- Load imbalance: **<15%** (target)
- Workers timing out: **0/4** (expected)
- Actual speedup: **2.5-3.0x** (much better parallelization)

### Why 2.5-3.0x instead of 4x?

Even with perfect load balancing, theoretical 4x speedup is impossible due to:

1. **Overhead (~100ms)**:
   - Worker communication
   - Message serialization
   - Result aggregation
   
2. **Amdahl's Law**:
   - Some work cannot be parallelized (root move selection, TT initialization)
   
3. **Shared TT contention**:
   - Multiple workers accessing shared memory (Atomics cause slight slowdown)
   
4. **Search tree variance**:
   - Even with balanced moves, some subtrees are inherently deeper/wider

**Realistic speedup range**: 2.5-3.5x with 4 workers at depth 5-6

## Testing the Fix

After this change, look for these improvements in the logs:

### Good Signs:
✅ **Load imbalance < 15%**
✅ **All workers finish before timeout** (no 9999ms times)
✅ **Worker times within 20% of each other**
✅ **All workers complete their assigned moves** (Searched == Moves)
✅ **Search time < 4000ms** (down from 10000ms timeout)

### Example of Good Distribution:
```
│ Worker │ Moves │ Searched │ Time (ms) │ Load %  │
├────────┼───────┼──────────┼───────────┼─────────┤
│   0    │   6   │    6     │  2245.3   │  85.2%  │
│   1    │   6   │    6     │  2634.7   │ 100.0%  │  ← Slowest (sets the pace)
│   2    │   5   │    5     │  2198.1   │  83.4%  │
│   3    │   5   │    5     │  2401.5   │  91.1%  │
───────────────────────────────────────────────────
Total time: 2634.7ms (limited by slowest worker)
Load imbalance: 16.6% (acceptable)
```

### Red Flags (if still present):
❌ Load imbalance > 30%
❌ Any worker hitting timeout (9999ms)
❌ Worker times varying by >2x
❌ Workers not completing assigned moves

## Alternative Approaches (Future Optimizations)

If interleaved distribution doesn't fully solve the problem:

### 1. **Dynamic Work Stealing**
- Workers that finish early "steal" moves from busy workers
- Requires more complex worker communication
- Can achieve near-perfect load balancing

### 2. **Lazy SMP (Shared Memory Parallelism)**
- All workers search the full tree with slight randomization
- No move distribution needed
- Better for deep searches (depth 8+)

### 3. **Iterative Deepening with Move Ordering**
- Use previous depth results to order moves better
- Then distribute pre-sorted moves
- Reduces variance in move difficulty

### 4. **Adaptive Worker Count**
- Use fewer workers at shallow depth (overhead dominates)
- Use more workers at deep depth (parallelism dominates)
- Currently fixed at 4 workers

For now, **interleaved distribution** is the simplest and most effective fix for the current architecture.

## Summary

**Change**: Replace contiguous move batching with interleaved round-robin distribution

**Impact**: 
- Load imbalance: 41.9% → <15%
- Expected speedup: 1.5x → 2.5-3.0x
- Workers timing out: 2/4 → 0/4

**Next Steps**: Test with a few moves and verify the per-worker times are balanced
