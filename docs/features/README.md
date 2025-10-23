# Game Features Documentation

This directory contains documentation for specific game features implemented in the Chess Piece Combination Game.

## Available Features

### Timer & Game Modes

- **[Timer and Board Orientation](./timer-and-board-orientation.md)** - Chess timer and automatic board flip functionality
- **[Game Mode Selection](./game-mode-selection.md)** - Normal vs Timed mode system
- **[Timer Implementation](./timer-implementation.md)** - Technical details of timer implementation

### Game End Conditions

- **[Check, Checkmate & Timer](./check-checkmate-timer.md)** - Game ending conditions and status detection

## Feature Categories

### ⏱️ Timer Features

The game includes a comprehensive timer system for competitive play:

- 10-minute default time control
- Real-time countdown for active player
- Visual warnings (yellow < 1 min, red when expired)
- Automatic game end on timeout
- Pause/resume functionality

### 🎮 Game Modes

Two distinct play modes:

- **Normal Mode**: Unlimited time, undo/redo available, casual play
- **Timed Mode**: Time pressure, no undo/redo, competitive play

### 🔄 Board Orientation

Automatic board flip feature:

- Board rotates based on current turn
- Active player always sees their pieces at bottom
- Seamless coordinate mapping
- File/rank labels update automatically

### ✅ Game End Detection

Multiple ways to end the game:

- Checkmate detection
- Stalemate detection
- Time expiration
- Resignation (manual)

## Implementation Notes

All features are designed to:

- Work in both single-player and multiplayer modes
- Preserve existing game mechanics (combinations, promotions, etc.)
- Maintain clean separation of concerns
- Follow React best practices

## Related Documentation

- [Core Systems](../03-CORE-SYSTEMS.md) - Underlying game state management
- [Game Mechanics](../04-GAME-MECHANICS.md) - Chess rules and piece combinations
- [Developer Guide](../development/developer-guide.md) - Contributing new features

---

[← Back to Documentation Index](../00-INDEX.md)
