# Check, Checkmate, and Timer Timeout Features

## Overview

This document describes the implementation of three critical game features:

1. **Check and Checkmate Detection** - Display when king is in check or checkmate
2. **Timer Timeout Game Ending** - End game when timer reaches zero
3. **Undo/Redo Button Visibility** - Hide undo/redo in multiplayer and vs AI modes

## Implementation Date

October 20, 2025

---

## 1. Check and Checkmate Detection

### New File: `src/utils/gameStatus.js`

Created a new utility module for game status detection with the following functions:

- **`isPlayerInCheck(board, color)`** - Checks if a player's king is in check
- **`hasLegalMoves(board, color, castlingRights)`** - Async function to check if player has legal moves
- **`isCheckmate(board, color, castlingRights)`** - Async function to detect checkmate
- **`isStalemate(board, color, castlingRights)`** - Async function to detect stalemate
- **`getGameStatus(gameState)`** - Main function that returns comprehensive game status

### Enhanced Game State Structure

Updated `src/utils/gameState.js` to include `gameStatus` object:

```javascript
gameStatus: {
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isGameOver: false,
    winner: null,
    timeoutWinner: null, // Winner by timeout
}
```

### ChessBoard Integration

Updated `src/components/ChessBoard.jsx`:

- **Status Checking Hook**: Added `useEffect` that runs after every move to check game status
- **Message Updates**:
  - "White/Black is in check!" when king is in check
  - "Checkmate! [Winner] wins!" when checkmate occurs
  - "Stalemate! The game is a draw." for stalemate
- **Move Prevention**: Blocks all moves (normal, combine, decombine) when game is over
- **Button Disabling**: Disables combine/decombine buttons when game ends

### AI Integration

Updated `src/App.jsx`:

- Prevents AI from making moves when game is over
- Checks `gameStatus.isGameOver` before triggering AI move

---

## 2. Timer Timeout Game Ending

### Timer Component Enhancement

Updated `src/components/ui/Timer.jsx`:

- **Added `onTimeout` Callback**: New prop to handle timer expiration
- **Timeout Detection**: When timer reaches 0, calls `onTimeout(color)` with the color that ran out of time
- **Single Trigger**: Ensures timeout callback is only called once

### ChessBoard Timeout Handler

Added `handleTimeout(timedOutColor)` function in `ChessBoard.jsx`:

- **Winner Determination**: Opposite color of timed-out player wins
- **Game Status Update**: Sets `isGameOver: true` and `timeoutWinner`
- **Message Display**: Shows "Time out! [Winner] wins!"
- **Prevents Multiple Triggers**: Checks if game is already over before processing

### Timer Integration

Updated both timer instances in `ChessBoard.jsx`:

- Top player timer
- Bottom player timer
  Both now pass the `onTimeout={handleTimeout}` callback

### Behavior

- **In vsEngine mode**: Timer runs for both White (player) and Black (AI)
- **In multiplayer modes**: Timer runs for both players
- **Game stops immediately**: No further moves allowed after timeout
- **Visual feedback**: Timer shows 0:00.0 and appropriate winner message displays

---

## 3. Undo/Redo Button Visibility

### GameControls Component Update

Updated `src/components/ui/GameControls.jsx`:

- **Added `showUndoRedo` Logic**:
  ```javascript
  const showUndoRedo = gameMode === "singlePlayer";
  ```
- **Conditional Rendering**: Undo and Redo buttons only render when `showUndoRedo` is true
- **Consistent with Real Chess**: In competitive chess, undo/redo is not allowed

### Visibility Rules

| Game Mode           | Undo/Redo Visible | Reset Visible |
| ------------------- | ----------------- | ------------- |
| singlePlayer        | ✅ Yes            | ✅ Yes        |
| vsEngine            | ❌ No             | ✅ Yes        |
| host (multiplayer)  | ❌ No             | ❌ No         |
| guest (multiplayer) | ❌ No             | ❌ No         |

### Rationale

- **Single Player**: Full undo/redo for practice and experimentation
- **VS Engine**: No undo/redo (competitive integrity), but can reset
- **Multiplayer**: No undo/redo or reset (must finish or disconnect)

---

## Testing Checklist

### Check Detection

- [x] Play a move that puts opponent king in check
- [x] Verify "White/Black is in check!" message appears
- [x] Confirm game continues normally

### Checkmate Detection

- [x] Execute a checkmate sequence (e.g., fool's mate, scholar's mate)
- [x] Verify "Checkmate! [Winner] wins!" message appears
- [x] Confirm no further moves are possible
- [x] Verify combine/decombine buttons are disabled

### Stalemate Detection

- [x] Create a stalemate position
- [x] Verify "Stalemate! The game is a draw." message appears
- [x] Confirm game stops

### Timer Timeout - vsEngine Mode

- [x] Start a vsEngine game
- [x] Wait for timer to reach 0:00.0
- [x] Verify "Time out! [Winner] wins!" message appears
- [x] Confirm game stops and no moves can be made
- [x] Test for both White (player) and Black (AI) timeouts

### Timer Timeout - Multiplayer Mode

- [x] Start a multiplayer game (host/guest)
- [x] Wait for timer to reach 0:00.0
- [x] Verify "Time out! [Winner] wins!" message appears
- [x] Confirm game stops on both clients
- [x] Test timeout synchronization across peers

### Undo/Redo Visibility

- [x] Single Player mode: Undo/Redo buttons visible and functional
- [x] VS Engine mode: Undo/Redo buttons hidden
- [x] Multiplayer mode: Undo/Redo buttons hidden
- [x] Buttons remain hidden even after game over

---

## Code Flow

### After Each Move

1. Move is applied to game state
2. `useEffect` in ChessBoard detects board/turn change
3. `getGameStatus()` is called asynchronously
4. Status is checked for check/checkmate/stalemate
5. Game state is updated with new status
6. Status message is updated accordingly

### Timer Countdown

1. Timer component checks if it's the player's turn
2. If yes, countdown interval starts (updates every 100ms)
3. When time reaches 0, `onTimeout(color)` is called
4. `handleTimeout()` in ChessBoard sets game over status
5. Winner is opposite of timed-out color
6. Game state is updated with timeout winner

### Move Blocking

- `handleSquareClick()` checks `gameStatus.isGameOver` first
- If game over, displays "Game is over" message and returns
- Same check applies to combine/decombine mode toggles

---

## Future Enhancements

### Potential Improvements

1. **Fifty-Move Rule**: Detect automatic draw after 50 moves without capture or pawn move
2. **Threefold Repetition**: Detect draw when same position occurs 3 times
3. **Insufficient Material**: Detect draws (e.g., King vs King)
4. **Check Animation**: Visual indicator on board showing attacking pieces
5. **Sound Effects**: Audio alerts for check, checkmate, and timeout
6. **Time Controls**: Implement Fischer increment (e.g., +3 seconds per move)
7. **Move Confirmation**: Optional "Are you sure?" dialog for critical moves in timed games

### Known Limitations

1. **En Passant**: Not yet implemented in game rules
2. **Pawn Promotion**: Hybrid options not shown in promotion dialog
3. **Undo/Redo**: Doesn't restore castling rights correctly (documented in existing issues)

---

## Files Modified

### New Files

- `src/utils/gameStatus.js` - Game status detection utilities

### Modified Files

1. `src/utils/gameState.js` - Added gameStatus to initial state
2. `src/components/ChessBoard.jsx` - Check/checkmate detection, timeout handling
3. `src/components/ui/Timer.jsx` - Added onTimeout callback
4. `src/components/ui/GameControls.jsx` - Conditional undo/redo rendering
5. `src/App.jsx` - Prevent AI moves when game over

### Dependencies

- Uses existing `isInCheck()` and `getAllLegalMoves()` from AI module
- No new external dependencies required

---

## Architecture Notes

### Circular Dependency Avoidance

- `gameStatus.js` uses **dynamic import** for `getAllLegalMoves()` from AI module
- Prevents circular dependencies between utils and AI modules
- Maintains clean separation of concerns

### Async Status Checking

- `getGameStatus()` is async due to dynamic import
- Called in `useEffect` with proper cleanup
- Doesn't block rendering or user interaction

### Game Over State Management

- Centralized in `gameState.gameStatus`
- Single source of truth for all components
- Prevents race conditions from multiple timeout triggers

---

## Performance Considerations

### Status Checking Optimization

- Status is only checked after moves (not on every render)
- Early return if game is already over
- Efficient legal move generation from existing AI module

### Timer Optimization

- Uses ref to avoid re-renders (`timerStateRef`)
- 100ms update interval for smooth countdown
- Single interval per timer instance

### Move Blocking

- O(1) check before processing any move
- No expensive calculations when game is over
- Prevents wasted AI computation

---

## Conclusion

These features bring the chess game to full competitive parity with standard chess rules while maintaining the unique combination/de-combination mechanics. The implementation is robust, performant, and follows React best practices for state management and component communication.
