/**
 * History - Undo/Redo System
 * 
 * Implements bidirectional action history with branching support.
 * Tracks all applied actions with reversible state diffs.
 * 
 * Features:
 * - Full undo/redo for MOVE, COMBINE, DECOMBINE
 * - Branching semantics (redo cleared on new action)
 * - Efficient state diffing
 * - Serializable history
 */

import { createStateDiff } from './GameState.js';

/**
 * History Entry
 * Represents one applied action with enough data to reverse it
 */
class HistoryEntry {
    constructor(action, stateBefore, stateAfter) {
        this.action = action; // The Action object
        this.stateDiff = createStateDiff(stateBefore, stateAfter); // Efficient diff
        this.turnIndex = action.turn_index;
        this.positionKey = stateAfter.getPositionKey();
        this.timestamp = action.timestamp;
    }

    /**
     * Serialize entry
     */
    serialize() {
        return {
            action: this.action.serialize(),
            stateDiff: this.stateDiff,
            turnIndex: this.turnIndex,
            positionKey: this.positionKey,
            timestamp: this.timestamp
        };
    }

    /**
     * Deserialize entry
     */
    static deserialize(data) {
        const { deserializeAction } = require('./Action.js');
        const action = deserializeAction(data.action);

        // Create a minimal entry (stateDiff is already stored)
        const entry = Object.create(HistoryEntry.prototype);
        entry.action = action;
        entry.stateDiff = data.stateDiff;
        entry.turnIndex = data.turnIndex;
        entry.positionKey = data.positionKey;
        entry.timestamp = data.timestamp;

        return entry;
    }
}

/**
 * History Manager
 * Manages past and future action stacks
 */
export class History {
    constructor() {
        this.past = []; // Stack of HistoryEntry (oldest to newest)
        this.future = []; // Stack of undone entries (for redo)
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.past.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.future.length > 0;
    }

    /**
     * Get number of moves that can be undone
     */
    getUndoCount() {
        return this.past.length;
    }

    /**
     * Get number of moves that can be redone
     */
    getRedoCount() {
        return this.future.length;
    }

    /**
     * Push a new action to history
     * Clears future stack (branching behavior)
     */
    push(action, stateBefore, stateAfter) {
        const entry = new HistoryEntry(action, stateBefore, stateAfter);
        this.past.push(entry);

        // Clear redo stack on new action (branching)
        this.future = [];
    }

    /**
     * Undo last action
     * Returns the action that was undone and the state diff to apply
     */
    undo() {
        if (!this.canUndo()) {
            return null;
        }

        const entry = this.past.pop();
        this.future.push(entry);

        return {
            action: entry.action,
            stateDiff: entry.stateDiff,
            reverse: true // Apply diff in reverse
        };
    }

    /**
     * Redo last undone action
     * Returns the action to redo and the state diff to apply
     */
    redo() {
        if (!this.canRedo()) {
            return null;
        }

        const entry = this.future.pop();
        this.past.push(entry);

        return {
            action: entry.action,
            stateDiff: entry.stateDiff,
            reverse: false // Apply diff forward
        };
    }

    /**
     * Get last action (for display)
     */
    getLastAction() {
        if (this.past.length === 0) {
            return null;
        }
        return this.past[this.past.length - 1].action;
    }

    /**
     * Get action history as array (for display)
     */
    getActionHistory() {
        return this.past.map(entry => entry.action);
    }

    /**
     * Check for threefold repetition
     * Returns true if current position has occurred 3 times
     */
    checkThreefoldRepetition(currentPositionKey) {
        let count = 1; // Count current position

        for (const entry of this.past) {
            if (entry.positionKey === currentPositionKey) {
                count++;
                if (count >= 3) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Clear all history
     */
    clear() {
        this.past = [];
        this.future = [];
    }

    /**
     * Get history summary (for debugging)
     */
    getSummary() {
        return {
            pastCount: this.past.length,
            futureCount: this.future.length,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            lastAction: this.getLastAction()?.serialize() || null
        };
    }

    /**
     * Serialize history
     */
    serialize() {
        return {
            past: this.past.map(entry => entry.serialize()),
            future: this.future.map(entry => entry.serialize())
        };
    }

    /**
     * Deserialize history
     */
    static deserialize(data) {
        const history = new History();

        if (data.past) {
            history.past = data.past.map(entryData => HistoryEntry.deserialize(entryData));
        }

        if (data.future) {
            history.future = data.future.map(entryData => HistoryEntry.deserialize(entryData));
        }

        return history;
    }

    /**
     * Clone history
     */
    clone() {
        const cloned = new History();
        cloned.past = [...this.past];
        cloned.future = [...this.future];
        return cloned;
    }
}

/**
 * Reverse a MOVE action
 * Returns data needed to undo the move
 */
export const reverseMoveAction = (action, currentState) => {
    const { MoveAction } = require('./Action.js');

    // Create reverse move
    return new MoveAction(
        action.actor_color,
        action.turn_index,
        action.to_row, // Move back from destination
        action.to_col,
        action.from_row, // To original source
        action.from_col,
        null, // No capture on reverse
        `${action.action_id}_undo`
    );
};

/**
 * Reverse a COMBINE action
 * Returns data needed to undo the combination
 */
export const reverseCombineAction = (action, currentState) => {
    const { DecombineAction } = require('./Action.js');

    // Determine which square to spawn the second piece
    const square2Row = (action.placement_row === action.square1_row && action.placement_col === action.square1_col)
        ? action.square2_row
        : action.square1_row;
    const square2Col = (action.placement_row === action.square1_row && action.placement_col === action.square1_col)
        ? action.square2_col
        : action.square1_col;

    // Create de-combine action to reverse
    return new DecombineAction(
        action.actor_color,
        action.turn_index,
        action.placement_row, // Hybrid is at placement square
        action.placement_col,
        square2Row, // Spawn at the cleared square
        square2Col,
        action.piece1, // Restore original pieces
        action.piece2,
        `${action.action_id}_undo`
    );
};

/**
 * Reverse a DECOMBINE action
 * Returns data needed to undo the de-combination
 */
export const reverseDecombineAction = (action, currentState) => {
    const { CombineAction } = require('./Action.js');

    // Create combine action to reverse
    return new CombineAction(
        action.actor_color,
        action.turn_index,
        action.hybrid_row, // Original hybrid square has staying piece
        action.hybrid_col,
        action.spawn_row, // Spawn square has spawning piece
        action.spawn_col,
        action.hybrid_row, // Use hybrid square as anchor
        action.hybrid_col,
        action.original_hybrid, // Restore original hybrid
        action.hybrid_row, // Place back at hybrid square
        action.hybrid_col,
        `${action.action_id}_undo`
    );
};

/**
 * Apply history operation (undo or redo) to game state
 * This is used by the engine interface
 */
export const applyHistoryOperation = (state, operation) => {
    if (!operation) {
        return { success: false, reason: 'No operation to apply' };
    }

    // Apply state diff to restore board state
    const { applyStateDiff } = require('./GameState.js');
    const newState = applyStateDiff(state, operation.stateDiff, operation.reverse);

    return {
        success: true,
        state: newState,
        action: operation.action
    };
};
