# Developer Guide

This guide helps new developers set up the project, understand the workflow, and start contributing.

## Prerequisites

### Required Software

- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+ (comes with Node.js)
- **Git**: v2.30+
- **Code Editor**: VS Code recommended

### Recommended VS Code Extensions

- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: CSS autocomplete
- **ES7+ React Snippets**: React shortcuts
- **GitLens**: Git visualization

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/mapcrafter2048/chess-game.git
cd chess-game
```

### 2. Install Dependencies

```bash
npm install
```

This installs:

- React 19.1.1
- Vite 7.1.7
- Tailwind CSS 3.4.18
- ESLint and other dev tools

### 3. Start Development Server

```bash
npm run dev
```

Opens at `http://localhost:5173`

**Expected Output**:

```
VITE v7.1.7  ready in 234 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.10:5173/
➜  press h + enter to show help
```

### 4. Verify Setup

1. Open browser to `http://localhost:5173`
2. You should see the chess board
3. Try moving a piece (white pawn forward)
4. Check browser console for errors (should be none)

---

## Project Scripts

```json
{
  "dev": "vite", // Start dev server
  "build": "vite build", // Build for production
  "lint": "eslint .", // Run linter
  "preview": "vite preview" // Preview production build
}
```

### Common Commands

```bash
# Development
npm run dev                 # Start dev server (hot reload)
npm run build              # Build for production
npm run preview            # Preview production build

# Code Quality
npm run lint               # Check for lint errors
npm run lint -- --fix      # Auto-fix lint errors

# Future commands (add these)
npm test                   # Run tests
npm run test:watch        # Watch mode tests
npm run format            # Format with Prettier
```

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/my-new-feature
```

**Branch Naming**:

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes
- `test/` - Adding tests

### 2. Make Changes

Edit files in `src/`:

```bash
# Example: Add new component
touch src/components/ui/MyNewComponent.jsx
```

### 3. Test Locally

```bash
npm run dev
# Verify changes in browser
# Check console for errors
```

### 4. Run Linter

```bash
npm run lint
# Fix any errors
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

**Commit Message Format**:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `style`: Code style (formatting)
- `test`: Adding tests
- `chore`: Build process, dependencies

**Examples**:

```bash
git commit -m "feat: add move animation"
git commit -m "fix: resolve checkmate detection bug"
git commit -m "refactor: extract ChessSquare component"
git commit -m "docs: update README with setup instructions"
```

### 6. Push to Remote

```bash
git push origin feature/my-new-feature
```

### 7. Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Fill in PR template (if exists)
5. Request review

---

## Code Style Guidelines

### JavaScript/React

#### Naming Conventions

```javascript
// Components: PascalCase
function ChessBoard() {}

// Functions: camelCase
function calculateLegalMoves() {}

// Constants: UPPER_SNAKE_CASE
const MAX_BOARD_SIZE = 8;

// Variables: camelCase
const currentTurn = "white";

// Private/internal: _prefixed (if needed)
const _internalHelper = () => {};
```

#### File Naming

```
# Components: PascalCase
ChessBoard.jsx
ChessSquare.jsx

# Utilities: camelCase
moveCalculator.js
combinationRules.js

# Constants: camelCase (or lowercase)
constants.js
gameState.js
```

#### Component Structure

```javascript
// 1. Imports
import React, { useState, useEffect } from "react";
import { someUtil } from "../utils/someUtil";

// 2. Constants (if any)
const DEFAULT_VALUE = 10;

// 3. Component
function MyComponent({ prop1, prop2 }) {
  // 3a. State hooks
  const [state, setState] = useState(initial);

  // 3b. Effect hooks
  useEffect(() => {
    // ...
  }, [dependencies]);

  // 3c. Event handlers
  const handleClick = () => {
    // ...
  };

  // 3d. Computed values
  const computedValue = useMemo(() => {
    // ...
  }, [deps]);

  // 3e. Render
  return <div>{/* JSX */}</div>;
}

// 4. PropTypes (if using)
MyComponent.propTypes = {
  // ...
};

// 5. Export
export default MyComponent;
```

#### JSX Formatting

```javascript
// Short props: single line
<Button onClick={handleClick} disabled={isDisabled} />

// Many props: multi-line
<ChessSquare
    row={row}
    col={col}
    piece={piece}
    isSelected={isSelected}
    onClick={handleSquareClick}
/>

// Conditional rendering
{condition && <Component />}
{condition ? <ComponentA /> : <ComponentB />}

// Lists
{items.map(item => (
    <Item key={item.id} data={item} />
))}
```

### CSS (Tailwind)

#### Class Organization

```javascript
// Order: layout → display → spacing → sizing → typography → colors → effects
<div className="
    flex flex-col          // Layout
    items-center          // Display
    p-4 m-2              // Spacing
    w-full h-screen      // Sizing
    text-lg font-bold    // Typography
    bg-blue-500 text-white // Colors
    shadow-lg rounded-lg   // Effects
">
```

#### Responsive Design

```javascript
// Mobile-first approach
<div className="
    text-sm        // Mobile (default)
    md:text-base   // Tablet
    lg:text-lg     // Desktop
">
```

---

## File Organization

### Where to Put New Code

#### New UI Component

```
src/components/ui/MyComponent.jsx
```

#### New Game Logic

```
src/utils/myLogic.js
```

#### New Core System

```
src/core/MySystem.js
```

#### New Custom Hook

```
src/components/hooks/useMyHook.js
```

#### New Test

```
src/tests/myTest.test.js
```

---

## Testing (When Implemented)

### Running Tests

```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
npm test myFile.test.js    # Specific file
```

### Writing Tests

```javascript
// moveCalculator.test.js
import { calculateLegalMoves } from "./moveCalculator";
import { INITIAL_BOARD } from "./constants";

describe("calculateLegalMoves", () => {
  describe("Pawn movement", () => {
    it("should allow pawn to move forward one square", () => {
      const board = [...INITIAL_BOARD];
      const moves = calculateLegalMoves(board, 6, 0, "white");

      expect(moves).toContainEqual({ row: 5, col: 0 });
    });

    it("should allow pawn to move forward two squares on first move", () => {
      const board = [...INITIAL_BOARD];
      const moves = calculateLegalMoves(board, 6, 0, "white");

      expect(moves).toContainEqual({ row: 4, col: 0 });
    });
  });
});
```

### Test Coverage Goals

- **Utils**: 80%+
- **Core**: 90%+
- **Components**: 60%+

---

## Debugging

### Browser DevTools

#### React DevTools

1. Install React DevTools extension
2. Open browser DevTools
3. Navigate to "Components" or "Profiler" tab
4. Inspect component state and props

#### Console Logging

```javascript
// Debug game state
console.log("Game State:", gameState);

// Debug specific values
console.log("Legal Moves:", legalMoves);

// Debug with labels
console.log("Before move:", { board, turn });
// ... make move
console.log("After move:", { board, turn });
```

#### Breakpoints

```javascript
function handleSquareClick(row, col) {
  debugger; // Execution pauses here
  const piece = board[row][col];
  // ...
}
```

### Common Issues & Solutions

#### Issue: "Module not found"

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Vite dev server not updating

```bash
# Restart dev server
Ctrl+C
npm run dev
```

#### Issue: ESLint errors on save

```bash
# Check .eslintrc configuration
# Ensure VS Code ESLint extension is enabled
```

#### Issue: Board not rendering

1. Check browser console for errors
2. Verify `gameState` has valid `board` array
3. Check if `ChessBoard` component is imported correctly

---

## Common Tasks

### Adding a New Piece Type

1. **Define piece in constants.js**:

```javascript
export const PIECES = {
  // ... existing
  UNICORN: "u", // New piece
};

export const PIECE_SYMBOLS = {
  // ... existing
  U: "🦄",
  u: "🦄", // Unicorn symbol
};
```

2. **Add movement logic in moveCalculator.js**:

```javascript
function generateUnicornMoves(board, row, col) {
    // Define unicorn movement
    const moves = [];
    // ... add logic
    return moves;
}

// Update generatePossibleMoves
case PIECES.UNICORN:
    return generateUnicornMoves(board, row, col);
```

3. **Update combination rules if needed**:

```javascript
export const ALLOWED_COMBINATIONS = [
  // ... existing
  ["u", "n"],
  ["U", "N"], // Unicorn + Knight
];
```

4. **Test the new piece**:

```javascript
describe("Unicorn movement", () => {
  it("should move in unicorn pattern", () => {
    // ... tests
  });
});
```

### Adding a New UI Component

1. **Create component file**:

```javascript
// src/components/ui/MyNewComponent.jsx
import React from "react";

function MyNewComponent({ prop1, prop2 }) {
  return <div className="my-component">{/* JSX */}</div>;
}

export default MyNewComponent;
```

2. **Import and use in ChessBoard**:

```javascript
import MyNewComponent from "./ui/MyNewComponent";

function ChessBoard() {
  return (
    <div>
      {/* ... existing */}
      <MyNewComponent prop1={value1} prop2={value2} />
    </div>
  );
}
```

### Adding a New Utility Function

1. **Add to appropriate utility file**:

```javascript
// src/utils/myUtility.js
export function myNewFunction(param1, param2) {
  // Implementation
  return result;
}
```

2. **Add tests (future)**:

```javascript
// src/tests/myUtility.test.js
import { myNewFunction } from "../utils/myUtility";

describe("myNewFunction", () => {
  it("should do something", () => {
    expect(myNewFunction(input)).toBe(expected);
  });
});
```

3. **Use in components**:

```javascript
import { myNewFunction } from "../utils/myUtility";

function MyComponent() {
  const result = myNewFunction(arg1, arg2);
  // ...
}
```

---

## Performance Best Practices

### 1. Memoize Expensive Calculations

```javascript
const legalMoves = useMemo(
  () => calculateLegalMoves(board, row, col, turn),
  [board, row, col, turn]
);
```

### 2. Memoize Components

```javascript
const ChessSquare = React.memo(ChessSquareComponent, (prev, next) => {
  return prev.piece === next.piece && prev.isSelected === next.isSelected;
});
```

### 3. Avoid Inline Functions in Render

```javascript
// ❌ BAD: Creates new function on every render
<button onClick={() => handleClick(id)}>Click</button>;

// ✅ GOOD: Stable function reference
const handleButtonClick = useCallback(() => handleClick(id), [id]);
<button onClick={handleButtonClick}>Click</button>;
```

### 4. Lazy Load Heavy Components

```javascript
const HeavyComponent = React.lazy(() => import("./HeavyComponent"));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

---

## Contributing Checklist

Before submitting a PR, ensure:

- [ ] Code follows style guidelines
- [ ] No console errors in browser
- [ ] Linter passes (`npm run lint`)
- [ ] Code is well-commented (complex logic)
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main
- [ ] PR description explains changes
- [ ] Manual testing completed

---

## Getting Help

### Resources

- **Documentation**: Read all docs in `docs/` folder
- **Code Comments**: Check inline comments in source files
- **Git History**: Look at previous commits for examples
- **Issues**: Check GitHub issues for known problems

### Contact

- **GitHub Issues**: Report bugs or ask questions
- **Pull Requests**: Propose changes for review

---

## Project Structure Quick Reference

```
src/
├── components/          # React components
│   ├── ChessBoard.jsx   # Main component (LARGE - needs refactor)
│   ├── hooks/           # Custom hooks (useCombineMode, etc.)
│   ├── helpers/         # UI helpers (messageHelpers, squareStyling)
│   └── ui/              # Presentational components
├── core/                # Core game engine (framework-agnostic)
│   ├── GameState.js     # Game state model
│   ├── Action.js        # Command pattern actions
│   ├── History.js       # Undo/redo system
│   ├── EngineInterface.js # High-level API
│   └── PositionKey.js   # Zobrist hashing
├── utils/               # Pure utility functions
│   ├── constants.js     # Game constants
│   ├── moveCalculator.js # Legal move generation
│   ├── moveValidation.js # Move validity
│   ├── combinationRules.js # Piece combining
│   └── deCombinationRules.js # Piece splitting
├── network/             # Multiplayer (not integrated)
├── tests/               # Tests (empty - needs implementation)
└── App.jsx              # Root component
```

---

**Next**: Read [API Reference](./10-API-REFERENCE.md) for function documentation.
