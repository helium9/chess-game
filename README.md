# ♟️ Chess Fusion

<div align="center">

![React](https://img.shields.io/badge/React-19.1.1-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-7.1.7-646CFF?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.18-38B2AC?style=for-the-badge&logo=tailwind-css)

**A unique chess variant where pieces can combine and split**

**🎮 [Play Now](https://p2p-chess.vercel.app/)**

</div>

---

## About

Chess Fusion is a chess variant that introduces **piece combination mechanics**. Combine your Rook and Bishop into a powerful hybrid that moves like both pieces, then strategically split them when needed. Play solo, against an AI, or challenge friends in real-time multiplayer.

---

## Features

### Piece Combinations

- Merge compatible pieces into powerful hybrids (Rook+Bishop, Rook+Knight, Bishop+Knight, Queen+Knight)
- Hybrids move like both component pieces
- Split hybrids back into separate pieces strategically

### Game Modes

- **Single Player** - Practice and experiment with combinations
- **vs AI** - Play against AI with three difficulty levels (Easy, Medium, Hard)
- **Multiplayer** - Real-time peer-to-peer gameplay via WebRTC

### Chess Features

- Complete chess rules (castling, pawn promotion, check/checkmate)
- Legal move validation and highlighting
- Move history with undo/redo
- Game timer
- Captured pieces display

### AI Engine

- Alpha-beta pruning algorithm with move ordering
- Transposition table using Zobrist hashing
- Piece-square table evaluation
- Understands all combination mechanics

### Multiplayer

- WebRTC peer-to-peer connection
- Firebase Firestore signaling
- Real-time game state synchronization
- Automatic reconnection support

---

## How Combinations Work

**Allowed Combinations:**

- Rook + Bishop → RB (moves like both)
- Rook + Knight → RN (moves like both)
- Bishop + Knight → BN (moves like both)
- Queen + Knight → QN (moves like both)

**Rules:**

- Both pieces must be the same color
- Cannot combine Pawns, Kings, or existing hybrids
- One piece must legally reach the other's square
- Cannot leave your King in check

**De-combination:**

- Split hybrids back into component pieces
- Components spawn on adjacent empty squares
- Must not leave King in check

---

## Getting Started

### Prerequisites

- Node.js 16+
- Firebase account (for multiplayer)

### Installation

```bash
# Clone the repository
git clone https://github.com/mapcrafter2048/chess-game.git
cd chess-game

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173`

### Build

```bash
npm run build    # Production build
npm run preview  # Preview build
```

---

## Tech Stack

- **React** 19.1.1 - UI framework
- **Vite** 7.1.7 - Build tool
- **Tailwind CSS** 3.4.18 - Styling
- **WebRTC** - Peer-to-peer multiplayer
- **Firebase Firestore** - Signaling for multiplayer
- **Azure + Coturn** - TURN server for NAT traversal
- **Custom AI Engine** - Alpha-beta pruning with transposition tables

---

## Project Structure

```
src/
├── ai/                    # AI engine (alpha-beta, evaluation, zobrist hashing)
├── components/
│   ├── ChessBoard.jsx    # Main game board
│   ├── hooks/            # Custom React hooks
│   ├── ui/               # UI components
│   └── helpers/          # UI helper functions
├── utils/                # Game logic (moves, combinations, validation)
├── services/             # WebRTC signaling
└── config/               # Firebase configuration
```

---

## Multiplayer Setup

### Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Update `src/config/firebase.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### TURN Server (Azure + Coturn)

For reliable connections across NATs and firewalls, the project uses Coturn TURN server on Azure VM.

**Setup:**

1. Create Azure VM (Ubuntu 22.04)
2. Install Coturn: `sudo apt install coturn`
3. Configure `/etc/turnserver.conf`:
   ```conf
   listening-port=3478
   fingerprint
   lt-cred-mech
   user=username:password
   realm=yourdomain.com
   ```
4. Add credentials to `.env`:
   ```env
   VITE_TURN_SERVER_URL=your-azure-vm-ip:3478
   VITE_TURN_SERVER_USERNAME=username
   VITE_TURN_SERVER_CREDENTIAL=password
   ```

---

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
```

---

## Author

**mapcrafter2048**
**helium9**

- GitHub: [@mapcrafter2048](https://github.com/mapcrafter2048) [@helium9](https://github.com/helium9)
- Live App: [p2p-chess.vercel.app](https://p2p-chess.vercel.app/)

---

<div align="center">

Made with ❤️ and ♟️

</div>
