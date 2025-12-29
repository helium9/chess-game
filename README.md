# P2P Chess - Multiplayer Chess with Hybrid Pieces

A modern, feature-rich chess application featuring real-time peer-to-peer multiplayer gameplay, AI opponents, and an innovative piece combination system. Built with Next.js and WebRTC technology.

**Play here:** [p2p-chess.tech](https://p2p-chess.tech) | [combinechess.games](https://combinechess.games)

**Developed by:** helim9 & mapcrafter2048

## Project Overview

This project implements a full-featured chess game that extends traditional chess with unique mechanics. Players can combine and decombine pieces to create powerful hybrid units, adding strategic depth to the classic game. The application supports multiple game modes including single-player practice, peer-to-peer multiplayer, and AI opponents with configurable difficulty levels.

## Features

### Core Gameplay

**Classic Chess Implementation**
- Complete standard chess rules including castling, en passant, pawn promotion, and check/checkmate detection
- Comprehensive move validation with legality checks
- Real-time game status detection (check, checkmate, stalemate)

**Hybrid Piece System**
- Combine adjacent pieces to create hybrid units with combined movement capabilities
  - Rook + Bishop → Rook-Bishop
  - Rook + Knight → Rook-Knight
  - Bishop + Knight → Bishop-Knight
  - Queen + Knight → Queen-Knight
- Decombine hybrid pieces back into their component parts
- Two-assignment legality checking ensures valid decombinations
- Cannot combine while in check or if it would leave the king in check

### Game Modes

**Single Player Mode**
- Practice mode for solo gameplay
- Undo and redo functionality
- Full move history tracking

**Peer-to-Peer Multiplayer**
- Real-time gameplay using WebRTC for direct peer-to-peer connections
- Firebase Firestore signaling for connection establishment
- Automatic reconnection with state synchronization
- Connection health monitoring with heartbeat system
- Graceful disconnection handling

**AI Engine Mode**
- Custom-built chess engine with alpha-beta pruning
- Three difficulty levels (Easy, Medium, Hard)
- Transposition tables for position caching
- Parallel search using Web Workers
- Configurable search depth and time limits

### Advanced Features

**Timer System**
- Multiple time control options
- Bullet: 1 minute
- Blitz: 3 minutes, 5 minutes
- Rapid: 10 minutes, 15 minutes, 30 minutes
- Automatic timeout detection and game termination

**User Interface**
- Responsive design for desktop and mobile devices
- Automatic board orientation for black player in multiplayer
- Visual feedback with highlighted legal moves
- Move history panel with notation
- Captured pieces display
- Game status indicators
- Rematch system for multiplayer games

## Technology Stack

**Frontend Framework**
- Next.js 16 with App Router
- React 19
- Tailwind CSS 4

**Real-time Communication**
- WebRTC for peer-to-peer connections
- Firebase Firestore for signaling
- Cloudflare TURN servers for NAT traversal

**AI Engine**
- Custom alpha-beta pruning algorithm
- Zobrist hashing for transposition tables
- Web Workers for parallel computation
- Position evaluation with piece-square tables

**Deployment**
- Vercel platform
- Environment-based configuration

## How to Play

### Basic Chess

1. Click on a piece to select it
2. Click on a highlighted square to move
3. The game automatically detects check, checkmate, and stalemate

### Combining Pieces

1. Click the "Combine" button to enter combine mode
2. Click on the first piece (anchor piece)
3. Click on an adjacent eligible piece
4. The pieces combine into a hybrid piece if the combination is legal

**Combination Rules:**
- Both pieces must belong to the current player
- Pieces must be adjacent (orthogonally or diagonally)
- Cannot combine while in check
- Cannot combine the King
- The combination must not leave your King in check

### Decombining Pieces

1. Click the "Decombine" button
2. Click on a hybrid piece
3. Click on an adjacent empty square
4. Confirm the decombination

**Decombination Rules:**
- Only hybrid pieces can be decombined
- Must have at least one empty adjacent square
- The decombination must be legal (cannot leave King in check)

### Multiplayer Games

**Hosting a Game:**
1. Click "Create Game" in the navigation bar
2. Share the connection ID with your opponent
3. Wait for them to join

**Joining a Game:**
1. Enter the connection ID provided by the host
2. Click "Join" in the navigation bar
3. The game will start automatically once both players are connected

## Project Structure

```
Chess-game/
├── src/
│   ├── ai/                    # AI engine implementation
│   │   ├── alphaBeta.js       # Main search algorithm
│   │   ├── evaluator.js       # Position evaluation
│   │   ├── TranspositionTable.js  # Move caching
│   │   └── WorkerManager.js   # Web Worker management
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   └── page.js            # Main game page
│   ├── components/             # React components
│   │   ├── ChessBoard.jsx     # Main board component
│   │   ├── hooks/             # Custom game hooks
│   │   └── ui/                # UI components
│   ├── config/                # Configuration files
│   │   ├── firebase.js        # Firebase setup
│   │   └── timerConfig.js     # Timer settings
│   ├── hooks/                 # Global hooks
│   │   └── useWebRTC.js       # WebRTC connection hook
│   ├── services/              # Services
│   │   └── WebRTCSignalingService.js  # WebRTC signaling
│   └── utils/                 # Utility functions
│       ├── combinationRules.js
│       ├── deCombinationRules.js
│       ├── gameState.js
│       └── moveValidation.js
├── docs/                       # Documentation
├── public/                     # Static assets
└── package.json
```

## Deployment

The application is deployed on Vercel and accessible at:
- [p2p-chess.tech](https://p2p-chess.tech)
- [combinechess.games](https://combinechess.games)

## Documentation

For detailed technical documentation, see:
- [Project Overview](./docs/overview.md)(In Progress) - Comprehensive project documentation and architecture

## Contributing

This is a collaborative project by helim9 and mapcrafter2048. Contributions and feedback are welcome.

## License

This project is open source and available under the MIT License.

## Acknowledgments

Built with modern web technologies:
- [Next.js](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [WebRTC](https://webrtc.org) - Real-time communication
- [Firebase](https://firebase.google.com) - Backend services

---

**Developed by helim9 & mapcrafter2048**
