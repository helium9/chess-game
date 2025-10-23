# Chess Piece Combination Game - Documentation Index

Welcome to the comprehensive documentation for the Chess Piece Combination Game. This unique chess variant introduces piece combination mechanics, multiplayer via WebRTC, and AI opponents.

---

## 📚 Quick Navigation

### **Getting Started**

- [Project Overview](./01-PROJECT-OVERVIEW.md) - Introduction, features, and goals
- [Developer Guide](./development/developer-guide.md) - Setup and contribution guidelines

### **Core Documentation**

- [System Architecture](./architecture/system-architecture.md) - Design patterns and structure
- [Core Systems](./03-CORE-SYSTEMS.md) - GameState, Actions, History, and Engine
- [Game Mechanics](./04-GAME-MECHANICS.md) - Rules, combinations, and movements

### **Features**

- [Timer & Board Orientation](./features/timer-and-board-orientation.md) - Chess timer and auto-flip board
- [Game Mode Selection](./features/game-mode-selection.md) - Normal vs Timed modes
- [Timer Implementation](./features/timer-implementation.md) - Technical timer details
- [Check, Checkmate & Timer](./features/check-checkmate-timer.md) - Game ending conditions

### **AI Engine**

- [Quick Start Guide](./ai/quick-start.md) - Test and use the AI
- [Implementation Summary](./ai/implementation-summary.md) - AI overview and features
- [Difficulty Selector](./ai/difficulty-selector.md) - AI difficulty levels
- [Parallel Search Architecture](./ai/parallel-search-architecture.md) - Multi-threading design
- [Phase 2 Optimization Plan](./ai/phase-2-optimization-plan.md) - Performance roadmap

#### Phase 2A - Transposition Tables

- [Implementation](./ai/phase-2a-implementation.md) - TT and Zobrist hashing
- [Debugging Summary](./ai/phase-2a-debugging.md) - TT bug fixes

#### Phase 2B - Web Workers

- [Bug Fix](./ai/phase-2b-bug-fix.md) - Worker communication fixes
- [Enhanced Logging](./ai/phase-2b-enhanced-logging.md) - Debug improvements
- [Load Balancing](./ai/phase-2b-load-balancing.md) - Worker distribution
- [Pipeline Verification](./ai/phase-2b-pipeline-verification.md) - Integration testing
- [TT Stats Fix](./ai/phase-2b-tt-stats-fix.md) - Statistics improvements
- [Multithreading Tests](./ai/testing-multithreading.md) - Worker testing guide

### **Multiplayer (WebRTC)**

- [Reconnection Architecture](./webrtc/reconnection-architecture.md) - P2P connection handling
- [Disconnection Debugging](./webrtc/disconnection-debugging.md) - Connection troubleshooting

### **Architecture**

- [System Architecture](./architecture/system-architecture.md) - Overall system design
- [Code Duplication Rationale](./architecture/code-duplication-rationale.md) - Design decisions

### **Development**

- [Developer Guide](./development/developer-guide.md) - Setup, workflow, and guidelines
- [Known Issues](./07-ISSUES-AND-BUGS.md) - Current bugs and limitations
- [Improvements](./08-IMPROVEMENTS.md) - Future enhancements

---

## 🎯 Recommended Reading Path

### **For New Developers**

1. [Project Overview](./01-PROJECT-OVERVIEW.md)
2. [Game Mechanics](./04-GAME-MECHANICS.md)
3. [System Architecture](./architecture/system-architecture.md)
4. [Developer Guide](./development/developer-guide.md)

### **For AI Development**

1. [AI Quick Start](./ai/quick-start.md)
2. [Implementation Summary](./ai/implementation-summary.md)
3. [Parallel Search Architecture](./ai/parallel-search-architecture.md)
4. [Phase 2 Optimization Plan](./ai/phase-2-optimization-plan.md)

### **For Multiplayer Development**

1. [WebRTC Reconnection Architecture](./webrtc/reconnection-architecture.md)
2. [Disconnection Debugging](./webrtc/disconnection-debugging.md)
3. [System Architecture](./architecture/system-architecture.md)

### **For Feature Development**

1. [Core Systems](./03-CORE-SYSTEMS.md)
2. [Game Mechanics](./04-GAME-MECHANICS.md)
3. [Known Issues](./07-ISSUES-AND-BUGS.md)
4. [Improvements](./08-IMPROVEMENTS.md)

---

## 📂 Documentation Structure

```
docs/
├── 00-INDEX.md                    # This file - navigation guide
├── 01-PROJECT-OVERVIEW.md         # High-level project introduction
├── 03-CORE-SYSTEMS.md             # Core game systems
├── 04-GAME-MECHANICS.md           # Game rules and mechanics
├── 07-ISSUES-AND-BUGS.md          # Known issues
├── 08-IMPROVEMENTS.md             # Future improvements
├── README.md                      # Documentation overview
│
├── features/                      # Feature documentation
│   ├── timer-and-board-orientation.md
│   ├── game-mode-selection.md
│   ├── timer-implementation.md
│   └── check-checkmate-timer.md
│
├── ai/                           # AI engine documentation
│   ├── quick-start.md
│   ├── implementation-summary.md
│   ├── difficulty-selector.md
│   ├── parallel-search-architecture.md
│   ├── phase-2-optimization-plan.md
│   ├── phase-2a-implementation.md
│   ├── phase-2a-debugging.md
│   ├── phase-2b-bug-fix.md
│   ├── phase-2b-enhanced-logging.md
│   ├── phase-2b-load-balancing.md
│   ├── phase-2b-pipeline-verification.md
│   ├── phase-2b-tt-stats-fix.md
│   └── testing-multithreading.md
│
├── webrtc/                       # WebRTC multiplayer docs
│   ├── reconnection-architecture.md
│   └── disconnection-debugging.md
│
├── architecture/                 # Architecture documentation
│   ├── system-architecture.md
│   └── code-duplication-rationale.md
│
└── development/                  # Development guides
    └── developer-guide.md
```

---

## 🔑 Key Concepts

### **Piece Combinations**

Merge chess pieces to create powerful hybrids:

- Rook + Bishop = Queen-like movement
- Rook + Knight = L-shaped + straight movement
- Bishop + Knight = L-shaped + diagonal movement
- Queen + Knight = Enhanced queen

### **Game Modes**

- **Single Player**: Practice with unlimited time and undo/redo
- **Timed Mode**: Competitive play with 10-minute timer
- **Multiplayer**: P2P connection via WebRTC
- **vs AI**: Play against AI engine (Easy/Medium/Hard)

### **AI Engine**

- Alpha-beta pruning with move ordering
- Transposition tables with Zobrist hashing
- Web worker parallelization for performance
- Multiple difficulty levels (depth 2/4/6)

### **WebRTC Multiplayer**

- Peer-to-peer connection (no server needed)
- Firebase Firestore for signaling
- Automatic reconnection (up to 3 attempts)
- Real-time game state synchronization

---

## 📊 Project Status

- **Version**: 0.0.0 (Active Development)
- **Last Updated**: October 2025
- **Branch**: engine
- **Language**: JavaScript (React)
- **License**: Private

---

## 🛠️ Technology Stack

- **Frontend**: React 19.1.1
- **Build Tool**: Vite 7.1.7
- **Styling**: Tailwind CSS 3.4.18
- **P2P**: WebRTC + Firebase
- **AI**: Custom Alpha-Beta with Web Workers

---

## 💡 Getting Help

- **Bug Reports**: See [Known Issues](./07-ISSUES-AND-BUGS.md)
- **Feature Requests**: See [Improvements](./08-IMPROVEMENTS.md)
- **Development Help**: See [Developer Guide](./development/developer-guide.md)
- **AI Questions**: See [AI Quick Start](./ai/quick-start.md)
- **WebRTC Issues**: See [WebRTC Debugging](./webrtc/disconnection-debugging.md)

---

## 🤝 Contributing

This project is in active development. Before contributing:

1. Read the [Developer Guide](./development/developer-guide.md)
2. Review [Known Issues](./07-ISSUES-AND-BUGS.md)
3. Check [Improvements Roadmap](./08-IMPROVEMENTS.md)

---

**Note**: This is a proof-of-concept project exploring unique chess mechanics with advanced features like piece combination, AI opponents, and real-time multiplayer.
