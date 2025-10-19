# Game Mechanics

This document explains the rules of the chess variant, including standard chess rules, combination mechanics, and de-combination mechanics.

## Standard Chess Rules

### Piece Movement

#### Pawn (P/p)

- **Forward Movement**: 1 square forward (2 squares on first move)
- **Capture**: Diagonally forward (1 square)
- **Special**: No en passant implemented yet
- **Promotion**: Not fully implemented

#### Rook (R/r)

- **Movement**: Horizontal and vertical lines
- **Range**: Any number of squares
- **Blocked By**: Any piece (friend or foe)
- **Capture**: Can capture enemy pieces in path

#### Knight (N/n)

- **Movement**: L-shape (2+1 squares)
- **Special**: Can jump over pieces
- **Directions**: 8 possible L-shaped moves
- **Capture**: Destination square only

#### Bishop (B/b)

- **Movement**: Diagonal lines
- **Range**: Any number of squares
- **Blocked By**: Any piece (friend or foe)
- **Capture**: Can capture enemy pieces in path

#### Queen (Q/q)

- **Movement**: Combination of rook and bishop
- **Range**: Any number of squares in 8 directions
- **Most Powerful**: Standard chess piece

#### King (K/k)

- **Movement**: One square in any direction
- **Special**: Cannot move into check
- **Castling**: Not implemented yet
- **Win Condition**: Capturing opponent's king ends game

### Turn-Based Play

- **White moves first**
- Turns alternate between white and black
- Each turn consists of one action:
  - Normal move
  - Combination
  - De-combination

### Capture Rules

- **Standard Capture**: Move to square occupied by enemy piece
- **Captured Pieces**: Removed from board, displayed in captured pieces area
- **No Resurrection**: Captured pieces cannot return to board (except via de-combination)

### Check and Checkmate

⚠️ **Current Status**: Partially implemented

- **Check Detection**: King under attack is detected
- **Check Prevention**: Cannot make moves that leave king in check
- **Checkmate**: Not fully implemented
- **Stalemate**: Not implemented

---

## Combination Mechanics

The unique feature of this chess variant: **merging two pieces into a hybrid**.

### Basic Rules

1. **Must Be Same Color**: Can only combine friendly pieces
2. **Must Be Compatible**: Only certain piece pairs can combine
3. **Must Be Reachable**: One piece must be able to reach the other's square
4. **Cannot Combine Kings**: Kings are too important
5. **Cannot Combine Pawns**: Pawns are too weak
6. **Cannot Combine Hybrids**: Hybrids cannot merge further (Issue #17)

### Allowed Combinations

| Piece 1 | Piece 2 | Result                | Symbol | Movement                  |
| ------- | ------- | --------------------- | ------ | ------------------------- |
| Rook    | Bishop  | Rook-Bishop (RB/rb)   | ⚔      | Queen-like (8 directions) |
| Rook    | Knight  | Rook-Knight (RN/rn)   | ⚡     | Rook + Knight jumps       |
| Bishop  | Knight  | Bishop-Knight (BN/bn) | ⚙      | Bishop + Knight jumps     |
| Queen   | Knight  | Queen-Knight (QN/qn)  | ★      | Queen + Knight jumps      |

### Combination Process

#### Step 1: Enter Combine Mode

```
User clicks "Combine Mode" button
  ↓
System finds all eligible piece pairs
  ↓
Eligible pieces highlighted with green border
```

#### Step 2: Select Pieces

```
User clicks first piece (e.g., Rook)
  ↓
System shows compatible pieces with yellow border
  ↓
User clicks second piece (e.g., Bishop)
```

#### Step 3: Execute Combination

```
System validates combination
  ↓
Removes both pieces from board
  ↓
Places hybrid piece at position of higher-value piece
  ↓
Hybrid gets purple border
  ↓
Turn switches to opponent
```

### Reachability Check

For two pieces to combine, one must be able to legally move to the other's square **as if capturing it**.

Example:

```
. . . . . . . .
. . . . . . . .
. . R . . . . .  ← White Rook at c6
. . . . . . . .
. . . . B . . .  ← White Bishop at e4
. . . . . . . .
. . . . . . . .
. . . . . . . .
```

- Rook can reach Bishop (diagonal blocked, but Rook can move down then right)
- **Actually**: Rook cannot reach Bishop diagonally
- **Correct Check**: Bishop can reach Rook diagonally (c6 is on Bishop's diagonal)
- ✅ These pieces **CAN** combine

### Placement Logic

The hybrid is placed at the position of the **higher-value piece**:

```javascript
PIECE_VALUES = {
  q: 5, // Queen (highest)
  r: 4, // Rook
  b: 3, // Bishop
  n: 3, // Knight (same as bishop)
  p: 1, // Pawn
};
```

Example:

- Rook (value 4) + Bishop (value 3) = Hybrid placed at Rook's position
- Queen (value 5) + Knight (value 3) = Hybrid placed at Queen's position

If values are equal, the first piece's position is used.

### King Safety

Combinations cannot leave your king in check:

```javascript
// Before combining, check if king would be safe
if (wouldBeInCheck(board, piece1Pos, piece2Pos, currentTurn)) {
  return false; // Combination not allowed
}
```

---

## De-Combination Mechanics

Hybrid pieces can be **split back** into their original components.

### Basic Rules

1. **Only Hybrids**: Can only de-combine hybrid pieces (RB, RN, BN, QN)
2. **Adjacent Spawning**: New piece must spawn in adjacent square
3. **Safe Spawning**: Cannot spawn into:
   - Occupied squares
   - Squares attacked by enemy
   - Squares that would put king in check
4. **Choose Staying Piece**: Player chooses which component stays at current position
5. **Choose Spawn Location**: Player chooses where other component spawns

### De-Combination Process

#### Step 1: Enter De-Combine Mode

```
User clicks "De-Combine Mode" button
  ↓
System finds all hybrid pieces for current player
  ↓
Hybrids highlighted with yellow border
```

#### Step 2: Select Hybrid

```
User clicks hybrid piece (e.g., Rook-Bishop)
  ↓
System shows:
  - Which components it contains (R + B)
  - Valid spawn squares (green dots)
```

#### Step 3: Choose Staying Piece

```
Confirmation dialog appears:
  "Split RB into Rook and Bishop?"
  [Rook stays] [Bishop stays]
  ↓
User selects which piece stays at current position
```

#### Step 4: Choose Spawn Location

```
User clicks green dot (valid spawn square)
  ↓
System validates spawn is safe
  ↓
Places staying piece at hybrid's position
  ↓
Places spawning piece at selected square
  ↓
Turn switches to opponent
```

### Spawn Square Validation

A square is valid for spawning if:

1. **Adjacent**: Within 1 square of hybrid (8 surrounding squares)
2. **Empty**: Not occupied by any piece
3. **Not Attacked**: Not under attack by enemy pieces
4. **King Safe**: Spawning doesn't put own king in check

Example:

```
. . . . . . . .
. . x x x . . .  ← x = potential spawn squares
. . x RB x . . .  ← RB = Rook-Bishop hybrid
. . x x x . . .
. . . . . . . .
```

If enemy piece attacks some squares:

```
. . . . . . . .
. . ✓ ✓ ❌ . . .  ← ❌ = attacked by enemy
. . ✓ RB ❌ . . .  ← ✓ = safe spawn squares
. . ✓ ✓ ❌ . . .
. . . . n . . .  ← enemy knight attacking
```

### Component Extraction

Each hybrid has predefined components:

```javascript
HYBRID_COMPONENTS = {
  rb: ["r", "b"], // Rook-Bishop → Rook + Bishop
  rn: ["r", "n"], // Rook-Knight → Rook + Knight
  bn: ["b", "n"], // Bishop-Knight → Bishop + Knight
  qn: ["q", "n"], // Queen-Knight → Queen + Knight

  // Uppercase for white pieces
  RB: ["R", "B"],
  RN: ["R", "N"],
  BN: ["B", "N"],
  QN: ["Q", "N"],
};
```

---

## Hybrid Piece Movement

Hybrid pieces move according to **combined rules** of their components.

### Rook-Bishop (RB/rb)

**Components**: Rook + Bishop  
**Movement**: Queen-like (same as standard Queen)

- Horizontal lines (from Rook)
- Vertical lines (from Rook)
- Diagonal lines (from Bishop)
- Cannot jump over pieces

**Example**:

```
. . . . ✓ . . .
✓ . . . ✓ . . ✓
. ✓ . . ✓ . ✓ .
. . ✓ . ✓ ✓ . .
✓ ✓ ✓ ✓ RB ✓ ✓ ✓
. . ✓ . ✓ ✓ . .
. ✓ . . ✓ . ✓ .
✓ . . . ✓ . . ✓
```

### Rook-Knight (RN/rn)

**Components**: Rook + Knight  
**Movement**: Combination of both

- Horizontal/vertical lines (from Rook)
- L-shaped jumps (from Knight)

**Example**:

```
. . . ⚡ ✓ ⚡ . .
. . ⚡ . ✓ . ⚡ .
. . . . ✓ . . .
⚡ ⚡ . . ✓ . ⚡ ⚡
✓ ✓ ✓ ✓ RN ✓ ✓ ✓
⚡ ⚡ . . ✓ . ⚡ ⚡
. . . . ✓ . . .
. . ⚡ . ✓ . ⚡ .

⚡ = Knight moves (can jump)
✓ = Rook moves (blocked by pieces)
```

### Bishop-Knight (BN/bn)

**Components**: Bishop + Knight  
**Movement**: Combination of both

- Diagonal lines (from Bishop)
- L-shaped jumps (from Knight)

**Example**:

```
✓ . . ⚡ . ⚡ . ✓
. ✓ ⚡ . . . ⚡ .
. . ✓ . . ✓ . .
⚡ . . ✓ ✓ ⚡ . ⚡
. . . ✓ BN ✓ . .
⚡ . . ✓ ✓ ⚡ . ⚡
. . ✓ . . ✓ . .
✓ ⚡ . . . . ⚡ ✓
```

### Queen-Knight (QN/qn)

**Components**: Queen + Knight  
**Movement**: Most powerful piece

- All Queen directions (8 lines)
- L-shaped jumps (from Knight)

**Example**: Combines Queen's 8-direction movement with Knight's jumps (very powerful!)

---

## Special Rules & Edge Cases

### Issue #17: Hybrid Limitation

**Rule**: Hybrids cannot combine with any piece (including other hybrids)

**Reason**:

- Prevents infinite recursion
- Simplifies game balance
- Avoid "super-hybrid" pieces

**Example**:

```
❌ RB + N → Cannot create RBN (triple hybrid)
❌ RB + QN → Cannot combine two hybrids
✅ RB de-combine → R + B (allowed)
```

### King Safety Priority

All actions (move, combine, de-combine) check king safety:

```javascript
function isActionSafe(action, gameState) {
  const tempState = action.apply(gameState);
  return !isKingInCheck(tempState, gameState.sideToMove);
}
```

**Priority**: King safety > All other rules

### Turn Consumption

Each action consumes one turn:

- Normal move = 1 turn
- Combination = 1 turn
- De-combination = 1 turn

**Strategy**: Combining takes a turn, so timing is important!

### Captured Piece Recovery

De-combining does **NOT** recover captured pieces:

```
Turn 1: R + B → RB (combine)
Turn 2: Enemy captures RB
❌ Cannot recover R and B (both are lost)
```

However:

```
Turn 1: R + B → RB (combine)
Turn 2: RB → R + B (de-combine)
✅ Both pieces return to board
```

### Multiple Hybrids

A player can have multiple hybrids simultaneously:

```
. r . . . . . r
. . . . . . . .
. RB . . . BN .  ← Two white hybrids
. . . . . . . .
. . . RN . . . .  ← Three white hybrids total
```

No limit on number of hybrids per player.

---

## Win Conditions

### King Capture (Current Implementation)

The game ends when a king is captured.

**Winning**: Capture opponent's king
**Losing**: Your king is captured

⚠️ **Limitation**: This is not standard chess (should be checkmate)

### Checkmate (Future Implementation)

Standard chess: Game ends when king is in checkmate

- King is in check
- No legal move can escape check

### Draw Conditions (Not Implemented)

Standard chess draws:

- **Stalemate**: No legal moves, king not in check
- **Threefold Repetition**: Same position occurs 3 times
- **50-Move Rule**: 50 moves without capture or pawn move
- **Insufficient Material**: Not enough pieces to checkmate

---

## Strategy Tips

### When to Combine

**Good Times**:

- Early game: Create powerful hybrids
- When pieces are not needed separately
- To consolidate weak pieces

**Bad Times**:

- When you need piece flexibility
- When king is under threat
- When opponent can capture hybrid easily

### When to De-Combine

**Good Times**:

- Need piece flexibility
- Hybrid is trapped
- End game: need more pieces to cover board

**Bad Times**:

- No safe spawn squares
- Hybrid is more valuable as-is

### Hybrid Value

Hybrids are powerful but:

- **Single target**: Capturing one hybrid = losing two pieces
- **Less flexible**: Cannot be in two places
- **Costly to split**: Takes a turn

**Risk vs Reward**: Hybrids are high-risk, high-reward

---

## Algebraic Notation (Future)

Standard chess notation could be extended:

```
e2-e4      Normal move
Nf3        Normal move (piece type + destination)
Rxf7       Capture
R+B→RB@d4  Combination (Rook + Bishop → Rook-Bishop at d4)
RB@d4→R@d4,B@e4  De-combination
O-O        Castling (not implemented)
e8=Q       Pawn promotion (not implemented)
```

---

## Gameplay Example

Complete game sequence:

```
Turn 1 (White): e2-e4 (pawn advance)
Turn 2 (Black): e7-e5 (pawn advance)
Turn 3 (White): Nf3 (knight develops)
Turn 4 (Black): Nc6 (knight develops)
Turn 5 (White): Bc4 (bishop develops)
Turn 6 (Black): Bc5 (bishop develops)
Turn 7 (White): B+N→BN@f3 (combine bishop and knight)
Turn 8 (Black): d6 (pawn advance)
Turn 9 (White): BN@f3→N@f3,B@g4 (de-combine)
...
```

---

**Next**: Read [Component Guide](./05-COMPONENTS.md) to understand the UI implementation.
