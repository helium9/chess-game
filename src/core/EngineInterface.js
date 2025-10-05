/**
 * Engine Interface
 * 
 * Provides clean, deterministic interface for:
 * - Future C++ alpha-beta engine integration
 * - Network synchronization
 * - UI components
 * 
 * Key principles:
 * - Deterministic action generation and application
 * - No hidden state or randomness
 * - Serializable at all times
 * - Strict separation of position (engine-visible) and UI state
 */

import { GameState } from './GameState.js';
import { History, applyHistoryOperation } from './History.js';
import { MoveAction, CombineAction, DecombineAction, validateAndApply, resetActionCounter } from './Action.js';
import { calculateLegalMoves } from '../utils/moveCalculator.js';
import { findEligiblePairs, getEligiblePartners } from '../utils/combinationRules.js';
import { findPlayerHybrids, findSpawnSquares, computeLegalAssignments } from '../utils/deCombinationRules.js';

/**
 * Chess Engine Interface
 * Main entry point for all game operations
 */
export class ChessEngine {
    constructor(initialState = null) {
        this.state = initialState || GameState.createInitial();
        this.history = new History();
        this.appliedActionIds = new Set(); // For idempotency checking
    }

    /**
     * Get position snapshot for engine evaluation
     * Engine-visible, deterministic, immutable
     */
    getPositionSnapshot() {
        return this.state.getPositionSnapshot();
    }

    /**
     * Get current game state (full access for UI)
     */
    getState() {
        return this.state;
    }

    /**
     * Get history manager
     */
    getHistory() {
        return this.history;
    }

    /**
     * List all legal actions from current position
     * Returns array of Action objects
     */
    listLegalActions() {
        const actions = [];
        const board = this.state.board;
        const currentTurn = this.state.sideToMove;
        const turnIndex = this.state.turnIndex;

        // 1. Generate legal moves
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (!piece) continue;

                const { getPieceColor } = require('../utils/constants.js');
                if (getPieceColor(piece) !== currentTurn) continue;

                const legalMoves = calculateLegalMoves(board, row, col, currentTurn);

                for (const move of legalMoves) {
                    const capturedPiece = board[move.row][move.col];
                    const moveAction = new MoveAction(
                        currentTurn,
                        turnIndex,
                        row,
                        col,
                        move.row,
                        move.col,
                        capturedPiece
                    );
                    actions.push(moveAction);
                }
            }
        }

        // 2. Generate legal combinations (if enabled)
        if (this.state.ruleOptions.allowCombinations) {
            const eligiblePairs = findEligiblePairs(board, currentTurn);

            for (const pair of eligiblePairs) {
                const combineAction = new CombineAction(
                    currentTurn,
                    turnIndex,
                    pair.square1.row,
                    pair.square1.col,
                    pair.square2.row,
                    pair.square2.col,
                    pair.square1.row, // Use square1 as anchor
                    pair.square1.col
                );

                // Validate before adding
                const validation = combineAction.validate(this.state);
                if (validation.valid) {
                    actions.push(combineAction);
                }
            }
        }

        // 3. Generate legal de-combinations (if enabled)
        if (this.state.ruleOptions.allowDecombinations) {
            const hybrids = findPlayerHybrids(board, currentTurn);

            for (const hybrid of hybrids) {
                const spawnSquares = findSpawnSquares(board, hybrid.row, hybrid.col);

                for (const spawn of spawnSquares) {
                    // Check if this de-combination is legal
                    const assignments = computeLegalAssignments(
                        board,
                        hybrid.row,
                        hybrid.col,
                        spawn,
                        currentTurn
                    );

                    if (assignments.legal && assignments.legal.length > 0) {
                        const decombineAction = new DecombineAction(
                            currentTurn,
                            turnIndex,
                            hybrid.row,
                            hybrid.col,
                            spawn.row,
                            spawn.col
                        );

                        actions.push(decombineAction);
                    }
                }
            }
        }

        return actions;
    }

    /**
     * Apply an action to the game state
     * Validates, applies, and records in history
     * 
     * @param {Action} action - The action to apply
     * @param {boolean} recordHistory - Whether to add to history (default true)
     * @returns {{success: boolean, state?: GameState, reason?: string}}
     */
    applyAction(action, recordHistory = true) {
        // Check for duplicate action (idempotency)
        if (this.appliedActionIds.has(action.action_id)) {
            return {
                success: true,
                state: this.state,
                reason: 'Action already applied (idempotent)',
                duplicate: true
            };
        }

        // Validate and apply
        const result = validateAndApply(action, this.state);

        if (!result.success) {
            return result;
        }

        // Store state before change (for history)
        const stateBefore = this.state.clone();

        // Create new state with changes
        const newState = this.state.clone();
        newState.board = result.stateData.board;

        // Handle captured pieces
        if (result.stateData.capturedPiece) {
            newState.addCapturedPiece(result.stateData.capturedPiece);
        }

        // Update turn and side
        newState.incrementTurn();
        newState.switchTurn();
        newState.invalidatePositionKey();

        // Compute position key for result checksum
        action.result_checksum = newState.getPositionKey();

        // Record in history
        if (recordHistory) {
            this.history.push(action, stateBefore, newState);
        }

        // Mark action as applied
        this.appliedActionIds.add(action.action_id);

        // Update state
        this.state = newState;

        return {
            success: true,
            state: this.state,
            action: action
        };
    }

    /**
     * Undo last action
     * Returns undone action and new state
     */
    undo() {
        if (!this.history.canUndo()) {
            return {
                success: false,
                reason: 'No actions to undo'
            };
        }

        const operation = this.history.undo();
        const result = applyHistoryOperation(this.state, operation);

        if (result.success) {
            this.state = result.state;

            return {
                success: true,
                state: this.state,
                action: operation.action
            };
        }

        return result;
    }

    /**
     * Redo last undone action
     * Returns redone action and new state
     */
    redo() {
        if (!this.history.canRedo()) {
            return {
                success: false,
                reason: 'No actions to redo'
            };
        }

        const operation = this.history.redo();
        const result = applyHistoryOperation(this.state, operation);

        if (result.success) {
            this.state = result.state;

            return {
                success: true,
                state: this.state,
                action: operation.action
            };
        }

        return result;
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.history.canUndo();
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.history.canRedo();
    }

    /**
     * Check for game-ending conditions
     * Returns {gameOver: boolean, result: string|null}
     */
    checkGameStatus() {
        const legalActions = this.listLegalActions();
        const inCheck = this.state.isInCheck(this.state.sideToMove);

        // Checkmate
        if (legalActions.length === 0 && inCheck) {
            const winner = this.state.sideToMove === 'white' ? 'black' : 'white';
            return {
                gameOver: true,
                result: `${winner}_win`,
                reason: 'checkmate'
            };
        }

        // Stalemate
        if (legalActions.length === 0 && !inCheck) {
            return {
                gameOver: true,
                result: 'draw',
                reason: 'stalemate'
            };
        }

        // Threefold repetition
        if (this.history.checkThreefoldRepetition(this.state.getPositionKey())) {
            return {
                gameOver: true,
                result: 'draw',
                reason: 'threefold_repetition'
            };
        }

        // 50-move rule (halfmove clock)
        if (this.state.halfmoveClock >= 100) {
            return {
                gameOver: true,
                result: 'draw',
                reason: 'fifty_move_rule'
            };
        }

        return {
            gameOver: false,
            result: null
        };
    }

    /**
     * Serialize complete engine state
     * Includes game state and history
     */
    serialize() {
        return {
            state: this.state.serialize(),
            history: this.history.serialize(),
            appliedActionIds: Array.from(this.appliedActionIds)
        };
    }

    /**
     * Deserialize engine state
     */
    static deserialize(data) {
        const state = GameState.deserialize(data.state);
        const engine = new ChessEngine(state);
        engine.history = History.deserialize(data.history);
        engine.appliedActionIds = new Set(data.appliedActionIds || []);
        return engine;
    }

    /**
     * Reset to initial state
     */
    reset() {
        this.state = GameState.createInitial();
        this.history = new History();
        this.appliedActionIds.clear();
        resetActionCounter();
    }

    /**
     * Load a saved game
     */
    loadGame(serializedData) {
        try {
            const engine = ChessEngine.deserialize(serializedData);
            this.state = engine.state;
            this.history = engine.history;
            this.appliedActionIds = engine.appliedActionIds;
            return { success: true };
        } catch (error) {
            return {
                success: false,
                reason: `Failed to load game: ${error.message}`
            };
        }
    }

    /**
     * Get game summary for display
     */
    getSummary() {
        const gameStatus = this.checkGameStatus();

        return {
            turnIndex: this.state.turnIndex,
            sideToMove: this.state.sideToMove,
            fullmoveNumber: this.state.fullmoveNumber,
            positionKey: this.state.getPositionKey(),
            inCheck: this.state.isInCheck(this.state.sideToMove),
            legalActionCount: this.listLegalActions().length,
            history: this.history.getSummary(),
            gameStatus: gameStatus,
            capturedPieces: this.state.capturedPieces
        };
    }
}

/**
 * Create a new chess engine instance
 */
export const createEngine = (initialState = null) => {
    return new ChessEngine(initialState);
};
