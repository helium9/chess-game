# ♟️ Interactive Chess Game

A fully playable chess game built with React, Tailwind CSS, and Vite. Features complete chess rules implementation, legal move highlighting, check detection, and move validation.

![Chess Game](https://img.shields.io/badge/React-19.1-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Vite](https://img.shields.io/badge/Vite-7.1-646cff)

## ✨ Features

### Complete Chess Rules
- ♟️ **Pawn**: Forward movement, two-square start option, diagonal captures
- ♜ **Rook**: Horizontal and vertical movement
- ♞ **Knight**: L-shaped jumps over other pieces
- ♝ **Bishop**: Diagonal movement
- ♕ **Queen**: Combination of rook and bishop movements
- ♔ **King**: One square in any direction

### Interactive Gameplay
- ✅ Click-to-select piece interaction
- ✅ Legal moves highlighted in green
- ✅ Selected piece highlighted in yellow
- ✅ Visual feedback for all actions
- ✅ Automatic turn switching
- ✅ Move validation and enforcement

### Game Logic
- ✅ Turn management (White starts)
- ✅ Piece capture tracking for both sides
- ✅ Complete move history
- ✅ Path blocking detection
- ✅ Prevents illegal moves that would put king in check
- ✅ Check detection with warnings
- ✅ Proper piece movement validation

### User Interface
- 🎨 Beautiful Unicode chess pieces (♔ ♕ ♖ ♗ ♘ ♙)
- 🎨 Captured pieces display
- 🎨 Status messages and turn indicators
- 🎨 Reset game functionality
- 🎨 Responsive design
- 🎨 Color-coded board squares
- 🎨 Board coordinate labels (a-h)
- 🎨 Interactive legend

## 🚀 Quick Start

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

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## 🎮 How to Play

1. **Select a piece**: Click on any piece of the current player's color
   - Selected piece will be highlighted in yellow
   - All legal moves will be shown as green squares

2. **Move the piece**: Click on any highlighted green square
   - The piece will move to that position
   - If capturing, the opponent's piece will be removed
   - Turn automatically switches to the other player

3. **Game rules**:
   - White moves first
   - You can only move your own pieces
   - You cannot move into check
   - Captured pieces are displayed on the sides
   - The game warns you when a king is in check

4. **Reset game**: Click the "Reset Game" button to start over

## 📁 Project Structure

```
chess-game/
├── src/
│   ├── components/
│   │   └── ChessBoard.jsx      # Main game component
│   ├── utils/
│   │   ├── constants.js         # Chess constants and helpers
│   │   ├── moveValidation.js    # Move validation rules
│   │   ├── moveCalculator.js    # Legal move calculation
│   │   └── gameState.js         # Game state management
│   ├── App.jsx                  # App wrapper
│   ├── main.jsx                 # React entry point
│   └── index.css                # Tailwind styles
├── public/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── eslint.config.js
```

## 🏗️ Architecture

### Clean Code Organization

The project follows a modular architecture with clear separation of concerns:

1. **`constants.js`**: Chess piece types, colors, symbols, and utility functions
2. **`moveValidation.js`**: Core logic for validating moves per piece type
3. **`moveCalculator.js`**: Calculates all legal moves and handles check detection
4. **`gameState.js`**: Manages game state, turns, and move history
5. **`ChessBoard.jsx`**: UI component handling user interactions

### Key Design Principles

- **Separation of Concerns**: Logic separated from UI
- **Pure Functions**: Most utility functions are pure for predictability
- **Immutability**: Game state updates create new objects
- **Modular**: Each file has a single, clear responsibility

## 🛠️ Tech Stack

- **React 19** - UI framework with React Compiler
- **Vite 7** - Fast build tool and dev server
- **Tailwind CSS 3** - Utility-first styling
- **ESLint** - Code quality and consistency

## 🎯 Future Enhancements

Potential features to add:

- [ ] Checkmate detection
- [ ] Stalemate detection
- [ ] En passant capture
- [ ] Castling
- [ ] Pawn promotion
- [ ] Move timer
- [ ] Undo/Redo moves
- [ ] Save/Load game state
- [ ] Player vs AI
- [ ] Multiplayer support
- [ ] Move notation display (algebraic notation)
- [ ] Game replay

## 🧪 Development

```bash
# Run linter
npm run lint

# Run dev server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📝 License

MIT License - feel free to use this project for learning or as a starting point for your own chess game!

## 👤 Author

**Aadish Jain**
- GitHub: [@mapcrafter2048](https://github.com/mapcrafter2048)
- Location: Indore, India
- Student at IIT Indore (Computer Science Engineering)

## 🙏 Acknowledgments

- Chess piece Unicode symbols
- React team for React 19 and React Compiler
- Tailwind CSS for amazing utility classes
- Vite for blazing fast development experience

---

**Enjoy playing chess! ♟️**
