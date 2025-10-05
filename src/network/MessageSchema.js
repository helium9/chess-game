/**
 * Network Message Schema
 * 
 * Defines all message types for WebRTC-based multiplayer games.
 * 
 * Design principles:
 * - Deterministic: All fields needed to apply actions are included
 * - Idempotent: Messages can be safely re-received
 * - Ordered: Sequence numbers detect loss/reorder
 * - Authoritative: Clear authority model (host or peer)
 */

/**
 * Message Types (frozen)
 */
export const MESSAGE_TYPES = Object.freeze({
    // Game initialization
    GAME_INIT: 'GAME_INIT',
    GAME_INIT_ACK: 'GAME_INIT_ACK',

    // Action flow
    ACTION_PROPOSED: 'ACTION_PROPOSED',
    ACTION_ACCEPTED: 'ACTION_ACCEPTED',
    ACTION_REJECTED: 'ACTION_REJECTED',
    ACTION_APPLIED: 'ACTION_APPLIED',

    // Undo/Redo flow
    UNDO_REQUEST: 'UNDO_REQUEST',
    UNDO_ACCEPTED: 'UNDO_ACCEPTED',
    UNDO_REJECTED: 'UNDO_REJECTED',
    UNDO_APPLIED: 'UNDO_APPLIED',

    REDO_REQUEST: 'REDO_REQUEST',
    REDO_ACCEPTED: 'REDO_ACCEPTED',
    REDO_REJECTED: 'REDO_REJECTED',
    REDO_APPLIED: 'REDO_APPLIED',

    // Synchronization
    SYNC_REQUEST: 'SYNC_REQUEST',
    SYNC_SNAPSHOT: 'SYNC_SNAPSHOT',

    // Game control
    RESIGN: 'RESIGN',
    DRAW_OFFER: 'DRAW_OFFER',
    DRAW_ACCEPT: 'DRAW_ACCEPT',
    DRAW_DECLINE: 'DRAW_DECLINE',

    // Connection
    PING: 'PING',
    PONG: 'PONG',
    DISCONNECT: 'DISCONNECT'
});

/**
 * Player Roles
 */
export const PLAYER_ROLES = Object.freeze({
    HOST: 'HOST',       // Authoritative player
    GUEST: 'GUEST'      // Non-authoritative player
});

/**
 * Base message structure
 * All messages extend this
 */
class NetworkMessage {
    constructor(type, gameId, senderId, senderRole) {
        this.type = type;
        this.game_id = gameId;
        this.sender_id = senderId;
        this.sender_role = senderRole;
        this.sequence_number = null; // Set by network layer
        this.timestamp = Date.now();
    }

    serialize() {
        return {
            type: this.type,
            game_id: this.game_id,
            sender_id: this.sender_id,
            sender_role: this.sender_role,
            sequence_number: this.sequence_number,
            timestamp: this.timestamp
        };
    }
}

/**
 * GAME_INIT - Sent by host to initialize game
 */
export class GameInitMessage extends NetworkMessage {
    constructor(gameId, senderId, initialState, ruleOptions, playerColors) {
        super(MESSAGE_TYPES.GAME_INIT, gameId, senderId, PLAYER_ROLES.HOST);
        this.initial_state = initialState; // Serialized GameState
        this.rule_options = ruleOptions;
        this.player_colors = playerColors; // { host: 'white', guest: 'black' }
    }

    serialize() {
        return {
            ...super.serialize(),
            initial_state: this.initial_state,
            rule_options: this.rule_options,
            player_colors: this.player_colors
        };
    }
}

/**
 * GAME_INIT_ACK - Sent by guest to confirm receipt
 */
export class GameInitAckMessage extends NetworkMessage {
    constructor(gameId, senderId) {
        super(MESSAGE_TYPES.GAME_INIT_ACK, gameId, senderId, PLAYER_ROLES.GUEST);
        this.ready = true;
    }

    serialize() {
        return {
            ...super.serialize(),
            ready: this.ready
        };
    }
}

/**
 * ACTION_PROPOSED - Player proposes an action
 */
export class ActionProposedMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole, action) {
        super(MESSAGE_TYPES.ACTION_PROPOSED, gameId, senderId, senderRole);
        this.action = action.serialize(); // Serialized Action
    }

    serialize() {
        return {
            ...super.serialize(),
            action: this.action
        };
    }
}

/**
 * ACTION_ACCEPTED - Host accepts proposed action
 */
export class ActionAcceptedMessage extends NetworkMessage {
    constructor(gameId, senderId, actionId) {
        super(MESSAGE_TYPES.ACTION_ACCEPTED, gameId, senderId, PLAYER_ROLES.HOST);
        this.action_id = actionId;
    }

    serialize() {
        return {
            ...super.serialize(),
            action_id: this.action_id
        };
    }
}

/**
 * ACTION_REJECTED - Host rejects proposed action
 */
export class ActionRejectedMessage extends NetworkMessage {
    constructor(gameId, senderId, actionId, reason) {
        super(MESSAGE_TYPES.ACTION_REJECTED, gameId, senderId, PLAYER_ROLES.HOST);
        this.action_id = actionId;
        this.reason = reason;
    }

    serialize() {
        return {
            ...super.serialize(),
            action_id: this.action_id,
            reason: this.reason
        };
    }
}

/**
 * ACTION_APPLIED - Authoritative action application
 * Sent after action is validated and applied
 */
export class ActionAppliedMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole, action, resultingTurnIndex, resultingPositionKey) {
        super(MESSAGE_TYPES.ACTION_APPLIED, gameId, senderId, senderRole);
        this.action = action.serialize(); // Fully resolved action
        this.resulting_turn_index = resultingTurnIndex;
        this.resulting_position_key = resultingPositionKey;
    }

    serialize() {
        return {
            ...super.serialize(),
            action: this.action,
            resulting_turn_index: this.resulting_turn_index,
            resulting_position_key: this.resulting_position_key
        };
    }
}

/**
 * UNDO_REQUEST - Request to undo last action
 */
export class UndoRequestMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole) {
        super(MESSAGE_TYPES.UNDO_REQUEST, gameId, senderId, senderRole);
    }
}

/**
 * UNDO_ACCEPTED - Host accepts undo request
 */
export class UndoAcceptedMessage extends NetworkMessage {
    constructor(gameId, senderId) {
        super(MESSAGE_TYPES.UNDO_ACCEPTED, gameId, senderId, PLAYER_ROLES.HOST);
    }
}

/**
 * UNDO_REJECTED - Host rejects undo request
 */
export class UndoRejectedMessage extends NetworkMessage {
    constructor(gameId, senderId, reason) {
        super(MESSAGE_TYPES.UNDO_REJECTED, gameId, senderId, PLAYER_ROLES.HOST);
        this.reason = reason;
    }

    serialize() {
        return {
            ...super.serialize(),
            reason: this.reason
        };
    }
}

/**
 * UNDO_APPLIED - Undo was applied
 */
export class UndoAppliedMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole, undoneActionId, resultingTurnIndex, resultingPositionKey) {
        super(MESSAGE_TYPES.UNDO_APPLIED, gameId, senderId, senderRole);
        this.undone_action_id = undoneActionId;
        this.resulting_turn_index = resultingTurnIndex;
        this.resulting_position_key = resultingPositionKey;
    }

    serialize() {
        return {
            ...super.serialize(),
            undone_action_id: this.undone_action_id,
            resulting_turn_index: this.resulting_turn_index,
            resulting_position_key: this.resulting_position_key
        };
    }
}

/**
 * REDO_REQUEST - Request to redo last undone action
 */
export class RedoRequestMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole) {
        super(MESSAGE_TYPES.REDO_REQUEST, gameId, senderId, senderRole);
    }
}

/**
 * REDO_ACCEPTED - Host accepts redo request
 */
export class RedoAcceptedMessage extends NetworkMessage {
    constructor(gameId, senderId) {
        super(MESSAGE_TYPES.REDO_ACCEPTED, gameId, senderId, PLAYER_ROLES.HOST);
    }
}

/**
 * REDO_REJECTED - Host rejects redo request
 */
export class RedoRejectedMessage extends NetworkMessage {
    constructor(gameId, senderId, reason) {
        super(MESSAGE_TYPES.REDO_REJECTED, gameId, senderId, PLAYER_ROLES.HOST);
        this.reason = reason;
    }

    serialize() {
        return {
            ...super.serialize(),
            reason: this.reason
        };
    }
}

/**
 * REDO_APPLIED - Redo was applied
 */
export class RedoAppliedMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole, redoneActionId, resultingTurnIndex, resultingPositionKey) {
        super(MESSAGE_TYPES.REDO_APPLIED, gameId, senderId, senderRole);
        this.redone_action_id = redoneActionId;
        this.resulting_turn_index = resultingTurnIndex;
        this.resulting_position_key = resultingPositionKey;
    }

    serialize() {
        return {
            ...super.serialize(),
            redone_action_id: this.redone_action_id,
            resulting_turn_index: this.resulting_turn_index,
            resulting_position_key: this.resulting_position_key
        };
    }
}

/**
 * SYNC_REQUEST - Request full state synchronization
 */
export class SyncRequestMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole, currentTurnIndex) {
        super(MESSAGE_TYPES.SYNC_REQUEST, gameId, senderId, senderRole);
        this.current_turn_index = currentTurnIndex;
    }

    serialize() {
        return {
            ...super.serialize(),
            current_turn_index: this.current_turn_index
        };
    }
}

/**
 * SYNC_SNAPSHOT - Full authoritative state
 */
export class SyncSnapshotMessage extends NetworkMessage {
    constructor(gameId, senderId, fullEngineState) {
        super(MESSAGE_TYPES.SYNC_SNAPSHOT, gameId, senderId, PLAYER_ROLES.HOST);
        this.full_engine_state = fullEngineState; // Serialized ChessEngine
    }

    serialize() {
        return {
            ...super.serialize(),
            full_engine_state: this.full_engine_state
        };
    }
}

/**
 * RESIGN - Player resigns
 */
export class ResignMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole) {
        super(MESSAGE_TYPES.RESIGN, gameId, senderId, senderRole);
    }
}

/**
 * DRAW_OFFER - Offer a draw
 */
export class DrawOfferMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole) {
        super(MESSAGE_TYPES.DRAW_OFFER, gameId, senderId, senderRole);
    }
}

/**
 * DRAW_ACCEPT - Accept draw offer
 */
export class DrawAcceptMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole) {
        super(MESSAGE_TYPES.DRAW_ACCEPT, gameId, senderId, senderRole);
    }
}

/**
 * DRAW_DECLINE - Decline draw offer
 */
export class DrawDeclineMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole) {
        super(MESSAGE_TYPES.DRAW_DECLINE, gameId, senderId, senderRole);
    }
}

/**
 * PING - Connection health check
 */
export class PingMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole) {
        super(MESSAGE_TYPES.PING, gameId, senderId, senderRole);
    }
}

/**
 * PONG - Response to PING
 */
export class PongMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole, pingTimestamp) {
        super(MESSAGE_TYPES.PONG, gameId, senderId, senderRole);
        this.ping_timestamp = pingTimestamp;
    }

    serialize() {
        return {
            ...super.serialize(),
            ping_timestamp: this.ping_timestamp
        };
    }
}

/**
 * DISCONNECT - Graceful disconnection
 */
export class DisconnectMessage extends NetworkMessage {
    constructor(gameId, senderId, senderRole, reason) {
        super(MESSAGE_TYPES.DISCONNECT, gameId, senderId, senderRole);
        this.reason = reason;
    }

    serialize() {
        return {
            ...super.serialize(),
            reason: this.reason
        };
    }
}

/**
 * Deserialize any message from JSON
 */
export const deserializeMessage = (data) => {
    // Basic message reconstruction
    // Specific message classes can be instantiated based on type
    return data;
};

/**
 * Validate message structure
 */
export const validateMessage = (message) => {
    if (!message.type || !MESSAGE_TYPES[message.type]) {
        return { valid: false, reason: 'Invalid message type' };
    }

    if (!message.game_id) {
        return { valid: false, reason: 'Missing game_id' };
    }

    if (!message.sender_id) {
        return { valid: false, reason: 'Missing sender_id' };
    }

    if (!message.sender_role || !PLAYER_ROLES[message.sender_role]) {
        return { valid: false, reason: 'Invalid sender_role' };
    }

    return { valid: true };
};
