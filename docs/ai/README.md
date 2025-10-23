# AI Engine Documentation

This directory contains comprehensive documentation for the chess AI engine, including implementation details, optimization phases, and testing guides.

## 🚀 Getting Started

- **[Quick Start Guide](./quick-start.md)** - Test and integrate the AI engine
- **[Implementation Summary](./implementation-summary.md)** - Overview of AI features and capabilities
- **[Difficulty Selector](./difficulty-selector.md)** - AI difficulty levels (Easy/Medium/Hard)

## 🏗️ Architecture & Design

- **[Parallel Search Architecture](./parallel-search-architecture.md)** - Multi-threaded search design using Web Workers
- **[Phase 2 Optimization Plan](./phase-2-optimization-plan.md)** - Overall performance optimization roadmap

## 📦 Phase 2A: Transposition Tables

Implementation of hash tables for position caching:

- **[Implementation](./phase-2a-implementation.md)** - Transposition table and Zobrist hashing implementation
- **[Debugging Summary](./phase-2a-debugging.md)** - Bug fixes and performance improvements

**Key Features:**

- 128MB transposition table
- Zobrist hashing for position fingerprints
- 40-60% hit rate at depth 6
- ~2x search speedup

## 📦 Phase 2B: Web Workers

Multi-threaded search parallelization:

- **[Bug Fix](./phase-2b-bug-fix.md)** - Worker communication and coordination fixes
- **[Enhanced Logging](./phase-2b-enhanced-logging.md)** - Improved debugging and diagnostics
- **[Load Balancing](./phase-2b-load-balancing.md)** - Work distribution across workers
- **[Pipeline Verification](./phase-2b-pipeline-verification.md)** - Integration testing and validation
- **[TT Stats Fix](./phase-2b-tt-stats-fix.md)** - Transposition table statistics improvements

## 🧪 Testing

- **[Testing Multithreading](./testing-multithreading.md)** - Guide for testing Web Worker implementation

## AI Features

### Search Algorithm

- **Alpha-Beta Pruning**: Negamax framework with move ordering
- **Move Ordering**: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
- **Quiescence Search**: Tactical position evaluation
- **Iterative Deepening**: Progressive depth searching (planned)

### Evaluation

- **Material Count**: Piece values (P=100, N=320, B=330, R=500, Q=900, K=20000)
- **Piece-Square Tables**: Positional evaluation for all pieces
- **Hybrid Evaluation**: Weighted average for combined pieces
- **Mobility**: Legal move count (planned enhancement)

### Performance Optimizations

- **Transposition Tables**: Cache position evaluations (Phase 2A ✅)
- **Zobrist Hashing**: Fast position fingerprinting (Phase 2A ✅)
- **Web Workers**: Parallel search (Phase 2B ✅)
- **Incremental Updates**: Efficient state transitions (planned)

### Difficulty Levels

- **Easy** (Depth 2): ~200ms search time, beginner-friendly
- **Medium** (Depth 4): ~2-5s search time, intermediate challenge
- **Hard** (Depth 6): ~10-30s search time, advanced opponent

## Implementation Status

| Phase | Feature              | Status      |
| ----- | -------------------- | ----------- |
| 1     | Core Alpha-Beta      | ✅ Complete |
| 2A    | Transposition Tables | ✅ Complete |
| 2A    | Zobrist Hashing      | ✅ Complete |
| 2B    | Web Workers          | ✅ Complete |
| 2B    | Load Balancing       | ✅ Complete |
| 2C    | Incremental Hashing  | 📋 Planned  |
| 2D    | Iterative Deepening  | 📋 Planned  |

## Quick Reference

### Using the AI

```javascript
import { findBestMove } from "./ai/alphaBeta.js";
import { AI_DIFFICULTY } from "./ai/constants.js";

const bestMove = findBestMove(gameState, AI_DIFFICULTY.MEDIUM.depth);

if (bestMove) {
  // Apply move to game
}
```

### Testing AI

```bash
# Run test suite
node src/ai/test-ai.js

# Test transposition table
node src/ai/test-tt.js
```

## Performance Benchmarks

- **Initial Position (Depth 4)**: ~2-3s (with TT), ~5-6s (without TT)
- **Mid-game Position (Depth 4)**: ~1-2s (with TT), ~3-4s (without TT)
- **TT Hit Rate**: 40-60% at depth 6
- **Web Workers**: ~2-3x speedup on 4+ core systems

## Future Enhancements

- [ ] Opening book integration
- [ ] Endgame tablebase support
- [ ] Neural network evaluation (NNUE)
- [ ] Time management for timed games
- [ ] Search extensions (check extension, singular extensions)
- [ ] Better hybrid piece evaluation

## Related Documentation

- [Core Systems](../03-CORE-SYSTEMS.md) - Game state and move generation
- [Game Mechanics](../04-GAME-MECHANICS.md) - Chess rules including combinations
- [Developer Guide](../development/developer-guide.md) - Contributing to AI

---

[← Back to Documentation Index](../00-INDEX.md)
