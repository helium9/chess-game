// Zobrist Hashing for Chess Positions
// Generates unique 64-bit hashes for board positions using XOR operations

import { COLORS } from '../utils/constants.js';

/**
 * Zobrist Hashing System
 * 
 * Creates a unique fingerprint for each chess position by:
 * 1. Pre-generating random 64-bit numbers for each (piece, square) pair
 * 2. XORing these numbers together for all pieces on board
 * 3. XORing additional bits for castling rights, en passant, and turn
 * 
 * Properties:
 * - Fast: Just XOR operations
 * - Incremental: Can update hash when making moves (XOR is reversible)
 * - Low collision rate: 64-bit space = ~10^19 possible hashes
 */
class ZobristKeys {
    constructor() {
        // Generate all random keys on initialization
        this.pieceKeys = this.generatePieceKeys();
        this.castlingKeys = this.generateCastlingKeys();
        this.enPassantKeys = this.generateEnPassantKeys();
        this.turnKey = this.randomU64();
    }

    /**
     * Generate random 64-bit unsigned integer using BigInt
     * Uses two 32-bit random numbers combined into 64 bits
     * 
     * @returns {BigInt} Random 64-bit number
     */
    randomU64() {
        const high = Math.floor(Math.random() * 0x100000000); // Upper 32 bits
        const low = Math.floor(Math.random() * 0x100000000);  // Lower 32 bits
        return (BigInt(high) << 32n) | BigInt(low);
    }

    /**
     * Generate Zobrist keys for all piece-square combinations
     * 
     * Piece codes:
     * - Normal pieces: p,n,b,r,q,k (black), P,N,B,R,Q,K (white)
     * - Hybrid pieces: rb,rn,bn,qn (black), RB,RN,BN,QN (white)
     * 
     * Total: 20 piece types × 64 squares = 1,280 random keys
     * 
     * @returns {Object} Map of piece -> array of 64 random keys
     */
    generatePieceKeys() {
        const keys = {};

        // All piece types (normal + hybrids)
        const allPieces = [
            // Normal pieces - black
            'p', 'n', 'b', 'r', 'q', 'k',
            // Normal pieces - white
            'P', 'N', 'B', 'R', 'Q', 'K',
            // Hybrid pieces - black
            'rb', 'rn', 'bn', 'qn',
            // Hybrid pieces - white
            'RB', 'RN', 'BN', 'QN'
        ];

        // For each piece type, generate 64 keys (one per square)
        for (const piece of allPieces) {
            keys[piece] = [];
            for (let square = 0; square < 64; square++) {
                keys[piece][square] = this.randomU64();
            }
        }

        return keys;
    }

    /**
     * Generate Zobrist keys for castling rights
     * 4 separate keys for each castling right
     * 
     * @returns {Object} Castling right keys
     */
    generateCastlingKeys() {
        return {
            whiteKingSide: this.randomU64(),
            whiteQueenSide: this.randomU64(),
            blackKingSide: this.randomU64(),
            blackQueenSide: this.randomU64()
        };
    }

    /**
     * Generate Zobrist keys for en passant targets
     * Only need to track the file (column), not the full square
     * 8 keys for files a-h
     * 
     * @returns {Array} Array of 8 random keys
     */
    generateEnPassantKeys() {
        const keys = [];
        for (let file = 0; file < 8; file++) {
            keys[file] = this.randomU64();
        }
        return keys;
    }

    /**
     * Hash a complete chess position
     * 
     * @param {Array} board - 8×8 board array
     * @param {string} currentTurn - 'white' or 'black'
     * @param {Object} castlingRights - { white: {kingSide, queenSide}, black: {...} }
     * @param {Object|null} enPassantTarget - { row, col } or null
     * @returns {BigInt} 64-bit hash of the position
     */
    hashPosition(board, currentTurn, castlingRights, enPassantTarget = null) {
        let hash = 0n;

        // 1. Hash all pieces on the board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    const square = row * 8 + col;
                    hash ^= this.pieceKeys[piece][square];
                }
            }
        }

        // 2. Hash castling rights
        if (castlingRights.white.kingSide) {
            hash ^= this.castlingKeys.whiteKingSide;
        }
        if (castlingRights.white.queenSide) {
            hash ^= this.castlingKeys.whiteQueenSide;
        }
        if (castlingRights.black.kingSide) {
            hash ^= this.castlingKeys.blackKingSide;
        }
        if (castlingRights.black.queenSide) {
            hash ^= this.castlingKeys.blackQueenSide;
        }

        // 3. Hash en passant target (if exists)
        if (enPassantTarget) {
            hash ^= this.enPassantKeys[enPassantTarget.col];
        }

        // 4. Hash side to move
        // White = no XOR (hash stays as is)
        // Black = XOR with turnKey
        if (currentTurn === COLORS.BLACK) {
            hash ^= this.turnKey;
        }

        return hash;
    }

    /**
     * Incrementally update hash after a normal move
     * Much faster than re-hashing entire board
     * 
     * @param {BigInt} oldHash - Hash before the move
     * @param {string} fromPiece - Piece that moved (e.g., 'P', 'n', 'rb')
     * @param {number} fromSquare - Source square (0-63)
     * @param {string|null} toPiece - Piece after move (for promotions, usually same as fromPiece)
     * @param {number} toSquare - Destination square (0-63)
     * @param {string|null} capturedPiece - Captured piece (null if no capture)
     * @returns {BigInt} Updated hash
     */
    updateHashForNormalMove(oldHash, fromPiece, fromSquare, toPiece, toSquare, capturedPiece = null) {
        let newHash = oldHash;

        // Remove piece from source square
        newHash ^= this.pieceKeys[fromPiece][fromSquare];

        // Remove captured piece from destination (if any)
        if (capturedPiece) {
            newHash ^= this.pieceKeys[capturedPiece][toSquare];
        }

        // Add piece to destination square
        newHash ^= this.pieceKeys[toPiece][toSquare];

        // Toggle turn (always happens)
        newHash ^= this.turnKey;

        return newHash;
    }

    /**
     * Update hash for castling move
     * 
     * @param {BigInt} oldHash - Hash before castling
     * @param {string} color - 'white' or 'black'
     * @param {boolean} kingSide - true for O-O, false for O-O-O
     * @returns {BigInt} Updated hash
     */
    updateHashForCastling(oldHash, color, kingSide) {
        let newHash = oldHash;

        const rank = color === COLORS.WHITE ? 7 : 0;
        const king = color === COLORS.WHITE ? 'K' : 'k';
        const rook = color === COLORS.WHITE ? 'R' : 'r';

        if (kingSide) {
            // King: e1/e8 -> g1/g8
            // Rook: h1/h8 -> f1/f8
            newHash ^= this.pieceKeys[king][rank * 8 + 4]; // Remove king from e
            newHash ^= this.pieceKeys[king][rank * 8 + 6]; // Add king to g
            newHash ^= this.pieceKeys[rook][rank * 8 + 7]; // Remove rook from h
            newHash ^= this.pieceKeys[rook][rank * 8 + 5]; // Add rook to f
        } else {
            // Queen side
            // King: e1/e8 -> c1/c8
            // Rook: a1/a8 -> d1/d8
            newHash ^= this.pieceKeys[king][rank * 8 + 4]; // Remove king from e
            newHash ^= this.pieceKeys[king][rank * 8 + 2]; // Add king to c
            newHash ^= this.pieceKeys[rook][rank * 8 + 0]; // Remove rook from a
            newHash ^= this.pieceKeys[rook][rank * 8 + 3]; // Add rook to d
        }

        // Toggle turn
        newHash ^= this.turnKey;

        return newHash;
    }

    /**
     * Update hash for piece combination
     * Two pieces merge into one hybrid
     * 
     * @param {BigInt} oldHash - Hash before combination
     * @param {string} piece1 - First piece (e.g., 'R')
     * @param {number} square1 - Square of piece1 (0-63)
     * @param {string} piece2 - Second piece (e.g., 'B')
     * @param {number} square2 - Square of piece2 (0-63)
     * @param {string} hybridPiece - Resulting hybrid (e.g., 'RB')
     * @param {number} hybridSquare - Square where hybrid ends up (0-63)
     * @returns {BigInt} Updated hash
     */
    updateHashForCombination(oldHash, piece1, square1, piece2, square2, hybridPiece, hybridSquare) {
        let newHash = oldHash;

        // Remove both original pieces
        newHash ^= this.pieceKeys[piece1][square1];
        newHash ^= this.pieceKeys[piece2][square2];

        // Add hybrid piece
        newHash ^= this.pieceKeys[hybridPiece][hybridSquare];

        // Toggle turn
        newHash ^= this.turnKey;

        return newHash;
    }

    /**
     * Update hash for piece decombination
     * One hybrid splits into two normal pieces
     * 
     * @param {BigInt} oldHash - Hash before decombination
     * @param {string} hybridPiece - Hybrid being split (e.g., 'rb')
     * @param {number} hybridSquare - Square of hybrid (0-63)
     * @param {string} stayingPiece - Component staying at original square (e.g., 'r')
     * @param {string} spawningPiece - Component moving to spawn square (e.g., 'b')
     * @param {number} spawnSquare - Destination square for spawning piece (0-63)
     * @returns {BigInt} Updated hash
     */
    updateHashForDecombination(oldHash, hybridPiece, hybridSquare, stayingPiece, spawningPiece, spawnSquare) {
        let newHash = oldHash;

        // Remove hybrid piece
        newHash ^= this.pieceKeys[hybridPiece][hybridSquare];

        // Add staying component (at original square)
        newHash ^= this.pieceKeys[stayingPiece][hybridSquare];

        // Add spawning component (at spawn square)
        newHash ^= this.pieceKeys[spawningPiece][spawnSquare];

        // Toggle turn
        newHash ^= this.turnKey;

        return newHash;
    }

    /**
     * Update hash for castling rights change
     * 
     * @param {BigInt} oldHash - Current hash
     * @param {Object} oldRights - Previous castling rights
     * @param {Object} newRights - Updated castling rights
     * @returns {BigInt} Updated hash
     */
    updateHashForCastlingRights(oldHash, oldRights, newRights) {
        let newHash = oldHash;

        // XOR out old rights
        if (oldRights.white.kingSide) newHash ^= this.castlingKeys.whiteKingSide;
        if (oldRights.white.queenSide) newHash ^= this.castlingKeys.whiteQueenSide;
        if (oldRights.black.kingSide) newHash ^= this.castlingKeys.blackKingSide;
        if (oldRights.black.queenSide) newHash ^= this.castlingKeys.blackQueenSide;

        // XOR in new rights
        if (newRights.white.kingSide) newHash ^= this.castlingKeys.whiteKingSide;
        if (newRights.white.queenSide) newHash ^= this.castlingKeys.whiteQueenSide;
        if (newRights.black.kingSide) newHash ^= this.castlingKeys.blackKingSide;
        if (newRights.black.queenSide) newHash ^= this.castlingKeys.blackQueenSide;

        return newHash;
    }

    /**
     * Update hash for en passant target change
     * 
     * @param {BigInt} oldHash - Current hash
     * @param {Object|null} oldTarget - Previous en passant target
     * @param {Object|null} newTarget - New en passant target
     * @returns {BigInt} Updated hash
     */
    updateHashForEnPassant(oldHash, oldTarget, newTarget) {
        let newHash = oldHash;

        // XOR out old en passant
        if (oldTarget) {
            newHash ^= this.enPassantKeys[oldTarget.col];
        }

        // XOR in new en passant
        if (newTarget) {
            newHash ^= this.enPassantKeys[newTarget.col];
        }

        return newHash;
    }
}

// Singleton instance - initialized once and reused
// This ensures same random keys throughout the session
export const zobrist = new ZobristKeys();
