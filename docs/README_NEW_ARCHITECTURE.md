# Chess Variant - Engine-Compatible Core with Undo/Redo

A chess variant game with piece combination/de-combination mechanics, featuring a **deterministic, engine-ready core** designed for future AI integration and multiplayer networking.

## 🎯 Project Goals

- ✅ **Engine-Compatible**: Clean interface for future C++ alpha-beta engine
- ✅ **WebRTC-Ready**: Synchronization model for 2-player online games  
- ✅ **Full Undo/Redo**: Comprehensive history with branching semantics
- ✅ **Deterministic**: No hidden randomness, reproducible across platforms
- ✅ **Serializable**: Save/load complete game state

## 🏗️ Architecture

### Core Modules

```
src/
├── core/
│   ├── Action.js          # Unified action model (MOVE, COMBINE, DECOMBINE)
│   ├── GameState.js       # Canonical game state (authoritative)
│   ├── History.js         # Undo/redo with state diffs
│   ├── EngineInterface.js # Main API for UI and future engine
│   └── PositionKey.js     # Zobrist hashing for position equality
├── network/
│   ├── MessageSchema.js   # WebRTC message types (frozen schema)
│   └── NetworkSync.js     # Authority model and reconciliation
└── utils/
    ├── moveValidation.js  # Move legality rules
    ├── combinationRules.js   # Piece combination logic
    └── deCombinationRules.js # Hybrid splitting logic
```

### Design Principles

1. **Actions are the Only Way to Modify State**
   - All gameplay changes flow through immutable Action objects
   - Validated before application
   - Fully serializable and reversible

2. **Strict Separation: Position vs UI State**
   - Position snapshot: Engine-visible, deterministic
   - UI state: Selections, highlights, modals (transient)

3. **Single Authority Model**
   - Host validates and broadcasts authoritative actions
   - Guests send proposals, wait for confirmation
   - Idempotent action application prevents desyncs

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Basic Usage

```javascript
import { ChessEngine } from './src/core/EngineInterface.js';
import { MoveAction } from './src/core/Action.js';

// Create engine
const engine = new ChessEngine();

// Get current state
const state = engine.getState();
console.log('Turn:', state.sideToMove);

// List legal actions
const actions = engine.listLegalActions();
console.log(`${actions.length} legal moves`);

// Apply a move
const move = new MoveAction('white', 0, 6, 4, 4, 4); // e2 → e4
const result = engine.applyAction(move);

if (result.success) {
    console.log('Move applied!');
    console.log('Position key:', result.action.result_checksum);
} else {
    console.error('Invalid move:', result.reason);
}

// Undo
if (engine.canUndo()) {
    engine.undo();
    console.log('Move undone');
}

// Redo
if (engine.canRedo()) {
    engine.redo();
    console.log('Move redone');
}
```

### Combination Example

```javascript
import { CombineAction } from './src/core/Action.js';

// Combine rook and bishop into rook-bishop hybrid
const combine = new CombineAction(
    'white',        // Actor color
    10,             // Turn index
    2, 3,           // Rook position
    2, 5,           // Bishop position  
    2, 3            // Anchor (first clicked)
);

const result = engine.applyAction(combine);
// Hybrid identity and placement computed deterministically
```

### De-combination Example

```javascript
import { DecombineAction } from './src/core/Action.js';

// Split rook-bishop hybrid
const decombine = new DecombineAction(
    'white',
    15,
    3, 4,      // Hybrid position
    3, 5       // Spawn square (adjacent)
);

const result = engine.applyAction(decombine);
// Component assignment computed deterministically
```

## 📚 Documentation

### Core Documentation

- **[Engine Interface](./docs/ENGINE_INTERFACE.md)** - Complete API reference
- **[Action Schema](./docs/ACTION_SCHEMA.md)** - Action types and fields
- **[Undo/Redo](./docs/UNDO_REDO.md)** - History system and branching
- **[Networking](./docs/NETWORKING.md)** - WebRTC messages and sync (TODO)
- **[Determinism Rules](./docs/DETERMINISM.md)** - Tie-break policies (TODO)

### Key Concepts

#### Actions

All gameplay modifications use Action objects:

```javascript
// Action Types
- MOVE:      Standard piece moves (including captures)
- COMBINE:   Merge two pieces into hybrid
- DECOMBINE: Split hybrid into components
- PROMOTION: Pawn promotion (reserved)
- SYSTEM:    Game control (resign, draw, etc.) (reserved)
```

Each action includes:
- `action_id`: Unique identifier
- `turn_index`: Ply number when created
- `actor_color`: Player color
- Full parameters for deterministic replay

#### Position Snapshot

Engine-visible position data:

```javascript
{
    board: string[][],      // 8x8 piece array
    sideToMove: string,     // 'white' or 'black'
    turnIndex: number,      // Ply number
    positionKey: number,    // Zobrist hash
    ruleOptions: Object     // Variant rules
}
```

Excludes UI state: selections, highlights, modals.

#### History

Bidirectional action history:

```
Past:   [A1, A2, A3, A4] ← Current position
Future: [A5, A6]         ← Available for redo
```

- New actions clear future stack (branching)
- State diffs for efficiency (~100 bytes/move)
- Persists across save/load

#### Network Messages

Frozen schema for multiplayer:

```javascript
ACTION_PROPOSED  // Player proposes action
ACTION_APPLIED   // Host broadcasts authoritative action
ACTION_REJECTED  // Host rejects proposed action
UNDO_REQUEST     // Request undo
UNDO_APPLIED     // Undo was applied
SYNC_SNAPSHOT    // Full state resync
// ... more
```

## 🎮 Multiplayer (WebRTC-Ready)

The synchronization layer is **designed and implemented**, but WebRTC signaling is not yet connected.

### Architecture

```
Host (Authority)              Guest (Peer)
     │                             │
     │    ← ACTION_PROPOSED ───────│  (1) Guest proposes move
     │                             │
     │─── ACTION_APPLIED ─────────→│  (2) Host validates and broadcasts
     │                             │
     │    (Both apply action)      │
```

### Integration Steps (Future)

1. Implement WebRTC signaling (STUN/TURN servers)
2. Connect `NetworkSyncManager` to WebRTC data channel
3. Add lobby/matchmaking UI
4. Handle disconnects and reconnects

### Current State

✅ Message schema defined  
✅ Authority model implemented  
✅ Idempotency checking  
✅ Position key verification  
✅ Sync/resync protocol  
❌ WebRTC signaling (not implemented)

## 🧪 Testing

### Acceptance Criteria

All 9 acceptance tests defined:

1. **Undo/Redo Round-Trip**: Apply 6 actions → Undo 3 → Redo 3 → State matches
2. **Branching**: Apply 4 → Undo 2 → Apply new → Redo cleared
3. **Idempotent Apply**: Same action twice → No-op second time
4. **Out-of-Order**: Receive action with old turn_index → Request sync
5. **Host/Peer Resync**: Peer misses messages → Request snapshot → Sync restored
6. **De-Combine Determinism**: Same assignment chosen across clients
7. **Illegal Action Rejection**: Wrong color/turn/king exposed → Rejected
8. **Serialization**: Save → Reload → Undo/redo still works
9. **Position Key Stability**: Same position → Same hash

### Running Tests (TODO)

```bash
npm test
```

## 🔧 Development

### Project Structure

```
my-tailwind-app/
├── src/
│   ├── core/              # Game engine (platform-agnostic)
│   ├── network/           # Multiplayer sync (no WebRTC impl yet)
│   ├── utils/             # Game rules and validation
│   └── components/        # React UI components
├── docs/                  # Technical documentation
├── tests/                 # Test suite (TODO)
└── public/                # Static assets
```

### Code Style

- **Functional Core**: Pure functions for game logic
- **Immutable Data**: No mutation of shared state
- **Explicit Errors**: Return `{success, reason}` instead of exceptions
- **Comprehensive Comments**: Explain *why*, not *what*

### Adding New Action Types

1. Define in `Action.js`:
   ```javascript
   export class NewAction extends Action {
       validate(state) { /* ... */ }
       apply(state) { /* ... */ }
       serialize() { /* ... */ }
   }
   ```

2. Add to `ACTION_TYPES` enum

3. Update `EngineInterface.listLegalActions()`

4. Add reversal logic to `History.js`

5. Update documentation

## 🚧 Roadmap

### Phase 1: Core Engine ✅
- [x] Action model
- [x] Game state
- [x] History/undo/redo
- [x] Engine interface
- [x] Position hashing

### Phase 2: Network (In Progress)
- [x] Message schema
- [x] Sync manager
- [ ] WebRTC signaling
- [ ] Lobby system
- [ ] Reconnect handling

### Phase 3: AI Engine (Future)
- [ ] C++ engine stub
- [ ] Position evaluation
- [ ] Alpha-beta search
- [ ] Move ordering
- [ ] Transposition tables

### Phase 4: Advanced Features
- [ ] Pawn promotion
- [ ] Castling
- [ ] En passant
- [ ] Time controls
- [ ] PGN export
- [ ] Analysis mode

## 📝 License

MIT

## 🤝 Contributing

This project follows strict architectural principles. Please read the documentation before contributing:

1. All state changes go through Actions
2. No randomness in game logic
3. Maintain determinism guarantees
4. Add tests for new features
5. Update relevant documentation

## 🔍 Debugging

### Enable Verbose Logging

```javascript
// In EngineInterface.js
const DEBUG = true;

if (DEBUG) {
    console.log('Action applied:', action.serialize());
    console.log('New position key:', state.getPositionKey());
}
```

### Verify Position Key

```javascript
const snapshot = engine.getPositionSnapshot();
const recomputed = computePositionKey(snapshot);

if (recomputed !== snapshot.positionKey) {
    console.error('Position key mismatch!');
}
```

### History Integrity Check

```javascript
const summary = engine.getHistory().getSummary();
console.log('Past:', summary.pastCount);
console.log('Future:', summary.futureCount);
console.log('Can undo:', summary.canUndo);
```

## 📧 Contact

For questions or issues, please open a GitHub issue.

---

**Note**: This is a work in progress. The core engine and undo/redo are complete, but UI integration and WebRTC implementation are ongoing.
