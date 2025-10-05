# Action Schema Specification

## Overview

Actions are the **only** way to modify game state. Every gameplay change (moves, combinations, de-combinations) flows through the Action system.

## Design Goals

1. **Immutable**: Actions never change after creation
2. **Deterministic**: Same action + same state = same result
3. **Idempotent**: Re-applying same action is safe (no-op)
4. **Serializable**: Can be sent over network or saved to disk
5. **Reversible**: Full undo/redo support

## Action Types

```javascript
export const ACTION_TYPES = {
    MOVE: 'MOVE',           // Standard piece move (includes en passant)
    COMBINE: 'COMBINE',     // Combine two pieces into hybrid
    DECOMBINE: 'DECOMBINE', // Split hybrid into components
    CASTLE: 'CASTLE',       // Castling move (king-side or queen-side)
    PROMOTE: 'PROMOTE',     // Pawn promotion to Queen/Rook/Bishop/Knight
    SYSTEM: 'SYSTEM'        // Resign, draw offers (reserved)
};
```

## Base Action Fields

All actions include these fields:

| Field | Type | Description |
|-------|------|-------------|
| `action_id` | string | Unique ID: `{color}_{turnIndex}_{counter}` |
| `actor_color` | string | 'white' or 'black' |
| `turn_index` | number | Ply number when action was created |
| `timestamp` | number | Unix timestamp (ms) |
| `result_checksum` | number\|null | Position key after application |

## MOVE Action

Represents a standard chess move (including captures and en passant).

### Constructor

```javascript
new MoveAction(actorColor, turnIndex, fromRow, fromCol, toRow, toCol, capturedPiece?, isEnPassant?, actionId?)
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from_row` | number | Yes | Source row (0-7) |
| `from_col` | number | Yes | Source column (0-7) |
| `to_row` | number | Yes | Destination row (0-7) |
| `to_col` | number | Yes | Destination column (0-7) |
| `captured_piece` | string\|null | No | Piece captured (null if none) |
| `moving_piece` | string | Auto | Piece being moved (set during validation) |
| `is_en_passant` | boolean | No | True if this is an en passant capture |
| `en_passant_target_created` | object\|null | Auto | En passant target created by this move |

### Validation

1. Turn index matches current state
2. Actor color matches side to move
3. Piece exists at source square
4. Piece belongs to actor
5. Move is legal (piece-specific rules, includes en passant)
6. Move doesn't expose king to check

### Special Handling

**En Passant Capture**: If moving pawn to en passant target square, automatically detects and captures the opponent's pawn.

**En Passant Target Creation**: If pawn moves two squares forward, creates an en passant target for the opponent's next move.

**Castling Rights**: Automatically updates castling rights when king or rook moves, or when rook is captured.

### Example

```javascript
import { MoveAction } from './core/Action.js';

// White pawn from e2 to e4
const action = new MoveAction(
    'white',  // actor_color
    0,        // turn_index
    6, 4,     // from (row 6, col 4 = e2)
    4, 4      // to (row 4, col 4 = e4)
);

// With capture
const captureAction = new MoveAction(
    'black',
    5,
    3, 4,     // from d5
    4, 5,     // to e4
    'P'       // captured white pawn
);
```

### Serialized Format

```json
{
    "type": "MOVE",
    "action_id": "white_0_0",
    "actor_color": "white",
    "turn_index": 0,
    "timestamp": 1728000000000,
    "result_checksum": 123456789,
    "from_row": 6,
    "from_col": 4,
    "to_row": 4,
    "to_col": 4,
    "captured_piece": null,
    "moving_piece": "P"
}
```

## COMBINE Action

Represents combining two pieces into a hybrid.

### Constructor

```javascript
new CombineAction(
    actorColor,
    turnIndex,
    square1Row, square1Col,
    square2Row, square2Col,
    anchorRow, anchorCol,
    hybridIdentity?,
    placementRow?, placementCol?,
    actionId?
)
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `square1_row` | number | Yes | First piece row |
| `square1_col` | number | Yes | First piece column |
| `square2_row` | number | Yes | Second piece row |
| `square2_col` | number | Yes | Second piece column |
| `anchor_row` | number | Yes | Anchor (first clicked) row |
| `anchor_col` | number | Yes | Anchor column |
| `hybrid_identity` | string | Auto | Resulting hybrid (e.g., 'RB') |
| `placement_row` | number | Auto | Where hybrid is placed |
| `placement_col` | number | Auto | Where hybrid is placed |
| `piece1` | string | Auto | Original piece 1 (for reversal) |
| `piece2` | string | Auto | Original piece 2 (for reversal) |

### Deterministic Fields

**Critical**: `hybrid_identity`, `placement_row`, and `placement_col` must be deterministically computed during validation if not provided.

**Placement Rules:**
1. Higher-value piece's square is preferred
2. If equal value, use anchor square
3. Same rule applied on all clients ensures consistency

### Validation

1. Turn index and color checks
2. Both squares contain pieces
3. Pieces are same color
4. Pieces can be combined (see allowed pairings)
5. Pieces are reachable (one can move to other)
6. Combination doesn't expose king to check

### Example

```javascript
import { CombineAction } from './core/Action.js';

// Combine white rook and bishop
const action = new CombineAction(
    'white',
    10,
    2, 3,  // Rook at square 1
    2, 5,  // Bishop at square 2
    2, 3   // Anchor at rook square
);
// hybrid_identity, placement computed during validation
```

### Serialized Format

```json
{
    "type": "COMBINE",
    "action_id": "white_10_5",
    "actor_color": "white",
    "turn_index": 10,
    "timestamp": 1728000000000,
    "result_checksum": 987654321,
    "square1_row": 2,
    "square1_col": 3,
    "square2_row": 2,
    "square2_col": 5,
    "anchor_row": 2,
    "anchor_col": 3,
    "hybrid_identity": "RB",
    "placement_row": 2,
    "placement_col": 3,
    "piece1": "R",
    "piece2": "B"
}
```

## DECOMBINE Action

Represents splitting a hybrid into its components.

### Constructor

```javascript
new DecombineAction(
    actorColor,
    turnIndex,
    hybridRow, hybridCol,
    spawnRow, spawnCol,
    stayingPiece?,
    spawningPiece?,
    actionId?
)
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hybrid_row` | number | Yes | Hybrid's row |
| `hybrid_col` | number | Yes | Hybrid's column |
| `spawn_row` | number | Yes | Where to spawn second piece |
| `spawn_col` | number | Yes | Where to spawn second piece |
| `staying_piece` | string | Auto | Component that stays at hybrid square |
| `spawning_piece` | string | Auto | Component that spawns at spawn square |
| `original_hybrid` | string | Auto | Original hybrid (for reversal) |

### Deterministic Assignment

**Critical for network sync**: When both assignments are legal (one component stays, other spawns), a deterministic rule selects which:

**Rule:** Always prefer assignment where **first component stays** (type1).

This ensures all clients make the same choice.

### Validation

1. Turn index and color checks
2. Piece at hybrid square is a hybrid
3. Hybrid belongs to actor
4. Spawn square is empty and adjacent
5. At least one legal assignment exists
6. Selected assignment doesn't expose king to check

### Example

```javascript
import { DecombineAction } from './core/Action.js';

// De-combine white rook-bishop hybrid
const action = new DecombineAction(
    'white',
    15,
    3, 4,  // Hybrid position
    3, 5   // Spawn square (adjacent)
);
// staying_piece and spawning_piece computed during validation
```

### Serialized Format

```json
{
    "type": "DECOMBINE",
    "action_id": "white_15_8",
    "actor_color": "white",
    "turn_index": 15,
    "timestamp": 1728000000000,
    "result_checksum": 456789123,
    "hybrid_row": 3,
    "hybrid_col": 4,
    "spawn_row": 3,
    "spawn_col": 5,
    "staying_piece": "R",
    "spawning_piece": "B",
    "original_hybrid": "RB"
}
```

## Action Lifecycle

```
1. Creation
   ↓
2. Validation (against current state)
   ↓
3. Application (if valid)
   ↓
4. History Recording
   ↓
5. Network Broadcast (if multiplayer)
```

## Validation vs Application

**Validation**: Checks if action is legal
- Read-only
- Returns `{valid: boolean, reason?: string}`
- Computes deterministic fields

**Application**: Actually modifies state
- Creates new board state
- Updates turn/side
- Returns new state data

## Action IDs

Format: `{color}_{turnIndex}_{counter}`

Examples:
- `white_0_0` - First action by white on turn 0
- `black_1_1` - Second action by black on turn 1
- `white_10_5_undo` - Undo action (suffix added)

**Properties:**
- Unique per game session
- Monotonically increasing counter
- Used for idempotency checks
- Network message correlation

## Serialization

All actions implement:

```javascript
serialize() {
    return {
        type: this.constructor.ACTION_TYPE,
        action_id: this.action_id,
        actor_color: this.actor_color,
        turn_index: this.turn_index,
        // ... action-specific fields
    };
}

static deserialize(data) {
    // Reconstruct action from serialized data
}
```

## Idempotency

Actions are idempotent: applying the same action twice is safe.

Implementation:
- Engine tracks applied action IDs
- Re-application returns `{success: true, duplicate: true}`
- No state change occurs

This is critical for network reliability.

## Network Considerations

### Complete Specification

Actions sent over network **must include all deterministic fields**:
- MOVE: `moving_piece`, `captured_piece`
- COMBINE: `hybrid_identity`, `placement_row`, `placement_col`, `piece1`, `piece2`
- DECOMBINE: `staying_piece`, `spawning_piece`, `original_hybrid`

This allows recipients to apply actions without re-computing rules.

### Verification

After applying a received action, verify `result_checksum` matches:

```javascript
const receivedKey = message.resulting_position_key;
const localKey = engine.getState().getPositionKey();

if (receivedKey !== localKey) {
    // Desync detected - request full snapshot
    requestSync();
}
```

## Usage Examples

### Creating and Applying

```javascript
import { MoveAction } from './core/Action.js';
import { ChessEngine } from './core/EngineInterface.js';

const engine = new ChessEngine();

// Create action
const action = new MoveAction('white', 0, 6, 4, 4, 4);

// Apply
const result = engine.applyAction(action);

if (result.success) {
    console.log('Action applied');
    console.log('New position key:', result.action.result_checksum);
} else {
    console.error('Failed:', result.reason);
}
```

### Listing Legal Actions

```javascript
const legalActions = engine.listLegalActions();

legalActions.forEach(action => {
    console.log(action.serialize());
});
```

### Network Send/Receive

```javascript
// Send
const action = new MoveAction(color, turnIndex, fromRow, fromCol, toRow, toCol);
const message = new ActionProposedMessage(gameId, playerId, role, action);
webrtcChannel.send(message.serialize());

// Receive
webrtcChannel.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const action = deserializeAction(message.action);
    
    const result = engine.applyAction(action);
    if (!result.success) {
        console.error('Failed to apply remote action:', result.reason);
        requestSync();
    }
};
```

## Testing Actions

```javascript
import { MoveAction } from './core/Action.js';
import { GameState } from './core/GameState.js';

// Setup test state
const state = GameState.createInitial();

// Create action
const action = new MoveAction('white', 0, 6, 4, 4, 4);

// Validate
const validation = action.validate(state);
assert(validation.valid);

// Apply
const result = action.apply(state);
assert(result.board[4][4] === 'P');
assert(result.board[6][4] === '');
```

## Future Extensions

### CASTLE Action

Represents castling moves (king-side or queen-side).

#### Constructor

```javascript
new CastleAction(actorColor, turnIndex, side, actionId?)
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `side` | string | Yes | 'king-side' or 'queen-side' |
| `king_start_row` | number | Auto | King's starting row (7 for white, 0 for black) |
| `king_start_col` | number | Auto | Always 4 (column e) |
| `rook_start_col` | number | Auto | 7 for king-side, 0 for queen-side |
| `king_end_col` | number | Auto | 6 for king-side, 2 for queen-side |
| `rook_end_col` | number | Auto | 5 for king-side, 3 for queen-side |

#### Validation

1. Turn index matches current state
2. Actor color matches side to move
3. Castling rights available for the chosen side
4. King and rook are in their starting positions
5. Squares between king and rook are empty
6. King is not in check
7. King doesn't pass through check
8. King doesn't end in check

#### Example

```javascript
import { CastleAction } from './core/Action.js';

// White king-side castling (O-O)
const kingSideCastle = new CastleAction('white', 10, 'king-side');

// Black queen-side castling (O-O-O)
const queenSideCastle = new CastleAction('black', 15, 'queen-side');
```

#### Serialized Format

```json
{
    "type": "CASTLE",
    "action_id": "white_10_5",
    "actor_color": "white",
    "turn_index": 10,
    "timestamp": 1728000500000,
    "result_checksum": null,
    "side": "king-side"
}
```

---

### PROMOTE Action

Represents pawn promotion to a new piece (Queen, Rook, Bishop, or Knight).

#### Constructor

```javascript
new PromoteAction(actorColor, turnIndex, fromRow, fromCol, toRow, toCol, promoteTo, capturedPiece?, actionId?)
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from_row` | number | Yes | Pawn's starting row (1 for white, 6 for black) |
| `from_col` | number | Yes | Pawn's starting column (0-7) |
| `to_row` | number | Yes | Promotion row (0 for white, 7 for black) |
| `to_col` | number | Yes | Promotion column (0-7) |
| `promote_to` | string | Yes | 'Q', 'R', 'N', 'B' (uppercase for white, lowercase for black) |
| `captured_piece` | string\|null | No | Piece captured during promotion move (null if none) |

#### Validation

1. Turn index matches current state
2. Actor color matches side to move
3. Moving piece is a pawn
4. Destination is the promotion rank (rank 8 for white, rank 1 for black)
5. Move is legal for pawn (forward or diagonal capture)
6. Promotion piece is valid (Q/R/N/B)
7. Promotion piece color matches actor color
8. Move doesn't expose king to check

#### Example

```javascript
import { PromoteAction } from './core/Action.js';

// White pawn from a7 to a8, promote to Queen
const promoteToQueen = new PromoteAction(
    'white',  // actor_color
    40,       // turn_index
    1, 0,     // from (row 1, col 0 = a7)
    0, 0,     // to (row 0, col 0 = a8)
    'Q'       // promote to Queen
);

// Black pawn captures on h1, promote to Knight
const promoteWithCapture = new PromoteAction(
    'black',
    55,
    6, 7,     // from h2
    7, 7,     // to h1
    'n',      // promote to knight (lowercase for black)
    'R'       // captured white Rook
);
```

#### Serialized Format

```json
{
    "type": "PROMOTE",
    "action_id": "white_40_8",
    "actor_color": "white",
    "turn_index": 40,
    "timestamp": 1728001000000,
    "result_checksum": null,
    "from_row": 1,
    "from_col": 0,
    "to_row": 0,
    "to_col": 0,
    "promote_to": "Q",
    "captured_piece": null
}
```

---

## Future Extensions

### SYSTEM Actions (Reserved)

For game control:
- Resign
- Draw offers
- Time control
- Chat messages (non-gameplay)

## Determinism Guarantee

**Promise**: Given identical:
1. Game state
2. Action parameters
3. Validation/application order

The result will be **byte-for-byte identical** across:
- Different machines
- Different sessions
- Different network topologies

This is enforced by:
- No random number generation
- Explicit tie-break rules
- Deterministic Zobrist hashing
- Fixed floating-point operations (none currently)
