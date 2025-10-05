# Undo/Redo System Specification

## Overview

The Undo/Redo system provides full bidirectional action history with branching semantics. It supports all action types (MOVE, COMBINE, DECOMBINE) and persists across save/load.

## Architecture

### History Stacks

```
Past Stack:  [Action1, Action2, Action3, Action4]  ← Most recent
                                           ↑ Current position

Future Stack: [Action5, Action6]  ← Available for redo
```

### Components

1. **History Manager** (`History` class)
   - Manages past/future stacks
   - Stores state diffs for efficiency
   - Handles branching logic

2. **History Entry**
   - Action object
   - State diff (for reversal)
   - Turn index
   - Position key
   - Timestamp

3. **State Diff**
   - Efficient representation of changes
   - Smaller than full state snapshot
   - Reversible

## API Reference

### History Class

```javascript
import { History } from './core/History.js';

const history = new History();
```

#### Methods

##### `canUndo()`

Check if undo is available.

**Returns:** `boolean`

##### `canRedo()`

Check if redo is available.

**Returns:** `boolean`

##### `getUndoCount()`

Get number of actions that can be undone.

**Returns:** `number`

##### `getRedoCount()`

Get number of actions that can be redone.

**Returns:** `number`

##### `push(action, stateBefore, stateAfter)`

Add action to history.

**Parameters:**
- `action` (Action): The applied action
- `stateBefore` (GameState): State before application
- `stateAfter` (GameState): State after application

**Effects:**
- Adds to past stack
- **Clears future stack** (branching behavior)
- Computes state diff

##### `undo()`

Undo last action.

**Returns:** `Object`
```javascript
{
    action: Action,        // Action being undone
    stateDiff: Object,     // Diff to apply
    reverse: true          // Apply diff in reverse
}
```

**Returns `null`** if no actions to undo.

**Effects:**
- Moves entry from past to future
- Does NOT apply diff (caller's responsibility)

##### `redo()`

Redo last undone action.

**Returns:** Same format as `undo()` with `reverse: false`

**Returns `null`** if no actions to redo.

##### `getLastAction()`

Get most recent action (for display).

**Returns:** `Action | null`

##### `getActionHistory()`

Get all past actions as array.

**Returns:** `Action[]`

##### `checkThreefoldRepetition(currentPositionKey)`

Check if position has occurred 3+ times.

**Parameters:**
- `currentPositionKey` (number): Current position hash

**Returns:** `boolean`

##### `clear()`

Clear all history.

##### `serialize()`

Serialize history to JSON.

**Returns:** `Object`

##### `static deserialize(data)`

Restore history from JSON.

**Returns:** `History`

## Branching Semantics

### Behavior

When a new action is applied while redo stack is non-empty:

1. New action is added to past
2. **Redo stack is cleared** (branch point)
3. Undone actions are lost

### Example

```
Initial:  Past[A, B, C], Future[]

Undo:     Past[A, B], Future[C]

Undo:     Past[A], Future[B, C]

New Move: Past[A, D], Future[]  ← B and C are lost
```

### Rationale

- Prevents timeline confusion
- Matches user expectations (standard undo/redo behavior)
- Keeps history linear
- Simplifies network sync

### Alternative: History Tree

For advanced use cases (analysis mode), implement separate tree structure:

```javascript
// Not implemented yet
class HistoryTree {
    nodes: Map<actionId, HistoryNode>;
    currentNode: HistoryNode;
    
    branch(action) {
        // Create new branch without losing redo
    }
}
```

## State Diff

Efficient representation of state changes.

### Structure

```javascript
{
    boardChanges: [
        { row, col, oldPiece, newPiece },
        ...
    ],
    sideToMove: { old, new },
    turnIndex: { old, new },
    capturedPiece: string | null,
    positionKey: { old, new }
}
```

### Creating Diffs

```javascript
import { createStateDiff } from './core/GameState.js';

const diff = createStateDiff(oldState, newState);
```

### Applying Diffs

```javascript
import { applyStateDiff } from './core/GameState.js';

// Forward
const newState = applyStateDiff(currentState, diff, false);

// Reverse (undo)
const oldState = applyStateDiff(currentState, diff, true);
```

### Optimization

Diffs are typically 10-100 bytes vs 2-5 KB for full state snapshot.

## Usage Examples

### Basic Undo/Redo

```javascript
import { ChessEngine } from './core/EngineInterface.js';

const engine = new ChessEngine();

// Make moves
engine.applyAction(action1);
engine.applyAction(action2);
engine.applyAction(action3);

// Undo
const undoResult = engine.undo();
if (undoResult.success) {
    console.log('Undone:', undoResult.action.serialize());
}

// Redo
const redoResult = engine.redo();
if (redoResult.success) {
    console.log('Redone:', redoResult.action.serialize());
}

// Check availability
console.log('Can undo:', engine.canUndo());
console.log('Can redo:', engine.canRedo());
```

### UI Integration

```javascript
// Update button states
function updateUndoRedoButtons() {
    undoButton.disabled = !engine.canUndo();
    redoButton.disabled = !engine.canRedo();
    
    const history = engine.getHistory();
    undoButton.title = `Undo (${history.getUndoCount()} available)`;
    redoButton.title = `Redo (${history.getRedoCount()} available)`;
}

// Handle undo click
undoButton.onclick = () => {
    const result = engine.undo();
    if (result.success) {
        updateBoard(engine.getState().board);
        updateUndoRedoButtons();
        showMessage(`Undone: ${describeAction(result.action)}`);
    }
};

// Handle redo click
redoButton.onclick = () => {
    const result = engine.redo();
    if (result.success) {
        updateBoard(engine.getState().board);
        updateUndoRedoButtons();
        showMessage(`Redone: ${describeAction(result.action)}`);
    }
};
```

### Keyboard Shortcuts

```javascript
document.addEventListener('keydown', (e) => {
    // Ctrl+Z or Cmd+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (engine.canUndo()) {
            engine.undo();
            updateUI();
        }
    }
    
    // Ctrl+Shift+Z or Cmd+Shift+Z for redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (engine.canRedo()) {
            engine.redo();
            updateUI();
        }
    }
});
```

### Move History Display

```javascript
function displayMoveHistory() {
    const history = engine.getHistory();
    const actions = history.getActionHistory();
    
    const historyList = document.getElementById('move-history');
    historyList.innerHTML = '';
    
    actions.forEach((action, index) => {
        const li = document.createElement('li');
        li.textContent = `${Math.floor(index/2) + 1}. ${describeAction(action)}`;
        
        // Click to jump to this position
        li.onclick = () => jumpToMove(index);
        
        historyList.appendChild(li);
    });
}

function jumpToMove(targetIndex) {
    const currentIndex = engine.getHistory().getUndoCount() - 1;
    const diff = targetIndex - currentIndex;
    
    if (diff > 0) {
        // Redo to reach target
        for (let i = 0; i < diff; i++) {
            engine.redo();
        }
    } else if (diff < 0) {
        // Undo to reach target
        for (let i = 0; i < -diff; i++) {
            engine.undo();
        }
    }
    
    updateUI();
}
```

## Action Reversal

Each action type has specific reversal logic.

### MOVE Reversal

```javascript
// Original: e2 → e4
const moveAction = new MoveAction('white', 0, 6, 4, 4, 4);

// Reversal: e4 → e2, restore captured piece if any
const reversedMove = new MoveAction(
    'white',
    0,
    4, 4,     // Move back from e4
    6, 4,     // To e2
    null      // No capture on reverse move
);
```

If original move captured a piece, restoration happens via state diff.

### COMBINE Reversal

```javascript
// Original: Combine R+B into RB at R's square
const combineAction = new CombineAction(
    'white', 10,
    2, 3,  // Rook square
    2, 5,  // Bishop square
    2, 3   // Anchor (rook square)
);
// Result: RB at (2,3), empty at (2,5)

// Reversal: De-combine RB back to R and B
const reversalAction = new DecombineAction(
    'white', 10,
    2, 3,  // RB is here
    2, 5,  // Spawn B back here
    'R',   // R stays at (2,3)
    'B'    // B spawns at (2,5)
);
```

### DECOMBINE Reversal

```javascript
// Original: De-combine RB into R and B
const decombineAction = new DecombineAction(
    'white', 15,
    3, 4,  // RB position
    3, 5,  // Spawn square
    'R',   // R stays
    'B'    // B spawns
);
// Result: R at (3,4), B at (3,5)

// Reversal: Combine R and B back into RB
const reversalAction = new CombineAction(
    'white', 15,
    3, 4,  // R square
    3, 5,  // B square
    3, 4,  // Anchor
    'RB',  // Restore original hybrid
    3, 4   // Place at original square
);
```

## Network Synchronization

### Undo/Redo Protocol

#### Guest Requests Undo

```
Guest:  UNDO_REQUEST →
        ← Host:  UNDO_ACCEPTED
        ← Host:  UNDO_APPLIED {undone_action_id, resulting_turn_index, resulting_position_key}
Guest:  Apply undo locally, verify position key
```

#### Host Denies Undo

```
Guest:  UNDO_REQUEST →
        ← Host:  UNDO_REJECTED {reason: "No moves to undo"}
```

### Consent Policy

**Default**: Only current player can request undo, both must consent.

**Implementation**:
```javascript
handleUndoRequest(message) {
    // Check if requester is current player
    if (message.sender_color !== this.engine.getState().sideToMove) {
        this.sendUndoRejected('Only current player can undo');
        return;
    }
    
    // Optional: Request consent from opponent
    // For now: auto-accept
    
    const result = this.engine.undo();
    if (result.success) {
        this.broadcastUndoApplied(result.action);
    } else {
        this.sendUndoRejected(result.reason);
    }
}
```

### Redo Considerations

Redo over network is complex:
- Both players must have identical redo stacks
- Any intervening action clears redo
- Easier to disable redo in multiplayer

**Recommendation**: Disable redo in multiplayer, only allow in local analysis.

## Persistence

### Serialization

```javascript
const saveData = engine.serialize();

localStorage.setItem('chess-game', JSON.stringify(saveData));
```

Includes:
- Current game state
- Full past stack
- Full future stack
- Applied action IDs

### Loading

```javascript
const saveData = JSON.parse(localStorage.getItem('chess-game'));

const engine = ChessEngine.deserialize(saveData);

// History is fully restored
console.log('Can undo:', engine.canUndo());
console.log('Can redo:', engine.canRedo());
```

## Performance

### Memory Usage

Per history entry:
- Action object: ~200 bytes
- State diff: ~50-100 bytes
- Total: ~250-300 bytes per move

For 100-move game: ~25-30 KB

### Time Complexity

- `push()`: O(n) where n = changed squares (typically 2-4)
- `undo()`: O(n) where n = changed squares
- `redo()`: O(n) where n = changed squares
- `canUndo()`: O(1)
- `canRedo()`: O(1)

## Testing

### Round-Trip Test

```javascript
// Apply actions
engine.applyAction(action1);
engine.applyAction(action2);
engine.applyAction(action3);

const stateAfter3 = engine.getState().serialize();

// Undo all
engine.undo();
engine.undo();
engine.undo();

const stateInitial = engine.getState().serialize();

// Redo all
engine.redo();
engine.redo();
engine.redo();

const stateAfter3Again = engine.getState().serialize();

// Must be identical
assert.deepEqual(stateAfter3, stateAfter3Again);
```

### Branching Test

```javascript
// Setup
engine.applyAction(action1);
engine.applyAction(action2);
engine.applyAction(action3);
engine.applyAction(action4);

// Undo twice
engine.undo();
engine.undo();

// Redo available
assert(engine.canRedo());
assert.equal(engine.getHistory().getRedoCount(), 2);

// Apply new action
engine.applyAction(action5);

// Redo cleared
assert(!engine.canRedo());
assert.equal(engine.getHistory().getRedoCount(), 0);
```

## Future Enhancements

### Variation Analysis

Allow branching without losing history:

```javascript
// Create variation from current position
const variation = engine.createVariation();
variation.applyAction(alternativeMove);

// Return to main line
engine.loadVariation(mainLine);
```

### Annotations

Attach comments to moves:

```javascript
engine.annotateLastMove('Brilliant sacrifice!');
engine.setMoveRating(3, '!!');  // !! = brilliant
```

### PGN Export

Export history to PGN format:

```javascript
const pgn = engine.exportPGN({
    event: 'Casual Game',
    white: 'Player 1',
    black: 'Player 2',
    result: '1-0'
});
```

## Debugging

### History Dump

```javascript
console.log(engine.getHistory().getSummary());

// Output:
{
    pastCount: 15,
    futureCount: 0,
    canUndo: true,
    canRedo: false,
    lastAction: { type: 'MOVE', ... }
}
```

### State Verification

After every undo/redo, verify integrity:

```javascript
function verifyIntegrity() {
    const state = engine.getState();
    
    // Check position key
    const computedKey = computePositionKey(state.getPositionSnapshot());
    assert.equal(computedKey, state.getPositionKey());
    
    // Check turn index consistency
    assert.equal(state.turnIndex, engine.getHistory().getUndoCount());
    
    // Check no pieces out of bounds
    // ... more checks
}
```
