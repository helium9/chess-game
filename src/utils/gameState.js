import { INITIAL_BOARD, COLORS, getPieceColor } from './constants.js';

// Create a deep copy of the board
export const copyBoard = (board) => {
    return board.map(row => [...row]);
};

// Execute a move on the board
export const makeMove = (board, fromRow, fromCol, toRow, toCol) => {
    const newBoard = copyBoard(board);
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = '';
    return newBoard;
};

// Initialize game state
export const createInitialGameState = () => {
    return {
        board: copyBoard(INITIAL_BOARD),
        currentTurn: COLORS.WHITE,
        selectedSquare: null,
        moveHistory: [],
        capturedPieces: {
            white: [],
            black: []
        }
    };
};

// Switch turn
export const switchTurn = (currentTurn) => {
    return currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
};

// Check if it's the current player's piece
export const isCurrentPlayersPiece = (piece, currentTurn) => {
    if (!piece) return false;
    return getPieceColor(piece) === currentTurn;
};

// Add move to history
export const addMoveToHistory = (moveHistory, move) => {
    return [...moveHistory, move];
};

// Add captured piece
export const addCapturedPiece = (capturedPieces, piece) => {
    const newCapturedPieces = { ...capturedPieces };
    const color = getPieceColor(piece);

    if (color === COLORS.WHITE) {
        newCapturedPieces.white = [...newCapturedPieces.white, piece];
    } else {
        newCapturedPieces.black = [...newCapturedPieces.black, piece];
    }

    return newCapturedPieces;
};
