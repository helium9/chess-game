# Phase 2B: Enhanced Performance Logging & Diagnostics

## Overview
Added comprehensive per-worker logging to diagnose why parallel search isn't achieving expected 2.5-3.5x speedup.

## Changes Made

### 1. Enhanced Worker Logging (`searchWorker.js`)

Added detailed metrics for each worker:
- **Search time**: Time spent searching (ms)
- **Moves assigned**: Number of moves given to this worker
- **Moves searched**: Actual moves searched (may be less due to timeout/beta cutoffs)
- **Beta cutoffs**: Number of early terminations (indicates move ordering quality)
- **Per-worker TT stats**: Hits, misses, stores, collisions for this worker

```javascript
{
    type: 'SEARCH_RESULT',
    bestMove,
    bestScore,
    nodesSearched,
    timedOut,
    movesAssigned,      // NEW
    movesSearched,      // NEW
    betaCutoffs,        // NEW
    searchTime,         // NEW (ms)
    ttStats: {          // Already existed, now with more detail
        hits,
        misses,
        stores,
        collisions
    }
}
```

### 2. Enhanced WorkerManager Logging (`WorkerManager.js`)

Added detailed performance table and efficiency metrics:

```
📊 Per-Worker Breakdown:
┌────────┬────────┬───────────┬───────────┬────────────┬──────────┬──────────┬────────────┐
│ Worker │ Moves  │ Searched  │ Time (ms) │ Nodes      │ Nodes/s  │ TT Hits  │ Hit Rate   │
├────────┼────────┼───────────┼───────────┼────────────┼──────────┼──────────┼────────────┤
│   0    │   5    │    5      │  1234.5   │    45,231  │  36,652  │   12,456 │  45.2% (β:20%) │
│   1    │   5    │    4      │   987.3   │    32,145  │  32,560  │    8,234 │  38.1% (β:40%) │
│   2    │   4    │    4      │  1156.8   │    38,567  │  33,345  │   10,123 │  41.3% (β:25%) │
│   3    │   4    │    3      │   845.2   │    28,912  │  34,214  │    7,891 │  39.7% (β:33%) │
└────────┴────────┴───────────┴───────────┴────────────┴──────────┴──────────┴────────────┘

⚡ Parallel Efficiency Analysis:
   Worker times: min=845.2ms, avg=1055.9ms, max=1234.5ms
   Load imbalance: 31.5% (lower is better)
   Parallel overhead: 23.8ms
```

**Columns explained:**
- **Worker**: Worker index (0-3)
- **Moves**: Number of moves assigned to this worker
- **Searched**: Actual moves searched (< assigned if beta cutoff or timeout)
- **Time (ms)**: Time this worker spent searching
- **Nodes**: Total nodes searched by this worker
- **Nodes/s**: Search speed (nodes per second)
- **TT Hits**: Transposition table hits for this worker
- **Hit Rate**: TT hit percentage (β: beta cutoff %)

**Efficiency metrics:**
- **Worker times**: Shows min/avg/max search times across workers
- **Load imbalance**: How uneven the work distribution is (0% = perfect)
- **Parallel overhead**: Time spent on worker communication/coordination

### 3. Performance Diagnostic Tool (`performanceDiagnostics.js`)

Created utility to directly compare single-threaded vs parallel:

```javascript
import { compareSearchMethods } from './ai/performanceDiagnostics.js';

// In your game code
const result = await compareSearchMethods(board, currentTurn, castlingRights, 'MEDIUM');
```

Output:
```
═══════════════════════════════════════════════════════
🔬 PERFORMANCE DIAGNOSTIC: Single vs Parallel Search
═══════════════════════════════════════════════════════
Depth: 5, Difficulty: MEDIUM

🔄 Running single-threaded search...
✅ Single-threaded complete: 3245.67ms
   Nodes: 124,532

🔄 Running parallel search...
✅ Parallel complete: 1456.32ms

═══════════════════════════════════════════════════════
📊 COMPARISON SUMMARY
═══════════════════════════════════════════════════════
Single-threaded time:  3245.67ms
Parallel time:         1456.32ms
───────────────────────────────────────────────────────
Speedup:              2.23x
Efficiency:           55.8% (of ideal 4x)
Time saved:           1789.35ms
```

## How to Diagnose Performance Issues

### Step 1: Check Per-Worker Table

Look for these issues:

**1. Load Imbalance (Uneven Times)**
```
Worker 0: 2500ms ← Much slower than others
Worker 1:  800ms
Worker 2:  750ms
Worker 3:  820ms
```
**Problem**: Worker 0 got the hardest moves (poor distribution)
**Solution**: Implement interleaved move distribution or dynamic work stealing

**2. Beta Cutoff Disparity**
```
Worker 0: β:5%   ← Low cutoffs (hard moves)
Worker 1: β:60%  ← High cutoffs (easy moves)
```
**Problem**: Move ordering not splitting work evenly
**Solution**: Randomize or interleave move distribution

**3. Low TT Hit Rates (<30%)**
```
Worker 0: 12.3% hit rate
Worker 1: 15.7% hit rate
```
**Problem**: TT not effective (positions not repeating)
**Solution**: Check TT size, hash collisions, depth settings

### Step 2: Check Efficiency Metrics

**Load Imbalance**
- **<10%**: Excellent (work evenly distributed)
- **10-30%**: Acceptable (some variance)
- **>30%**: Poor (one worker bottlenecks everything)

**Parallel Overhead**
- **<50ms**: Negligible
- **50-200ms**: Acceptable
- **>200ms**: High (worker communication too slow)

### Step 3: Run Direct Comparison

Use `compareSearchMethods()` to see if speedup meets expectations:

```javascript
// In browser console or test code
import { compareSearchMethods } from './ai/performanceDiagnostics.js';

// Assuming you have board, currentTurn, castlingRights available
const result = await compareSearchMethods(board, currentTurn, castlingRights, 'MEDIUM');
```

**Expected speedups:**
- **EASY (depth 3)**: 1.5-2.0x (low depth = high overhead)
- **MEDIUM (depth 5)**: 2.5-3.0x (sweet spot)
- **HARD (depth 6+)**: 3.0-3.5x (deep search benefits more)

## Common Issues & Solutions

### Issue 1: Speedup < 1.5x at Depth 5+

**Diagnosis**:
```
Load imbalance: 65%
Worker 0: 3500ms (18 moves)
Worker 1: 800ms (18 moves)
```

**Root Cause**: Contiguous move batching gives Worker 0 all the good moves (which take longer to search)

**Solution**: Implement **interleaved distribution**:
```javascript
// Instead of: [0,1,2,3,4] → W0, [5,6,7,8,9] → W1
// Do:         [0,4,8,12] → W0, [1,5,9,13] → W1, [2,6,10,14] → W2, [3,7,11,15] → W3
```

### Issue 2: TT Hit Rate Similar to Single-Threaded

**Diagnosis**:
```
Single-threaded: 42% TT hit rate
Parallel:        44% TT hit rate (expected >50%)
```

**Root Cause**: Workers exploring different branches (minimal position overlap)

**This is actually NORMAL** for root splitting! Workers search completely different move trees, so they don't benefit much from each other's TT entries. Shared TT mainly helps:
1. Avoiding duplicate hash collisions
2. Learning from opponent moves in iterative deepening
3. Transposition between worker subtrees (rare at root)

**Not a bug**: TT hit rate staying similar is expected with root splitting.

### Issue 3: High Parallel Overhead (>200ms)

**Diagnosis**:
```
Parallel overhead: 456ms
Max worker time: 1200ms
Total time: 1656ms
```

**Root Cause**: Worker initialization, message passing, or result aggregation too slow

**Solutions**:
1. Check worker pool initialization (should be done once, not per move)
2. Minimize data sent in messages (avoid serializing large objects)
3. Use Transferable objects for large data

## Next Steps

Based on your logs, the most likely issue is:

1. **Load imbalance from contiguous batching** - Check if Worker 0 consistently takes much longer
2. **Shallow depth overhead** - At depth 5, if positions are simple, overhead dominates
3. **Move count too low** - With <20 legal moves, 4 workers may be overkill

**Recommendation**: 
- Share a full log from one AI move with the enhanced logging
- We'll analyze the per-worker breakdown to pinpoint the bottleneck
- Consider implementing interleaved distribution if load imbalance >30%
