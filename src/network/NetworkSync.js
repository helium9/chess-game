/**
 * Network Synchronization Layer
 * 
 * Handles message ordering, idempotency, and state reconciliation.
 * Does NOT implement WebRTC signaling - that's left for future integration.
 * 
 * Authority Model: Single authoritative host
 * - Host validates and applies all actions
 * - Guest sends proposals, waits for authoritative APPLICATION
 * - Both parties maintain local engine but defer to host on conflicts
 */

import { ChessEngine } from '../core/EngineInterface.js';
import {
    MESSAGE_TYPES,
    PLAYER_ROLES,
    ActionProposedMessage,
    ActionAppliedMessage,
    ActionRejectedMessage,
    UndoRequestMessage,
    UndoAppliedMessage,
    UndoRejectedMessage,
    SyncRequestMessage,
    SyncSnapshotMessage,
    validateMessage
} from './MessageSchema.js';
import { deserializeAction } from '../core/Action.js';

/**
 * Network Sync Manager
 * Manages synchronization between two players
 */
export class NetworkSyncManager {
    constructor(gameId, playerId, role, sendMessageCallback) {
        this.gameId = gameId;
        this.playerId = playerId;
        this.role = role; // HOST or GUEST
        this.sendMessage = sendMessageCallback; // Function to send messages over network

        this.engine = new ChessEngine();
        this.sequenceNumber = 0;
        this.lastReceivedSequence = -1;
        this.pendingActions = new Map(); // action_id -> {action, timestamp}
        this.confirmedActions = new Set(); // Confirmed action IDs

        // Callbacks for UI updates
        this.onStateChange = null;
        this.onError = null;
        this.onSync = null;
    }

    /**
     * Get next sequence number
     */
    getNextSequenceNumber() {
        return this.sequenceNumber++;
    }

    /**
     * Check if we're the host (authority)
     */
    isHost() {
        return this.role === PLAYER_ROLES.HOST;
    }

    /**
     * Get current game state
     */
    getGameState() {
        return this.engine.getState();
    }

    /**
     * Get engine
     */
    getEngine() {
        return this.engine;
    }

    /**
     * Propose an action (from local player)
     * 
     * If HOST: validate and apply immediately, then broadcast
     * If GUEST: send proposal and wait for confirmation
     */
    proposeAction(action) {
        if (this.isHost()) {
            // Host applies directly
            const result = this.engine.applyAction(action);

            if (result.success) {
                // Broadcast to guest
                this.broadcastActionApplied(action);

                // Notify UI
                if (this.onStateChange) {
                    this.onStateChange(this.engine.getState());
                }

                return result;
            } else {
                if (this.onError) {
                    this.onError(result.reason);
                }
                return result;
            }
        } else {
            // Guest sends proposal
            const message = new ActionProposedMessage(
                this.gameId,
                this.playerId,
                this.role,
                action
            );
            message.sequence_number = this.getNextSequenceNumber();

            // Store as pending
            this.pendingActions.set(action.action_id, {
                action,
                timestamp: Date.now(),
                sequenceNumber: message.sequence_number
            });

            this.sendMessage(message.serialize());

            return {
                success: true,
                pending: true,
                action: action
            };
        }
    }

    /**
     * Handle incoming message
     */
    handleMessage(messageData) {
        // Validate message structure
        const validation = validateMessage(messageData);
        if (!validation.valid) {
            if (this.onError) {
                this.onError(`Invalid message: ${validation.reason}`);
            }
            return;
        }

        // Check sequence number for ordering
        if (messageData.sequence_number !== undefined) {
            if (messageData.sequence_number <= this.lastReceivedSequence) {
                // Out of order or duplicate - might need reordering logic
                console.warn('Out of order message:', messageData.sequence_number);
            }
            this.lastReceivedSequence = messageData.sequence_number;
        }

        // Route to handler based on type
        switch (messageData.type) {
            case MESSAGE_TYPES.ACTION_PROPOSED:
                this.handleActionProposed(messageData);
                break;
            case MESSAGE_TYPES.ACTION_APPLIED:
                this.handleActionApplied(messageData);
                break;
            case MESSAGE_TYPES.ACTION_REJECTED:
                this.handleActionRejected(messageData);
                break;
            case MESSAGE_TYPES.UNDO_REQUEST:
                this.handleUndoRequest(messageData);
                break;
            case MESSAGE_TYPES.UNDO_APPLIED:
                this.handleUndoApplied(messageData);
                break;
            case MESSAGE_TYPES.SYNC_REQUEST:
                this.handleSyncRequest(messageData);
                break;
            case MESSAGE_TYPES.SYNC_SNAPSHOT:
                this.handleSyncSnapshot(messageData);
                break;
            default:
                console.warn('Unhandled message type:', messageData.type);
        }
    }

    /**
     * Handle ACTION_PROPOSED (HOST only)
     */
    handleActionProposed(messageData) {
        if (!this.isHost()) {
            console.warn('Guest received ACTION_PROPOSED - ignoring');
            return;
        }

        // Deserialize action
        const action = deserializeAction(messageData.action);

        // Validate and apply
        const result = this.engine.applyAction(action);

        if (result.success) {
            // Send acceptance and broadcast application
            this.broadcastActionApplied(action);

            // Notify UI
            if (this.onStateChange) {
                this.onStateChange(this.engine.getState());
            }
        } else {
            // Send rejection
            const rejectMessage = new ActionRejectedMessage(
                this.gameId,
                this.playerId,
                action.action_id,
                result.reason
            );
            rejectMessage.sequence_number = this.getNextSequenceNumber();
            this.sendMessage(rejectMessage.serialize());
        }
    }

    /**
     * Handle ACTION_APPLIED (GUEST only, or HOST for logging)
     */
    handleActionApplied(messageData) {
        const action = deserializeAction(messageData.action);

        // Check for idempotency
        if (this.confirmedActions.has(action.action_id)) {
            console.log('Action already applied:', action.action_id);
            return;
        }

        // If guest, apply the authoritative action
        if (!this.isHost()) {
            // Check turn index matches
            if (action.turn_index !== this.engine.getState().turnIndex) {
                // Out of sync - request snapshot
                console.warn('Turn index mismatch - requesting sync');
                this.requestSync();
                return;
            }

            // Apply action
            const result = this.engine.applyAction(action, true);

            if (result.success) {
                // Remove from pending
                this.pendingActions.delete(action.action_id);
                this.confirmedActions.add(action.action_id);

                // Verify position key matches
                if (messageData.resulting_position_key !== this.engine.getState().getPositionKey()) {
                    console.warn('Position key mismatch after action - requesting sync');
                    this.requestSync();
                    return;
                }

                // Notify UI
                if (this.onStateChange) {
                    this.onStateChange(this.engine.getState());
                }
            } else {
                // Failed to apply - request sync
                console.error('Failed to apply authoritative action:', result.reason);
                this.requestSync();
            }
        }
    }

    /**
     * Handle ACTION_REJECTED (GUEST only)
     */
    handleActionRejected(messageData) {
        if (this.isHost()) {
            return;
        }

        // Remove from pending
        this.pendingActions.delete(messageData.action_id);

        // Notify UI of rejection
        if (this.onError) {
            this.onError(`Action rejected: ${messageData.reason}`);
        }
    }

    /**
     * Handle UNDO_REQUEST (HOST only)
     */
    handleUndoRequest(messageData) {
        if (!this.isHost()) {
            return;
        }

        // Apply undo
        const result = this.engine.undo();

        if (result.success) {
            // Broadcast undo applied
            this.broadcastUndoApplied(result.action);

            // Notify UI
            if (this.onStateChange) {
                this.onStateChange(this.engine.getState());
            }
        } else {
            // Send rejection
            const rejectMessage = new UndoRejectedMessage(
                this.gameId,
                this.playerId,
                result.reason
            );
            rejectMessage.sequence_number = this.getNextSequenceNumber();
            this.sendMessage(rejectMessage.serialize());
        }
    }

    /**
     * Handle UNDO_APPLIED
     */
    handleUndoApplied(messageData) {
        if (this.isHost()) {
            return; // Host already applied
        }

        // Apply undo
        const result = this.engine.undo();

        if (result.success) {
            // Verify position key
            if (messageData.resulting_position_key !== this.engine.getState().getPositionKey()) {
                console.warn('Position key mismatch after undo - requesting sync');
                this.requestSync();
                return;
            }

            // Notify UI
            if (this.onStateChange) {
                this.onStateChange(this.engine.getState());
            }
        } else {
            console.error('Failed to apply undo:', result.reason);
            this.requestSync();
        }
    }

    /**
     * Handle SYNC_REQUEST (HOST only)
     */
    handleSyncRequest(messageData) {
        if (!this.isHost()) {
            return;
        }

        // Send full snapshot
        this.sendSnapshot();
    }

    /**
     * Handle SYNC_SNAPSHOT (GUEST only)
     */
    handleSyncSnapshot(messageData) {
        if (this.isHost()) {
            return;
        }

        // Load full engine state
        const result = this.engine.loadGame(messageData.full_engine_state);

        if (result.success) {
            // Clear pending actions
            this.pendingActions.clear();

            // Notify UI
            if (this.onSync) {
                this.onSync(this.engine.getState());
            }
            if (this.onStateChange) {
                this.onStateChange(this.engine.getState());
            }
        } else {
            if (this.onError) {
                this.onError('Failed to sync: ' + result.reason);
            }
        }
    }

    /**
     * Broadcast ACTION_APPLIED
     */
    broadcastActionApplied(action) {
        const message = new ActionAppliedMessage(
            this.gameId,
            this.playerId,
            this.role,
            action,
            this.engine.getState().turnIndex,
            this.engine.getState().getPositionKey()
        );
        message.sequence_number = this.getNextSequenceNumber();
        this.sendMessage(message.serialize());
    }

    /**
     * Broadcast UNDO_APPLIED
     */
    broadcastUndoApplied(undoneAction) {
        const message = new UndoAppliedMessage(
            this.gameId,
            this.playerId,
            this.role,
            undoneAction.action_id,
            this.engine.getState().turnIndex,
            this.engine.getState().getPositionKey()
        );
        message.sequence_number = this.getNextSequenceNumber();
        this.sendMessage(message.serialize());
    }

    /**
     * Request full state sync
     */
    requestSync() {
        const message = new SyncRequestMessage(
            this.gameId,
            this.playerId,
            this.role,
            this.engine.getState().turnIndex
        );
        message.sequence_number = this.getNextSequenceNumber();
        this.sendMessage(message.serialize());
    }

    /**
     * Send full snapshot (HOST only)
     */
    sendSnapshot() {
        if (!this.isHost()) {
            return;
        }

        const message = new SyncSnapshotMessage(
            this.gameId,
            this.playerId,
            this.engine.serialize()
        );
        message.sequence_number = this.getNextSequenceNumber();
        this.sendMessage(message.serialize());
    }

    /**
     * Request undo (GUEST sends request, HOST applies directly)
     */
    requestUndo() {
        if (this.isHost()) {
            // Host applies directly
            const result = this.engine.undo();
            if (result.success) {
                this.broadcastUndoApplied(result.action);
                if (this.onStateChange) {
                    this.onStateChange(this.engine.getState());
                }
            }
            return result;
        } else {
            // Guest sends request
            const message = new UndoRequestMessage(
                this.gameId,
                this.playerId,
                this.role
            );
            message.sequence_number = this.getNextSequenceNumber();
            this.sendMessage(message.serialize());

            return { success: true, pending: true };
        }
    }

    /**
     * Get pending actions count
     */
    getPendingCount() {
        return this.pendingActions.size;
    }

    /**
     * Check if there are pending actions
     */
    hasPendingActions() {
        return this.pendingActions.size > 0;
    }
}

/**
 * Create a network sync manager
 */
export const createNetworkSync = (gameId, playerId, role, sendMessageCallback) => {
    return new NetworkSyncManager(gameId, playerId, role, sendMessageCallback);
};
