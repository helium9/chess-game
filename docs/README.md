# Chess Piece Combination Game - Complete Documentation

Welcome to the comprehensive documentation for the Chess Piece Combination Game project. This is a unique chess variant that introduces piece combination mechanics, allowing players to merge and split pieces during gameplay.

## 📖 Start Here

**→ [Complete Documentation Index](./00-INDEX.md)** - Organized navigation guide

## Core Documentation

1. **[Project Overview](./01-PROJECT-OVERVIEW.md)** - High-level introduction, features, and project goals
2. **[System Architecture](./architecture/system-architecture.md)** - System design, patterns, and structure
3. **[Core Systems](./03-CORE-SYSTEMS.md)** - GameState, Action, History, and Engine
4. **[Game Mechanics](./04-GAME-MECHANICS.md)** - Rules, combinations, movements, and gameplay
5. **[Known Issues & Bugs](./07-ISSUES-AND-BUGS.md)** - Current bugs and limitations
6. **[Improvement Roadmap](./08-IMPROVEMENTS.md)** - Scope for enhancements and features
7. **[Developer Guide](./development/developer-guide.md)** - Setup, workflow, and contribution guidelines

## 📂 Documentation Organization

Documentation is now organized by category for easier navigation:

- **`features/`** - Game features (timer, game modes, etc.)
- **`ai/`** - AI engine documentation and optimization
- **`webrtc/`** - Multiplayer networking documentation
- **`architecture/`** - System design and architecture
- **`development/`** - Developer guides and workflows

## Quick Start for New Developers

If you're new to this project, we recommend reading in this order:

1. Start with **[Project Overview](./01-PROJECT-OVERVIEW.md)** to understand what the game does
2. Read **[Game Mechanics](./04-GAME-MECHANICS.md)** to understand the unique combination rules
3. Review **[System Architecture](./architecture/system-architecture.md)** to understand the codebase structure
4. Check **[Known Issues](./07-ISSUES-AND-BUGS.md)** to be aware of current limitations
5. Refer to **[Developer Guide](./development/developer-guide.md)** when ready to contribute

## Project Status

- **Status**: Active Development / Proof of Concept
- **Version**: 0.0.0
- **Last Updated**: October 2025
- **Primary Language**: JavaScript (React)
- **License**: Private

## Technology Stack

- **Frontend Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.7
- **Styling**: Tailwind CSS 3.4.18
- **State Management**: React Hooks (local state)
- **Chess Logic**: Custom implementation

## Project Structure

```
my-tailwind-app/
├── src/
│   ├── components/          # React UI components
│   │   ├── ChessBoard.jsx   # Main game board component
│   │   ├── hooks/           # Custom React hooks
│   │   ├── helpers/         # UI helper functions
│   │   └── ui/              # Reusable UI components
│   ├── core/                # Core game engine
│   │   ├── GameState.js     # Game state management
│   │   ├── Action.js        # Action/command system
│   │   ├── History.js       # Undo/redo system
│   │   ├── EngineInterface.js # Game engine
│   │   └── PositionKey.js   # Position hashing
│   ├── utils/               # Utility functions
│   │   ├── constants.js     # Game constants
│   │   ├── moveCalculator.js # Move generation
│   │   ├── moveValidation.js # Move validation
│   │   ├── combinationRules.js # Piece combination
│   │   └── deCombinationRules.js # Piece splitting
│   ├── network/             # Network sync (future)
│   ├── tests/               # Test files (empty)
│   └── App.jsx              # Main app component
├── docs/                    # Documentation (this folder)
├── public/                  # Static assets
└── [config files]           # Vite, Tailwind, ESLint configs
```

## Key Concepts

### Piece Combinations

This game allows certain chess pieces to merge together, creating hybrid pieces with combined movement abilities:

- **Rook + Bishop** = Rook-Bishop (moves like Queen)
- **Rook + Knight** = Rook-Knight
- **Bishop + Knight** = Bishop-Knight
- **Queen + Knight** = Queen-Knight

### Game Modes

1. **Normal Mode**: Standard piece movement and capture
2. **Combine Mode**: Select two adjacent pieces to merge them
3. **De-combine Mode**: Split a hybrid piece back into its components

## Getting Help

- **Bug Reports**: See [Known Issues](./07-ISSUES-AND-BUGS.md)
- **Feature Requests**: See [Improvement Roadmap](./08-IMPROVEMENTS.md)
- **Development Questions**: See [Developer Guide](./development/developer-guide.md)
- **AI Questions**: See [AI Quick Start](./ai/quick-start.md)
- **WebRTC Issues**: See [WebRTC Debugging](./webrtc/disconnection-debugging.md)

## Contributing

This project is in active development. Before contributing:

1. Read the [Developer Guide](./development/developer-guide.md)
2. Check [Known Issues](./07-ISSUES-AND-BUGS.md) for current bugs
3. Review [Improvement Roadmap](./08-IMPROVEMENTS.md) for planned features

---

**Note**: This is a proof-of-concept project exploring unique chess mechanics with advanced features like piece combination, AI opponents, and real-time multiplayer. The codebase is designed for experimentation and may contain incomplete features or known issues.

For complete navigation, see **[Documentation Index](./00-INDEX.md)**.
