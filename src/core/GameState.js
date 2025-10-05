/**
 * GameState - Canonical Game Model
 * 
 * Single source of truth for the game state.
 * Authoritative, deterministic, and serializable.
 * 
 * Strictly separates:
 * - Position snapshot (engine-visible, network-syncable)
 * - UI state (transient, local-only)
 */

import { INITIAL_BOARD, COLORS, copyBoard } from '../utils/constants.js';
import { computePositionKey } from './PositionKey.js';

/**
 * GameState class
 * Represents the complete authoritative state of a chess game
 */
export class GameState {
    constructor(config = {}) {
        // === AUTHORITATIVE FIELDS (Position Snapshot) ===

        /**
         * Board representation: 8x8 array
         * Each cell: '' (empty) or piece identifier (e.g., 'K', 'p', 'RB')
         */
        this.board = config.board ? copyBoard(config.board) : copyBoard(INITIAL_BOARD);

        /**
         * Side to move: 'white' or 'black'
         */
        this.sideToMove = config.sideToMove || COLORS.WHITE;

        /**
         * Turn index (ply number): starts at 0
         * Increments after each move
         */
        this.turnIndex = config.turnIndex ?? 0;

        /**
         * Castling rights (reserved for future implementation)
         * Format: { white: { kingSide: bool, queenSide: bool }, black: {...} }
         */
        this.castlingRights = config.castlingRights || {
            white: { kingSide: false, queenSide: false },
            black: { kingSide: false, queenSide: false }
        };

        /**
         * En passant target square (reserved for future implementation)
         * Format: { row, col } or null
         */
        this.enPassantTarget = config.enPassantTarget || null;

        /**
         * Halfmove clock (for 50-move rule, reserved)
         */
        this.halfmoveClock = config.halfmoveClock ?? 0;

        /**
         * Fullmove number (traditional chess notation)
         */
        this.fullmoveNumber = config.fullmoveNumber ?? 1;

        /**
         * Game result status
         * null (ongoing), 'white_win', 'black_win', 'draw', 'stalemate'
         */
        this.gameResult = config.gameResult || null;

        /**
         * Position key (hash) - for engine transposition tables and draw detection
         * Computed lazily and cached
         */
        this._positionKey = config.positionKey || null;

        /**
         * Rule options (variant-specific, affect engine behavior)
         */
        this.ruleOptions = config.ruleOptions || {
            allowCombinations: true,
            allowDecombinations: true
        };

        // === CAPTURED PIECES (for display, not part of position snapshot) ===
        this.capturedPieces = config.capturedPieces || {
            white: [],
            black: []
        };
    }

    /**
     * Get immutable position snapshot for engine
     * Only includes fields relevant to position evaluation
     */
    getPositionSnapshot() {
        return Object.freeze({
            board: this.board.map(row => [...row]), // Deep copy
            sideToMove: this.sideToMove,
            turnIndex: this.turnIndex,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
            halfmoveClock: this.halfmoveClock,
            positionKey: this.getPositionKey(),
            ruleOptions: { ...this.ruleOptions }
        });
    }

    /**
     * Get or compute position key (hash)
     * Uses Zobrist hashing for determinism
     */
    getPositionKey() {
        if (!this._positionKey) {
            this._positionKey = computePositionKey(this.getPositionSnapshot());
        }
        return this._positionKey;
    }

    /**
     * Invalidate cached position key (call after any board change)
     */
    invalidatePositionKey() {
        this._positionKey = null;
    }

    /**
     * Check if king is in check
     * @param {string} color - 'white' or 'black'
     */
    isInCheck(color) {
        const { isInCheck } = require('../utils/moveCalculator.js');
        return isInCheck(this.board, color);
    }

    /**
     * Switch side to move
     */
    switchTurn() {
        this.sideToMove = this.sideToMove === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        this.invalidatePositionKey();
    }

    /**
     * Increment turn index
     */
    incrementTurn() {
        this.turnIndex++;
        if (this.sideToMove === COLORS.BLACK) {
            this.fullmoveNumber++;
        }
    }

    /**
     * Add captured piece to history
     */
    addCapturedPiece(piece) {
        if (!piece) return;

        const { getPieceColor } = require('../utils/constants.js');
        const color = getPieceColor(piece);

        if (color === COLORS.WHITE) {
            this.capturedPieces.white.push(piece);
        } else if (color === COLORS.BLACK) {
            this.capturedPieces.black.push(piece);
        }
    }

    /**
     * Remove last captured piece (for undo)
     */
    removeLastCapturedPiece(color) {
        if (color === COLORS.WHITE && this.capturedPieces.white.length > 0) {
            return this.capturedPieces.white.pop();
        } else if (color === COLORS.BLACK && this.capturedPieces.black.length > 0) {
            return this.capturedPieces.black.pop();
        }
        return null;
    }

    /**
     * Clone this game state
     */
    clone() {
        return new GameState({
            board: this.board,
            sideToMove: this.sideToMove,
            turnIndex: this.turnIndex,
            castlingRights: this.castlingRights,
            enPassantTarget: this.enPassantTarget,
            halfmoveClock: this.halfmoveClock,
            fullmoveNumber: this.fullmoveNumber,
            gameResult: this.gameResult,
            positionKey: this._positionKey,
            ruleOptions: this.ruleOptions,
            capturedPieces: {
                white: [...this.capturedPieces.white],
                black: [...this.capturedPieces.black]
            }
        });
    }

    /**
     * Serialize to JSON-compatible object
     */
    serialize() {
        return {
            board: this.board,
            sideToMove: this.sideToMove,
            turnIndex: this.turnIndex,
            castlingRights: this.castlingRights,
            enPassantTarget: this.enPassantTarget,
            halfmoveClock: this.halfmoveClock,
            fullmoveNumber: this.fullmoveNumber,
            gameResult: this.gameResult,
            positionKey: this._positionKey,
            ruleOptions: this.ruleOptions,
            capturedPieces: this.capturedPieces
        };
    }

    /**
     * Deserialize from JSON data
     */
    static deserialize(data) {
        return new GameState(data);
    }

    /**
     * Create initial game state
     */
    static createInitial() {
        return new GameState();
    }
}

/**
 * Create a state diff between two states
 * Used for efficient undo/redo
 */
export const createStateDiff = (oldState, newState) => {
    const diff = {
        boardChanges: [],
        sideToMove: { old: oldState.sideToMove, new: newState.sideToMove },
        turnIndex: { old: oldState.turnIndex, new: newState.turnIndex },
        capturedPiece: null,
        positionKey: { old: oldState._positionKey, new: newState._positionKey }
    };

    // Find board changes
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (oldState.board[row][col] !== newState.board[row][col]) {
                diff.boardChanges.push({
                    row,
                    col,
                    oldPiece: oldState.board[row][col],
                    newPiece: newState.board[row][col]
                });
            }
        }
    }

    // Check for captured pieces
    if (newState.capturedPieces.white.length > oldState.capturedPieces.white.length) {
        diff.capturedPiece = newState.capturedPieces.white[newState.capturedPieces.white.length - 1];
    } else if (newState.capturedPieces.black.length > oldState.capturedPieces.black.length) {
        diff.capturedPiece = newState.capturedPieces.black[newState.capturedPieces.black.length - 1];
    }

    return diff;
};

/**
 * Apply a state diff to restore a previous state
 */
export const applyStateDiff = (state, diff, reverse = false) => {
    const newState = state.clone();

    // Apply board changes (in reverse if undoing)
    for (const change of diff.boardChanges) {
        newState.board[change.row][change.col] = reverse ? change.oldPiece : change.newPiece;
    }

    // Restore other fields
    newState.sideToMove = reverse ? diff.sideToMove.old : diff.sideToMove.new;
    newState.turnIndex = reverse ? diff.turnIndex.old : diff.turnIndex.new;
    newState._positionKey = reverse ? diff.positionKey.old : diff.positionKey.new;

    return newState;
};
