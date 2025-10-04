# Chess Piece Combination POC

A minimal chess-like UI prototype for experimenting with piece-combination mechanics. This is a frontend-only, serverless POC with clean, modular architecture.

## Features

✅ **8×8 Interactive Board** with labeled pieces  
✅ **JSON-Driven State** - Edit pieces via textarea  
✅ **Queen-Like Movement** - Mock movement in 8 directions  
✅ **Piece Merging** - Combine adjacent friendly pieces  
✅ **Piece Splitting** - Decombine merged pieces  
✅ **Input Validation** - Bounds checking and error handling  
✅ **Clean Architecture** - Logic separated into utility modules  

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

## How to Use

### Basic Operations

1. **Select a piece**: Click on any piece to select it
   - Blue ring appears around selected piece
   - Green dots show valid moves (queen-like pattern)

2. **Move a piece**: Click on any green dot to move there

3. **Merge pieces**: 
   - Select a piece
   - Adjacent friendly pieces will show a "Merge" button
   - Click "Merge" to combine them into one piece
   - Merged pieces have a purple border

4. **Decombine pieces**:
   - Select a combined piece (purple border)
   - Click the "Decombine" button
   - Piece splits back into two original pieces

5. **Edit JSON**: 
   - Modify the textarea on the right to add/remove/change pieces
   - Board updates automatically when JSON changes
   - Validation errors are shown below textarea

### JSON Format

```json
[
  {
    "id": "w-rook-1",
    "team": "white",
    "type": "rook",
    "pos": { "x": 0, "y": 0 },
    "isCombined": false,
    "combinedOf": ["id1", "id2"]
  }
]
```

**Required Fields**:
- `id`: Unique identifier (string)
- `team`: "white" or "black"
- `type`: Piece type (string, e.g., "rook", "knight")
- `pos`: Position object with `x` and `y` (0-7)

**Optional Fields**:
- `isCombined`: Boolean, true if this is a combined piece
- `combinedOf`: Array of original piece IDs (for combined pieces)
- `flags`: Object with `frozen`, `canCombine`, `canDecombine` flags
- `meta`: Free-form object for future engine info

## Code Architecture

### Project Structure

```
src/
├── components/
│   └── ChessBoard.jsx      # Main UI component
├── utils/
│   ├── boardUtils.js       # Board calculations
│   ├── pieceUtils.js       # Merge/split logic
│   └── validation.js       # Input validation
├── App.jsx
└── main.jsx
```

### Key Design Principles

1. **Separation of Concerns**: UI component only handles rendering; logic is in utilities
2. **Immutable Operations**: All functions return new arrays/objects
3. **Pure Functions**: Utilities have no side effects
4. **Explicit Validation**: All inputs validated with detailed errors
5. **Deterministic IDs**: Combined pieces have sorted IDs for consistency

See [CODE_STRUCTURE.md](./CODE_STRUCTURE.md) for detailed documentation.

## Rules & Mechanics

### Merge Rules

Two pieces can merge if:
- ✅ Same team (white + white or black + black)
- ✅ Adjacent (8-way adjacency: orthogonal + diagonal)
- ✅ Neither piece is already combined
- ✅ Neither piece is frozen

**Result**: New combined piece with:
- Deterministic ID: `cmb_<id1>__<id2>` (sorted)
- Combined type: `"rook+bishop"`
- Purple border to indicate combined status
- Position of the primary (selected) piece

### Decombine Rules

A combined piece can split if:
- ✅ It's a combined piece (`isCombined: true`)
- ✅ Not frozen
- ✅ Has at least one adjacent empty square

**Result**: Two original pieces restored:
- One at current position
- Other in adjacent empty square
- Original IDs and types preserved

### Movement

- All pieces move like queens (mock behavior)
- 8 directions: horizontal, vertical, and diagonal
- Extends to board edge
- **Blockers are ignored** (this is a POC; real collision detection comes later)

## Validation

The app validates:

- ✅ JSON syntax and structure
- ✅ Position bounds (x, y must be 0-7)
- ✅ Required fields (id, team, type, pos)
- ✅ Valid team values ("white" or "black")
- ✅ Proper data types

Errors are displayed below the JSON textarea with specific details.

## Future Extensions

This POC is designed to support:

- **Real move generation**: Replace `calculateQueenMoves()` with piece-specific logic
- **Collision detection**: Add blocker checking in move validation
- **Turn enforcement**: Use the `turn` field for gameplay
- **Networking**: Add WebRTC sync layer (UI remains unchanged)
- **Custom rules**: Extend validation and merge logic in utilities
- **Advanced cooldowns**: Use `flags.frozen` and `meta.cooldownRemaining`

## Development

```bash
# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **ESLint** - Code linting

## Contributing

This is a POC for experimentation. To add new features:

1. **New movement patterns**: Edit `src/utils/boardUtils.js`
2. **New merge rules**: Edit `src/utils/pieceUtils.js`
3. **New validations**: Edit `src/utils/validation.js`
4. **UI changes**: Edit `src/components/ChessBoard.jsx`

Keep logic in utilities and UI in components!

## License

MIT

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
