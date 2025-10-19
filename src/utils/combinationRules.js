import {
    PIECES,
    ALLOWED_COMBINATIONS,
    PIECE_VALUES,
    isSameColor,
    getBasePieceType,
    getPieceColor,
    isHybridPiece
} from './constants.js';
import { isValidMove } from './moveValidation.js';
import { wouldBeInCheck } from './moveCalculator.js';

// Check if two pieces can be combined
export const canCombinePieces = (piece1, piece2) => {
    if (!piece1 || !piece2) return false;

    // Issue #17: Cannot combine hybrids with any piece
    if (isHybridPiece(piece1) || isHybridPiece(piece2)) return false;

    // Must be same color
    if (!isSameColor(piece1, piece2)) return false;

    // Cannot combine pawns or kings
    const type1 = getBasePieceType(piece1);
    const type2 = getBasePieceType(piece2);

    if (type1 === PIECES.PAWN || type1 === PIECES.KING) return false;
    if (type2 === PIECES.PAWN || type2 === PIECES.KING) return false;

    // Check if the pairing is allowed
    return isAllowedPairing(piece1, piece2);
};

// Check if a pairing is in the allowed list
export const isAllowedPairing = (piece1, piece2) => {
    const type1 = getBasePieceType(piece1);
    const type2 = getBasePieceType(piece2);

    // Check both orderings
    for (const [a, b] of ALLOWED_COMBINATIONS) {
        if ((type1 === a && type2 === b) || (type1 === b && type2 === a)) {
            return true;
        }
    }

    return false;
};

// Check if piece1 can reach piece2's square (reachability check)
export const canReachForCombine = (board, row1, col1, row2, col2, currentTurn) => {
    const piece1 = board[row1][col1];
    const piece2 = board[row2][col2];

    if (!piece1 || !piece2) return false;

    // Check if piece1 can legally move to piece2's square
    // Pass true to allow friendly destination for combination checks
    const canMove = isValidMove(board, row1, col1, row2, col2, true);

    // Also check if this would leave king in check
    if (canMove) {
        const wouldCheck = wouldBeInCheck(board, row1, col1, row2, col2, currentTurn);
        return !wouldCheck;
    }

    return false;
};

// Check if either piece can reach the other
export const isReachable = (board, row1, col1, row2, col2, currentTurn) => {
    return canReachForCombine(board, row1, col1, row2, col2, currentTurn) ||
        canReachForCombine(board, row2, col2, row1, col1, currentTurn);
};

// Determine which piece has higher value for placement
export const getHigherValuePiece = (piece1, piece2) => {
    const value1 = PIECE_VALUES[piece1] || 0;
    const value2 = PIECE_VALUES[piece2] || 0;

    if (value1 > value2) return piece1;
    if (value2 > value1) return piece2;

    // Equal values - return null to indicate tie
    return null;
};

// Determine placement square based on piece values
export const determinePlacementSquare = (piece1, row1, col1, piece2, row2, col2, anchorRow, anchorCol) => {
    const higherValue = getHigherValuePiece(piece1, piece2);

    // If there's a clear winner, use that square
    if (higherValue === piece1) {
        return { row: row1, col: col1 };
    } else if (higherValue === piece2) {
        return { row: row2, col: col2 };
    }

    // Tie: use anchor (first clicked) square
    return { row: anchorRow, col: anchorCol };
};

// Create hybrid piece identifier
export const createHybridPiece = (piece1, piece2) => {
    const isWhite = piece1 === piece1.toUpperCase();
    const type1 = getBasePieceType(piece1);
    const type2 = getBasePieceType(piece2);

    // Sort types to create consistent hybrid identifier
    const types = [type1, type2].sort();

    // Determine hybrid type
    let hybridType;
    if (types.includes(PIECES.ROOK) && types.includes(PIECES.BISHOP)) {
        hybridType = PIECES.ROOK_BISHOP;
    } else if (types.includes(PIECES.ROOK) && types.includes(PIECES.KNIGHT)) {
        hybridType = PIECES.ROOK_KNIGHT;
    } else if (types.includes(PIECES.BISHOP) && types.includes(PIECES.KNIGHT)) {
        hybridType = PIECES.BISHOP_KNIGHT;
    } else if (types.includes(PIECES.QUEEN) && types.includes(PIECES.KNIGHT)) {
        hybridType = PIECES.QUEEN_KNIGHT;
    } else {
        return null; // Invalid combination
    }

    // Return uppercase for white, lowercase for black
    return isWhite ? hybridType.toUpperCase() : hybridType;
};

// Validate complete combination action
export const validateCombination = (board, row1, col1, row2, col2, currentTurn) => {
    const piece1 = board[row1][col1];
    const piece2 = board[row2][col2];

    // Basic checks
    if (!canCombinePieces(piece1, piece2)) {
        return { valid: false, reason: 'Invalid pairing' };
    }

    // Color check
    if (getPieceColor(piece1) !== currentTurn) {
        return { valid: false, reason: 'Not your pieces' };
    }

    // Reachability check
    if (!isReachable(board, row1, col1, row2, col2, currentTurn)) {
        return { valid: false, reason: 'Pieces cannot reach each other' };
    }

    return { valid: true };
};

// Find all eligible combination pairs for current player
export const findEligiblePairs = (board, currentTurn) => {
    const pairs = [];
    const pieces = [];

    // Find all pieces of current player
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && getPieceColor(piece) === currentTurn) {
                const type = getBasePieceType(piece);
                // Issue #17: Skip pawns, kings, and hybrid pieces
                if (type !== PIECES.PAWN && type !== PIECES.KING && !isHybridPiece(piece)) {
                    pieces.push({ piece, row, col });
                }
            }
        }
    }

    // Check all pairs
    for (let i = 0; i < pieces.length; i++) {
        for (let j = i + 1; j < pieces.length; j++) {
            const p1 = pieces[i];
            const p2 = pieces[j];

            if (canCombinePieces(p1.piece, p2.piece)) {
                if (isReachable(board, p1.row, p1.col, p2.row, p2.col, currentTurn)) {
                    pairs.push({
                        piece1: { ...p1 },
                        piece2: { ...p2 }
                    });
                }
            }
        }
    }
    console.log("Combination pairs:", pairs);
    return pairs;
};

// Get eligible partners for a specific piece
export const getEligiblePartners = (board, row, col, currentTurn, allPairs) => {
    const partners = [];

    for (const pair of allPairs) {
        if (pair.piece1.row === row && pair.piece1.col === col) {
            partners.push(pair.piece2);
        } else if (pair.piece2.row === row && pair.piece2.col === col) {
            partners.push(pair.piece1);
        }
    }

    return partners;
};
