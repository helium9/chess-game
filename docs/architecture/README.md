# Architecture Documentation

This directory contains documentation about the system architecture, design decisions, and structural patterns used in the Chess Piece Combination Game.

## Available Documentation

- **[System Architecture](./system-architecture.md)** - Overall system design, patterns, and component structure
- **[Code Duplication Rationale](./code-duplication-rationale.md)** - Design decisions regarding code organization

## Architecture Overview

The project follows a **component-based architecture** with React, emphasizing:

- Separation of concerns
- Unidirectional data flow
- Pure functions for game logic
- Controlled components for UI

## System Layers

### 1. **UI Layer** (`src/components/`)

- React components for rendering
- Custom hooks for complex UI logic
- Pure presentation components in `ui/`
- Helper functions in `helpers/`

### 2. **Game Logic Layer** (`src/utils/`)

- Pure functions for chess rules
- Move calculation and validation
- Piece combination rules
- Game state management

### 3. **AI Layer** (`src/ai/`)

- Alpha-beta search algorithm
- Position evaluation
- Transposition tables
- Web workers for parallelization

### 4. **Network Layer** (`src/services/`, `src/hooks/`)

- WebRTC connection management
- Firebase signaling service
- Game state synchronization
- Reconnection logic

## Key Architectural Patterns

### State Management

- **Single Source of Truth**: `App.jsx` owns game state
- **Controlled Components**: Child components receive state via props
- **Callback Pattern**: State updates flow up via callbacks
- **Immutability**: Game state never mutated directly

### Game State Flow

```
┌──────────┐
│  App.jsx │ ← Single source of truth
└────┬─────┘
     │ gameState (props)
     ├────────────────────────┐
     ▼                        ▼
┌─────────────┐        ┌──────────────┐
│ ChessBoard  │        │ GameControls │
└─────┬───────┘        └──────────────┘
      │ onGameStateChange (callback)
      └──────────────────────────────────> App.jsx
```

### Move Validation Pipeline

```
1. User clicks square
2. calculateLegalMoves() → basic legal moves
3. wouldBeInCheck() → filter unsafe moves
4. For combinations: canReachForCombine() + canCombinePieces()
5. Apply move if valid
6. Update game state immutably
```

### AI Integration

```
┌──────────────┐
│  Game State  │
└──────┬───────┘
       │
       ▼
┌──────────────┐      ┌─────────────┐
│ WorkerManager│─────>│ Web Workers │ (Phase 2B)
└──────┬───────┘      └─────────────┘
       │
       ▼
┌──────────────┐
│  Alpha-Beta  │
│   + TT Cache │ (Phase 2A)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Best Move   │
└──────────────┘
```

## Design Principles

### 1. **Separation of Concerns**

- UI logic separated from game logic
- Hooks handle complex UI state
- Utils handle pure game logic
- AI isolated from UI dependencies

### 2. **Immutability**

- All game state updates create new objects
- `copyBoard()` for deep board copies
- `saveStateForUndo()` before mutations
- Functional approach prevents bugs

### 3. **Pure Functions**

- Game logic functions have no side effects
- Deterministic outputs for same inputs
- Easy to test and reason about
- Examples: `moveCalculator.js`, `combinationRules.js`

### 4. **Component Composition**

- Small, focused components
- Reusable UI components in `ui/`
- Composition over inheritance
- Props for configuration

### 5. **Progressive Enhancement**

- Core game works without AI
- Core game works without WebRTC
- Features can be disabled independently
- Graceful degradation

## File Organization

### Directory Structure

```
src/
├── components/         # React UI components
│   ├── ChessBoard.jsx  # Main board (orchestrator)
│   ├── hooks/          # Custom React hooks
│   ├── helpers/        # UI helper functions
│   └── ui/             # Reusable UI components
├── utils/              # Pure game logic
│   ├── gameState.js    # State management
│   ├── moveCalculator.js
│   ├── combinationRules.js
│   └── ...
├── ai/                 # AI engine (isolated)
│   ├── alphaBeta.js
│   ├── TranspositionTable.js
│   ├── WorkerManager.js
│   └── searchWorker.js
├── services/           # External services
│   └── WebRTCSignalingService.js
└── hooks/              # App-level hooks
    └── useWebRTC.js
```

### Naming Conventions

- **Components**: PascalCase (e.g., `ChessBoard.jsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useMoveHandler.js`)
- **Utils**: camelCase (e.g., `moveCalculator.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `AI_DIFFICULTY`)

## Key Architectural Decisions

### Why No Global State Management?

- Project size doesn't warrant Redux/Zustand
- Props drilling is manageable with current structure
- Local state + hooks sufficient for complexity
- Avoids unnecessary dependencies

### Why Separate Hooks and Helpers?

- **Hooks**: React-specific, use React features (useState, useEffect)
- **Helpers**: Pure functions, no React dependencies
- Clear separation of concerns
- Helpers are easier to test

### Why Utils vs Core?

- **Utils**: Game-specific logic (chess rules, combinations)
- **Core**: Generic systems (could be reused, but currently unused)
- Utils are actively maintained
- Core directory exists for future refactoring

### Why Isolated AI Directory?

- AI has no UI dependencies
- Can be tested independently
- Web workers require separate files
- Clear separation from game logic

## Performance Optimizations

### React Optimizations

- `useCallback` for stable function references
- `useMemo` for expensive calculations
- Conditional rendering to reduce DOM updates
- Ref-based timers to avoid re-renders

### Game Logic Optimizations

- Transposition table for position caching
- Alpha-beta pruning for search efficiency
- Move ordering for better pruning
- Zobrist hashing for fast position comparison

### Network Optimizations

- P2P connection (no server latency)
- Delta updates (only send changes)
- Heartbeat for connection monitoring
- Automatic reconnection

## Testing Strategy

### Unit Tests (Planned)

- Pure functions in `utils/`
- AI evaluation functions
- Move calculation logic
- Combination rules

### Integration Tests (Planned)

- Full game flows
- AI move generation
- WebRTC connection
- State synchronization

### Manual Testing (Current)

- Feature testing in browser
- AI performance benchmarks
- Multiplayer connection testing
- Cross-browser compatibility

## Future Architecture Plans

### Phase 3: State Management Refactor

- Consider Redux Toolkit if complexity grows
- Implement action/reducer pattern
- Centralize state updates
- Better undo/redo architecture

### Phase 4: Server-Side Features

- Optional central server for matchmaking
- Game persistence/save states
- User accounts and ratings
- Tournament management

### Phase 5: Performance

- Code splitting for faster load
- Lazy loading for AI/WebRTC
- Service worker for offline play
- Web Assembly for AI (if needed)

## Related Documentation

- [Core Systems](../03-CORE-SYSTEMS.md) - Detailed system implementations
- [Game Mechanics](../04-GAME-MECHANICS.md) - Chess rules and combinations
- [Developer Guide](../development/developer-guide.md) - Development workflow
- [AI Documentation](../ai/README.md) - AI architecture details
- [WebRTC Documentation](../webrtc/README.md) - Network architecture

---

[← Back to Documentation Index](../00-INDEX.md)
