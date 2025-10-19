# Known Issues & Bugs

This document catalogs all known issues, bugs, and limitations in the current codebase.

## Critical Issues

### 1. Invalid Character in Source Files

**Severity**: 🔴 **CRITICAL** - Breaks compilation  
**Files Affected**:

- `src/components/ChessBoard.jsx` (line 201)
- `src/utils/deCombinationRules.js` (line 29)

**Issue**: Unicode arrow character `→` (U+2192) used in strings

```javascript
// ChessBoard.jsx line 201
hybridSelected: isSelectedHybrid(rowIndex, colIndex), // Invalid char here

// deCombinationRules.js line 29
return `De-combined: ${hybrid} → ${piece1} at ${pos1}...`
```

**Error Message**:

```
Parsing failed: 'invalid character '→' (U+2192)'
```

**Impact**:

- Linting fails
- Potential build issues
- Code analysis tools break

**Fix**:
Replace `→` with `->` or remove arrows:

```javascript
return `De-combined: ${hybrid} -> ${piece1} at ${pos1}...`;
// OR
return `De-combined: ${hybrid} into ${piece1} at ${pos1}...`;
```

---

### 2. Package Declaration Errors

**Severity**: 🔴 **CRITICAL** - Linter misconfiguration  
**Files Affected**: Multiple `.js` and `.jsx` files

**Issue**: ESLint/Go parser expecting `package` declaration (wrong language mode)

**Error Message**:

```
expected 'package', found 'import'
```

**Root Cause**: ESLint configuration treating JavaScript as Go code

**Impact**:

- All linting fails
- IDE shows false errors
- Code quality checks broken

**Fix**: Update `eslint.config.js`:

```javascript
export default [
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parser: "@babel/eslint-parser", // Use correct parser
    },
  },
];
```

---

## High Priority Issues

### 3. Unused Variables and Parameters

**Severity**: 🟠 **HIGH** - Code quality

**Locations**:

#### `src/core/Action.js`

- Line 68: `gameState` parameter defined but never used
- Line 89: `json` parameter defined but never used
- Line 393: `gameState` parameter defined but never used

#### `src/core/PositionKey.js`

- Line 65: `turnIndex` assigned but never used

#### `src/core/EngineInterface.js`

- Line 27: `ACTION_TYPES` imported but never used
- Line 28: `COLORS` imported but never used
- Line 29: `isValidMove` imported but never used
- Line 30: `wouldBeInCheck` imported but never used

#### `src/utils/deCombinationRules.js`

- Line 3: `COLORS` imported but never used

#### `src/network/MessageSchema.js`

- Line 372: `type` assigned but never used

**Impact**:

- Code bloat
- Confusion for developers
- Potential bugs (intended functionality not implemented)

**Fix**: Either use the variables or remove them:

```javascript
// Remove if not needed
// const gameState = ...

// Or use if functionality is missing
function validate(gameState) {
  // Actually use gameState
  if (!gameState.board) throw new Error("Invalid state");
}
```

---

### 4. Cyclomatic Complexity Too High

**Severity**: 🟠 **HIGH** - Maintainability

**Files**:

- `src/components/ChessBoard.jsx`: Complexity 20 (limit 8)
- `src/core/EngineInterface.js` (`listLegalActions`): Complexity 34 (limit 8)

**Issue**: Functions are too complex with many conditional branches

**Impact**:

- Hard to understand
- Difficult to test
- Prone to bugs

**Example** (`listLegalActions`):

```javascript
function listLegalActions(position) {
  // 34 decision points (if/else, switch, loops)
  // Too many nested conditions
  // Hard to follow logic
}
```

**Fix**: Refactor into smaller functions:

```javascript
function listLegalActions(position) {
  const moves = listMovementActions(position);
  const combines = listCombinationActions(position);
  const decombines = listDecombinationActions(position);
  return [...moves, ...combines, ...decombines];
}

function listMovementActions(position) {
  // Simpler, focused function
}
```

---

### 5. Method Too Long

**Severity**: 🟠 **HIGH** - Maintainability

**Files**:

- `src/components/ChessBoard.jsx`: 223 lines (limit 50)
- `src/core/EngineInterface.js` (`listLegalActions`): 115 lines (limit 50)

**Issue**: Monolithic functions/components

**Impact**:

- Hard to navigate
- Cannot reuse parts
- Difficult to test

**Fix**: Extract sub-components and helper functions

**ChessBoard.jsx** should be split:

```javascript
// ChessBoard.jsx (main container)
function ChessBoard() {
  return (
    <BoardContainer>
      <BoardHeader />
      <BoardGrid />
      <BoardControls />
    </BoardContainer>
  );
}

// Separate files
// BoardHeader.jsx
// BoardGrid.jsx
// BoardControls.jsx
```

---

## Medium Priority Issues

### 6. Mixed Module Syntax

**Severity**: 🟡 **MEDIUM** - Inconsistency  
**File**: `src/core/History.js` (line 43)

**Issue**: Uses `require()` instead of `import`:

```javascript
const { deserializeAction } = require("./Action.js");
```

**Impact**:

- Inconsistent with rest of codebase
- Mixing CommonJS and ES modules
- Potential bundling issues

**Fix**:

```javascript
import { deserializeAction } from "./Action.js";
```

---

### 7. File Too Large (NLOC)

**Severity**: 🟡 **MEDIUM** - Organization  
**File**: `src/components/ChessBoard.jsx`

**Issue**: 814 non-comment lines (limit 500)

**Impact**:

- Hard to maintain
- Slow to load in editor
- Difficult to review

**Fix**: Split into multiple files (see Issue #5)

---

### 8. Empty Directories

**Severity**: 🟡 **MEDIUM** - Incomplete

**Directories**:

- `src/core/rules/` (empty)
- `src/hooks/` (empty)
- `src/tests/` (empty)

**Impact**:

- Misleading structure
- Suggests features that don't exist
- Confusion for new developers

**Fix Options**:

1. Implement planned features
2. Remove empty directories
3. Add README.md explaining future plans

---

### 9. Backup File in Source

**Severity**: 🟡 **MEDIUM** - Organization  
**File**: `src/components/ChessBoard.backup.jsx`

**Issue**: Backup file committed to repository

**Impact**:

- Code duplication
- Confusion about which file is active
- Wastes repository space

**Fix**:

```bash
git rm src/components/ChessBoard.backup.jsx
# Use git history for backups instead
```

---

## Low Priority Issues

### 10. Incomplete Features

**Severity**: 🟢 **LOW** - Expected in POC

**Missing**:

- Castling (designed but not implemented)
- En passant (not implemented)
- Pawn promotion (partially implemented)
- Checkmate detection (partially implemented)
- Stalemate detection (not implemented)
- Draw detection (threefold repetition structure exists)

**Impact**: Game is not complete chess implementation

**Status**: By design - POC focuses on combination mechanics

---

### 11. Network Sync Not Integrated

**Severity**: 🟢 **LOW** - Future feature

**Files**: `src/network/*`

**Issue**: Complete architecture but not connected to UI

**Impact**: Cannot play multiplayer

**Status**: Designed for future implementation

---

### 12. No Tests

**Severity**: 🟢 **LOW** - Technical debt

**Impact**:

- No regression detection
- Harder to refactor confidently
- Cannot verify correctness

**Fix**: Add Jest tests:

```javascript
// Example: moveCalculator.test.js
describe("calculateLegalMoves", () => {
  it("should return valid rook moves", () => {
    const board = createTestBoard();
    const moves = calculateLegalMoves(board, 0, 0, "white");
    expect(moves).toHaveLength(14);
  });
});
```

---

### 13. No Accessibility Features

**Severity**: 🟢 **LOW** - UX enhancement

**Missing**:

- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

**Impact**: Not usable by users with disabilities

**Status**: Future enhancement

---

### 14. No Mobile Support

**Severity**: 🟢 **LOW** - Platform limitation

**Issue**:

- No touch controls
- Layout not responsive
- Small squares on mobile

**Impact**: Cannot play on mobile devices

**Status**: Desktop-first design

---

## Logical Issues

### 15. King Capture vs Checkmate

**Severity**: 🟡 **MEDIUM** - Game logic

**Current Behavior**: Game ends when king is captured  
**Expected Behavior**: Game ends at checkmate (before king is captured)

**Impact**: Not standard chess rules

**Fix**: Implement proper checkmate detection:

```javascript
function isCheckmate(gameState) {
  if (!isKingInCheck(gameState)) return false;
  const legalMoves = getAllLegalMoves(gameState);
  return legalMoves.length === 0;
}
```

---

### 16. Inconsistent Move Validation

**Severity**: 🟡 **MEDIUM** - Logic issue

**Issue**: Different validation logic in multiple places:

- `moveValidation.js`
- `moveCalculator.js`
- `combinationRules.js`

**Impact**:

- Potential inconsistencies
- Duplication
- Hard to maintain

**Fix**: Centralize validation:

```javascript
// validation/index.js (new file)
export function validateMove(board, from, to, options) {
  // Single source of truth
}
```

---

### 17. No Position Repetition Check

**Severity**: 🟡 **MEDIUM** - Missing feature

**Issue**: History tracks position counts but doesn't enforce draw

**Impact**: Games can continue in repetitive positions forever

**Fix**:

```javascript
function checkDraw(gameState, history) {
  const posKey = gameState.getPositionKey();
  if (history.positionCounts[posKey] >= 3) {
    return { draw: true, reason: "threefold_repetition" };
  }
  return { draw: false };
}
```

---

## Performance Issues

### 18. Unnecessary Re-renders

**Severity**: 🟡 **MEDIUM** - Performance

**Issue**: ChessSquare components re-render on every state change

**Impact**: Wasted CPU cycles

**Fix**: Memoize components:

```javascript
const ChessSquare = React.memo(
  ({ row, col, piece, onClick, style }) => {
    // ...
  },
  (prevProps, nextProps) => {
    // Custom comparison
    return (
      prevProps.piece === nextProps.piece && prevProps.style === nextProps.style
    );
  }
);
```

---

### 19. Recalculating Legal Moves

**Severity**: 🟢 **LOW** - Performance

**Issue**: Legal moves recalculated on every render

**Impact**: Slight performance hit

**Fix**: Memoize calculations:

```javascript
const legalMoves = useMemo(
  () => calculateLegalMoves(board, row, col, turn),
  [board, row, col, turn]
);
```

---

## Security Issues

### 20. No Input Sanitization

**Severity**: 🟢 **LOW** - Security (POC)

**Issue**: No validation of external inputs (if network added)

**Impact**: Potential XSS or injection attacks

**Status**: Not relevant until multiplayer added

---

## Documentation Issues

### 21. Incomplete JSDoc Comments

**Severity**: 🟢 **LOW** - Documentation

**Issue**: Some functions lack documentation

**Impact**: Harder for new developers

**Fix**: Add JSDoc:

```javascript
/**
 * Calculate all legal moves for a piece
 * @param {Array<Array<string>>} board - 8x8 board
 * @param {number} row - Piece row (0-7)
 * @param {number} col - Piece column (0-7)
 * @param {string} currentTurn - 'white' or 'black'
 * @returns {Array<{row: number, col: number}>} Legal moves
 */
function calculateLegalMoves(board, row, col, currentTurn) {
  // ...
}
```

---

## Summary Table

| Priority    | Count  | Category             |
| ----------- | ------ | -------------------- |
| 🔴 Critical | 2      | Compilation errors   |
| 🟠 High     | 3      | Code quality         |
| 🟡 Medium   | 8      | Logic & organization |
| 🟢 Low      | 8      | Future enhancements  |
| **Total**   | **21** |                      |

## Issue Resolution Roadmap

### Phase 1: Fix Critical (Week 1)

- [ ] Remove invalid Unicode characters (#1)
- [ ] Fix ESLint configuration (#2)

### Phase 2: Code Quality (Week 2-3)

- [ ] Remove unused imports/variables (#3)
- [ ] Refactor complex functions (#4, #5)
- [ ] Fix mixed module syntax (#6)

### Phase 3: Architecture (Week 4-5)

- [ ] Split large files (#5, #7)
- [ ] Centralize validation (#16)
- [ ] Add React.memo (#18)

### Phase 4: Testing (Week 6-8)

- [ ] Unit tests for utils (#12)
- [ ] Integration tests for components
- [ ] E2E tests for gameplay

### Phase 5: Features (Month 3+)

- [ ] Implement checkmate (#15)
- [ ] Add castling (#10)
- [ ] Network integration (#11)

---

**Next**: Read [Improvement Roadmap](./08-IMPROVEMENTS.md) for planned enhancements.
