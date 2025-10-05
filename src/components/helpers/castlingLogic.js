import { COLORS } from "../../utils/constants.js";
import { isInCheck } from "../../utils/moveCalculator.js";
import { copyBoard } from "../../utils/gameState.js";

/**
 * Castling logic helper functions
 */

/**
 * Check if castling is valid for the current player
 * @param {Array} board - The game board
 * @param {string} currentTurn - Current player's turn
 * @param {object} castlingRights - Castling rights for both players
 * @param {boolean} kingSide - True for kingside castling, false for queenside
 * @returns {boolean} - Whether castling is valid
 */
export const canCastle = (board, currentTurn, castlingRights, kingSide) => {
  const rank = currentTurn === COLORS.WHITE ? 7 : 0;
  const king = currentTurn === COLORS.WHITE ? "K" : "k";
  const rook = currentTurn === COLORS.WHITE ? "R" : "r";

  // Check castling rights
  const rights = castlingRights?.[currentTurn];
  if (
    !rights ||
    (kingSide && !rights.kingSide) ||
    (!kingSide && !rights.queenSide)
  ) {
    return false;
  }

  // Check if king is in correct position
  if (board[rank][4] !== king) {
    return false;
  }

  // Check if rook is in correct position
  const rookCol = kingSide ? 7 : 0;
  if (board[rank][rookCol] !== rook) {
    return false;
  }

  // Check if squares between king and rook are empty
  const startCol = kingSide ? 5 : 1;
  const endCol = kingSide ? 6 : 3;
  for (let col = startCol; col <= endCol; col++) {
    if (board[rank][col]) {
      return false;
    }
  }

  // Check if king is in check
  if (isInCheck(board, currentTurn)) {
    return false;
  }

  // Check if king passes through check
  const kingDestCol = kingSide ? 6 : 2;
  const passCol = kingSide ? 5 : 3;

  // Check intermediate square
  const testBoard1 = board.map((r) => [...r]);
  testBoard1[rank][4] = "";
  testBoard1[rank][passCol] = king;
  if (isInCheck(testBoard1, currentTurn)) {
    return false;
  }

  // Check destination square
  const testBoard2 = board.map((r) => [...r]);
  testBoard2[rank][4] = "";
  testBoard2[rank][kingDestCol] = king;
  if (isInCheck(testBoard2, currentTurn)) {
    return false;
  }

  return true;
};

/**
 * Execute a castling move
 * @param {Array} board - The game board
 * @param {string} currentTurn - Current player's turn
 * @param {boolean} kingSide - True for kingside castling, false for queenside
 * @returns {Array} - New board state after castling
 */
export const executeCastleMove = (board, currentTurn, kingSide) => {
  const rank = currentTurn === COLORS.WHITE ? 7 : 0;
  const king = currentTurn === COLORS.WHITE ? "K" : "k";
  const rook = currentTurn === COLORS.WHITE ? "R" : "r";

  // Create new board
  const newBoard = copyBoard(board);

  // Move king and rook
  if (kingSide) {
    newBoard[rank][4] = ""; // Remove king
    newBoard[rank][7] = ""; // Remove rook
    newBoard[rank][6] = king; // Place king
    newBoard[rank][5] = rook; // Place rook
  } else {
    newBoard[rank][4] = ""; // Remove king
    newBoard[rank][0] = ""; // Remove rook
    newBoard[rank][2] = king; // Place king
    newBoard[rank][3] = rook; // Place rook
  }

  return newBoard;
};
