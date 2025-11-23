import {
  PIECES,
  COLORS,
  isHybridPiece,
  getPieceColor,
  getBasePieceType,
  copyBoard,
} from "./constants.js";
import { isInCheck } from "./moveCalculator.js";

// Standardized error messages for de-combination
export const DE_COMBINE_ERRORS = {
  NOT_HYBRID: "Selected piece cannot be de-combined.",
  WRONG_TURN: "It's not your turn.",
  NO_COMPONENT_MAPPING: "De-Combine failed: component mapping missing.",
  NO_ADJACENT_SQUARES: "No adjacent empty squares to split.",
  SQUARE_OFF_BOARD: "Selected square is off the board.",
  SQUARE_OCCUPIED: "Selected square is no longer available; reselect.",
  SQUARE_NOT_ADJACENT: "Selected square is not adjacent to the hybrid.",
  KING_IN_CHECK:
    "De-combine here would expose your king; try a different square.",
  INVALID_ASSIGNMENT: "Invalid component mapping.",
};

// Success message template
export const getSuccessMessage = (
  hybrid,
  stayingPiece,
  stayingSquare,
  spawningPiece,
  spawningSquare
) => {
  const toAlgebraic = (row, col) => {
    return String.fromCharCode(97 + col) + (8 - row);
  };
  return `De-combined: ${hybrid} -> ${getBasePieceType(
    stayingPiece
  )} at ${toAlgebraic(
    stayingSquare.row,
    stayingSquare.col
  )}, ${getBasePieceType(spawningPiece)} at ${toAlgebraic(
    spawningSquare.row,
    spawningSquare.col
  )}.`;
};

// Component mapping for hybrids (Spec 3.2)
export const HYBRID_COMPONENTS = {
  rb: [PIECES.ROOK, PIECES.BISHOP],
  RB: [PIECES.ROOK.toUpperCase(), PIECES.BISHOP.toUpperCase()],
  rn: [PIECES.ROOK, PIECES.KNIGHT],
  RN: [PIECES.ROOK.toUpperCase(), PIECES.KNIGHT.toUpperCase()],
  bn: [PIECES.BISHOP, PIECES.KNIGHT],
  BN: [PIECES.BISHOP.toUpperCase(), PIECES.KNIGHT.toUpperCase()],
  qn: [PIECES.QUEEN, PIECES.KNIGHT],
  QN: [PIECES.QUEEN.toUpperCase(), PIECES.KNIGHT.toUpperCase()],
};

// Adjacency priority order (Spec 4.2)
const ADJACENCY_ORDER = [
  { row: -1, col: 0, name: "Forward" }, // Forward
  { row: 0, col: 1, name: "Right" }, // Right
  { row: 0, col: -1, name: "Left" }, // Left
  { row: 1, col: 0, name: "Backward" }, // Backward
  { row: -1, col: 1, name: "Forward-Right" }, // Forward-Right
  { row: -1, col: -1, name: "Forward-Left" }, // Forward-Left
  { row: 1, col: 1, name: "Backward-Right" }, // Backward-Right
  { row: 1, col: -1, name: "Backward-Left" }, // Backward-Left
];

// Get components for a hybrid piece
export const getHybridComponents = (hybridPiece) => {
  return HYBRID_COMPONENTS[hybridPiece] || null;
};

// Check if position is valid on board
const isValidPosition = (row, col) => {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
};

// Find all empty adjacent squares in priority order (Spec 4.2)
export const findSpawnSquares = (board, row, col) => {
  const spawnSquares = [];

  for (const offset of ADJACENCY_ORDER) {
    const newRow = row + offset.row;
    const newCol = col + offset.col;

    if (isValidPosition(newRow, newCol) && !board[newRow][newCol]) {
      spawnSquares.push({
        row: newRow,
        col: newCol,
        direction: offset.name,
      });
    }
  }

  return spawnSquares;
};

// Check if a hybrid can be de-combined (Spec 3.1)
export const canDeCombine = (board, row, col, currentTurn) => {
  const piece = board[row][col];

  // Must be a hybrid piece
  if (!piece || !isHybridPiece(piece)) {
    return { valid: false, reason: DE_COMBINE_ERRORS.NOT_HYBRID };
  }

  // Must belong to current player
  if (getPieceColor(piece) !== currentTurn) {
    return { valid: false, reason: DE_COMBINE_ERRORS.WRONG_TURN };
  }

  // Must have component mapping
  const components = getHybridComponents(piece);
  if (!components) {
    return { valid: false, reason: DE_COMBINE_ERRORS.NO_COMPONENT_MAPPING };
  }

  // Must have at least one empty adjacent square
  const spawnSquares = findSpawnSquares(board, row, col);
  if (spawnSquares.length === 0) {
    return { valid: false, reason: DE_COMBINE_ERRORS.NO_ADJACENT_SQUARES };
  }

  return { valid: true, spawnSquares, components };
};

// Two-assignment legality engine: Test both possible component assignments
// Assignment A: C1 stays on original, C2 spawns
// Assignment B: C2 stays on original, C1 spawns
export const computeLegalAssignments = (
  board,
  row,
  col,
  spawnSquare,
  currentTurn
) => {
  const piece = board[row][col];
  const components = getHybridComponents(piece);

  if (!components || components.length !== 2) {
    return { legal: [], reason: DE_COMBINE_ERRORS.INVALID_ASSIGNMENT };
  }

  const [C1, C2] = components;
  const legalAssignments = [];

  // Test Assignment A: C1 stays, C2 spawns
  const testBoardA = copyBoard(board);
  testBoardA[row][col] = C1;
  testBoardA[spawnSquare.row][spawnSquare.col] = C2;
  const isLegalA = !isInCheck(testBoardA, currentTurn);

  if (isLegalA) {
    legalAssignments.push({
      type: "A",
      stayingComponent: C1,
      spawningComponent: C2,
      stayingSquare: { row, col },
      spawningSquare: spawnSquare,
      description: `${getBasePieceType(C1)} stays; ${getBasePieceType(
        C2
      )} spawns`,
    });
  }

  // Test Assignment B: C2 stays, C1 spawns
  const testBoardB = copyBoard(board);
  testBoardB[row][col] = C2;
  testBoardB[spawnSquare.row][spawnSquare.col] = C1;
  const isLegalB = !isInCheck(testBoardB, currentTurn);

  if (isLegalB) {
    legalAssignments.push({
      type: "B",
      stayingComponent: C2,
      spawningComponent: C1,
      stayingSquare: { row, col },
      spawningSquare: spawnSquare,
      description: `${getBasePieceType(C2)} stays; ${getBasePieceType(
        C1
      )} spawns`,
    });
  }

  // Deterministic tie-break: if both legal, prefer first component stays (Assignment A)
  // This rule is documented in constants and ensures network determinism
  if (legalAssignments.length === 0) {
    return { legal: [], reason: DE_COMBINE_ERRORS.KING_IN_CHECK };
  }

  return { legal: legalAssignments, chosen: legalAssignments[0] };
};

// Legacy compatibility wrapper
export const validateDeCombineSafety = (
  board,
  row,
  col,
  spawnSquare,
  currentTurn
) => {
  const result = computeLegalAssignments(
    board,
    row,
    col,
    spawnSquare,
    currentTurn
  );
  return result.legal.length > 0;
};

// Execute de-combination with chosen assignment (Spec 5.1)
export const executeDeCombination = (
  board,
  row,
  col,
  spawnSquare,
  currentTurn
) => {
  const piece = board[row][col];
  const components = getHybridComponents(piece);

  if (!components) return null;

  // Use two-assignment engine to determine legal placement
  const assignmentResult = computeLegalAssignments(
    board,
    row,
    col,
    spawnSquare,
    currentTurn
  );

  if (assignmentResult.legal.length === 0) {
    return null; // No legal assignment
  }

  const chosen = assignmentResult.chosen;

  // Create new board (immutable)
  const newBoard = copyBoard(board);

  // Place components according to chosen assignment
  newBoard[chosen.stayingSquare.row][chosen.stayingSquare.col] =
    chosen.stayingComponent;
  newBoard[chosen.spawningSquare.row][chosen.spawningSquare.col] =
    chosen.spawningComponent;

  return {
    board: newBoard,
    assignment: chosen,
    components: components,
    anchorSquare: { row, col },
    spawnSquare: spawnSquare,
    stayingComponent: chosen.stayingComponent,
    spawningComponent: chosen.spawningComponent,
    assignmentType: chosen.type,
    description: chosen.description,
  };
};

// Find all hybrids owned by current player
export const findPlayerHybrids = (board, currentTurn) => {
  const hybrids = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (
        piece &&
        isHybridPiece(piece) &&
        getPieceColor(piece) === currentTurn
      ) {
        const validation = canDeCombine(board, row, col, currentTurn);
        if (validation.valid) {
          hybrids.push({
            row,
            col,
            piece,
            spawnSquares: validation.spawnSquares,
          });
        }
      }
    }
  }

  return hybrids;
};

// Validate complete de-combination action with two-assignment check
export const validateDeCombination = (
  board,
  row,
  col,
  spawnSquare,
  currentTurn
) => {
  // Check basic eligibility
  const eligibility = canDeCombine(board, row, col, currentTurn);
  if (!eligibility.valid) {
    return { valid: false, reason: eligibility.reason };
  }

  // Defensive re-check: verify spawn square is empty and on-board
  if (!isValidPosition(spawnSquare.row, spawnSquare.col)) {
    return { valid: false, reason: DE_COMBINE_ERRORS.SQUARE_OFF_BOARD };
  }

  if (board[spawnSquare.row][spawnSquare.col]) {
    return { valid: false, reason: DE_COMBINE_ERRORS.SQUARE_OCCUPIED };
  }

  // Check if spawn square is in eligible list
  const validSpawn = eligibility.spawnSquares.some(
    (sq) => sq.row === spawnSquare.row && sq.col === spawnSquare.col
  );

  if (!validSpawn) {
    return { valid: false, reason: DE_COMBINE_ERRORS.SQUARE_NOT_ADJACENT };
  }

  // Use two-assignment engine to check legality
  const assignmentResult = computeLegalAssignments(
    board,
    row,
    col,
    spawnSquare,
    currentTurn
  );

  if (assignmentResult.legal.length === 0) {
    return { valid: false, reason: assignmentResult.reason };
  }

  return {
    valid: true,
    assignment: assignmentResult.chosen,
    allLegalAssignments: assignmentResult.legal,
  };
};

/**
 * Select deterministic assignment when multiple are legal
 * Uses a stable, reproducible rule (no randomness)
 *
 * Rule: Prefer 'type1' (first component stays) over 'type2'
 * This ensures the same assignment is chosen across all clients
 */
export const selectDeterministicAssignment = (assignments) => {
  if (!assignments || assignments.length === 0) {
    throw new Error("No assignments to select from");
  }

  // If only one assignment, return it
  if (assignments.length === 1) {
    return assignments[0];
  }

  // Find 'type1' assignment (first component stays)
  const type1 = assignments.find((a) => a.type === "type1");
  if (type1) {
    return type1;
  }

  // Fallback to first assignment (should not happen with proper implementation)
  return assignments[0];
};
