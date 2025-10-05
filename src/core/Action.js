/**
 * Action Model
 * 
 * Defines the uniform action interface for all gameplay changes.
 * Actions are immutable, deterministic, and can be applied idempotently.
 * 
 * All gameplay modifications (moves, combinations, de-combinations) flow through Actions.
 * This ensures compatibility with:
 * - Engine integration (deterministic replay)
 * - Network synchronization (idempotent application)
 * - Undo/Redo system (reversible operations)
 */

// Action Types (frozen)
export const ACTION_TYPES = Object.freeze({
    MOVE: 'MOVE',
    COMBINE: 'COMBINE',
    DECOMBINE: 'DECOMBINE',
    CASTLE: 'CASTLE',         // Castling move
    PROMOTE: 'PROMOTE',       // Pawn promotion
    SYSTEM: 'SYSTEM'          // Reserved for resign, draw offers, etc.
});

// Action counter for generating unique IDs within a game session
let actionCounter = 0;

/**
 * Reset action counter (call when starting a new game)
 */
export const resetActionCounter = () => {
    actionCounter = 0;
};

/**
 * Generate unique action ID
 * Format: {side}_{turnIndex}_{counter}
 */
const generateActionId = (actorColor, turnIndex) => {
    const id = `${actorColor}_${turnIndex}_${actionCounter}`;
    actionCounter++;
    return id;
};

/**
 * Base Action class
 * All actions must extend this and implement validate() and getResultingState()
 */
class Action {
    constructor(actorColor, turnIndex, actionId = null) {
        this.action_id = actionId || generateActionId(actorColor, turnIndex);
        this.actor_color = actorColor;
        this.turn_index = turnIndex;
        this.timestamp = Date.now();
        this.result_checksum = null; // Placeholder for position hash after application
    }

    /**
     * Validate action against current game state
     * @param {GameState} state - Current game state
     * @returns {{valid: boolean, reason?: string}}
     */
    validate(state) {
        throw new Error('validate() must be implemented by subclass');
    }

    /**
     * Apply action to game state and return new state
     * @param {GameState} state - Current game state
     * @returns {GameState} New game state
     */
    apply(state) {
        throw new Error('apply() must be implemented by subclass');
    }

    /**
     * Serialize action to JSON-compatible object
     */
    serialize() {
        return {
            type: this.constructor.ACTION_TYPE,
            action_id: this.action_id,
            actor_color: this.actor_color,
            turn_index: this.turn_index,
            timestamp: this.timestamp,
            result_checksum: this.result_checksum
        };
    }

    /**
     * Check if this action has the same ID as another
     */
    equals(other) {
        return this.action_id === other?.action_id;
    }
}

/**
 * MOVE Action
 * Represents a standard piece move (including captures)
 */
export class MoveAction extends Action {
    static ACTION_TYPE = ACTION_TYPES.MOVE;

    constructor(actorColor, turnIndex, fromRow, fromCol, toRow, toCol, capturedPiece = null, isEnPassant = false, actionId = null) {
        super(actorColor, turnIndex, actionId);
        this.from_row = fromRow;
        this.from_col = fromCol;
        this.to_row = toRow;
        this.to_col = toCol;
        this.captured_piece = capturedPiece; // null if no capture
        this.moving_piece = null; // Set during validation
        this.is_en_passant = isEnPassant; // True if this is an en passant capture
        this.en_passant_target_created = null; // Set if this move creates an en passant target
    }

    validate(state) {
        // Check turn index matches
        if (this.turn_index !== state.turnIndex) {
            return {
                valid: false,
                reason: `Turn index mismatch: expected ${state.turnIndex}, got ${this.turn_index}`
            };
        }

        // Check actor is current side to move
        if (this.actor_color !== state.sideToMove) {
            return {
                valid: false,
                reason: `Not ${this.actor_color}'s turn`
            };
        }

        // Check piece exists and belongs to actor
        const piece = state.board[this.from_row]?.[this.from_col];
        if (!piece) {
            return { valid: false, reason: 'No piece at source square' };
        }

        // Import getPieceColor from constants
        const { getPieceColor } = require('../utils/constants.js');
        if (getPieceColor(piece) !== this.actor_color) {
            return { valid: false, reason: 'Piece does not belong to actor' };
        }

        // Store moving piece for later use
        this.moving_piece = piece;

        // Check for en passant capture
        const isPawn = piece.toLowerCase() === 'p';
        if (isPawn && state.enPassantTarget) {
            const epTarget = state.enPassantTarget;
            if (this.to_row === epTarget.row && this.to_col === epTarget.col) {
                // This is an en passant capture
                this.is_en_passant = true;
                // The captured pawn is one rank away from the target square
                const captureRow = this.actor_color === 'white' ? epTarget.row + 1 : epTarget.row - 1;
                this.captured_piece = state.board[captureRow][epTarget.col];
            }
        }

        // Validate move legality using existing move validation
        const { isValidMove } = require('../utils/moveValidation.js');
        if (!isValidMove(state.board, this.from_row, this.from_col, this.to_row, this.to_col, state.enPassantTarget)) {
            return { valid: false, reason: 'Illegal move' };
        }

        // Check if move would expose king to check
        const { wouldBeInCheck } = require('../utils/moveCalculator.js');
        if (wouldBeInCheck(state.board, this.from_row, this.from_col, this.to_row, this.to_col, this.actor_color)) {
            return { valid: false, reason: 'Move would expose king to check' };
        }

        // Check if this move creates an en passant target (pawn moves two squares)
        if (isPawn && Math.abs(this.to_row - this.from_row) === 2) {
            // This pawn move creates an en passant target
            const targetRow = this.actor_color === 'white' ? this.from_row - 1 : this.from_row + 1;
            this.en_passant_target_created = { row: targetRow, col: this.from_col };
        }

        return { valid: true };
    }

    apply(state) {
        // Import necessary functions
        const { copyBoard } = require('../utils/gameState.js');

        // Create new board
        const newBoard = copyBoard(state.board);

        // Handle en passant capture
        if (this.is_en_passant) {
            // Remove the captured pawn
            const captureRow = this.actor_color === 'white' ? this.to_row + 1 : this.to_row - 1;
            newBoard[captureRow][this.to_col] = '';
        } else {
            // Regular capture
            const capturedPiece = newBoard[this.to_row][this.to_col];
            if (!this.captured_piece && capturedPiece) {
                this.captured_piece = capturedPiece;
            }
        }

        // Execute move
        newBoard[this.to_row][this.to_col] = newBoard[this.from_row][this.from_col];
        newBoard[this.from_row][this.from_col] = '';

        // Update castling rights if king or rook moved
        const newCastlingRights = JSON.parse(JSON.stringify(state.castlingRights));
        const piece = this.moving_piece;

        // King moved - lose all castling rights
        if (piece.toLowerCase() === 'k') {
            newCastlingRights[this.actor_color].kingSide = false;
            newCastlingRights[this.actor_color].queenSide = false;
        }

        // Rook moved - lose corresponding castling right
        if (piece.toLowerCase() === 'r') {
            const isKingSideRook = (this.actor_color === 'white' && this.from_row === 7 && this.from_col === 7) ||
                (this.actor_color === 'black' && this.from_row === 0 && this.from_col === 7);
            const isQueenSideRook = (this.actor_color === 'white' && this.from_row === 7 && this.from_col === 0) ||
                (this.actor_color === 'black' && this.from_row === 0 && this.from_col === 0);

            if (isKingSideRook) {
                newCastlingRights[this.actor_color].kingSide = false;
            } else if (isQueenSideRook) {
                newCastlingRights[this.actor_color].queenSide = false;
            }
        }

        // Rook captured - opponent loses corresponding castling right
        if (this.captured_piece && this.captured_piece.toLowerCase() === 'r') {
            const opponentColor = this.actor_color === 'white' ? 'black' : 'white';
            const isKingSideRook = (opponentColor === 'white' && this.to_row === 7 && this.to_col === 7) ||
                (opponentColor === 'black' && this.to_row === 0 && this.to_col === 7);
            const isQueenSideRook = (opponentColor === 'white' && this.to_row === 7 && this.to_col === 0) ||
                (opponentColor === 'black' && this.to_row === 0 && this.to_col === 0);

            if (isKingSideRook) {
                newCastlingRights[opponentColor].kingSide = false;
            } else if (isQueenSideRook) {
                newCastlingRights[opponentColor].queenSide = false;
            }
        }

        // Return new state data
        return {
            board: newBoard,
            capturedPiece: this.captured_piece,
            castlingRights: newCastlingRights,
            enPassantTarget: this.en_passant_target_created
        };
    }

    serialize() {
        return {
            ...super.serialize(),
            from_row: this.from_row,
            from_col: this.from_col,
            to_row: this.to_row,
            to_col: this.to_col,
            captured_piece: this.captured_piece,
            moving_piece: this.moving_piece,
            is_en_passant: this.is_en_passant,
            en_passant_target_created: this.en_passant_target_created
        };
    }

    static deserialize(data) {
        const action = new MoveAction(
            data.actor_color,
            data.turn_index,
            data.from_row,
            data.from_col,
            data.to_row,
            data.to_col,
            data.captured_piece,
            data.is_en_passant,
            data.action_id
        );
        action.moving_piece = data.moving_piece;
        action.en_passant_target_created = data.en_passant_target_created;
        action.result_checksum = data.result_checksum;
        action.timestamp = data.timestamp;
        return action;
    }
}

/**
 * COMBINE Action
 * Represents combining two pieces into a hybrid
 */
export class CombineAction extends Action {
    static ACTION_TYPE = ACTION_TYPES.COMBINE;

    constructor(
        actorColor,
        turnIndex,
        square1Row,
        square1Col,
        square2Row,
        square2Col,
        anchorRow,
        anchorCol,
        hybridIdentity = null,
        placementRow = null,
        placementCol = null,
        actionId = null
    ) {
        super(actorColor, turnIndex, actionId);
        this.square1_row = square1Row;
        this.square1_col = square1Col;
        this.square2_row = square2Row;
        this.square2_col = square2Col;
        this.anchor_row = anchorRow;
        this.anchor_col = anchorCol;

        // Deterministic fields (computed during validation if not provided)
        this.hybrid_identity = hybridIdentity;
        this.placement_row = placementRow;
        this.placement_col = placementCol;

        // Cached for reversal
        this.piece1 = null;
        this.piece2 = null;
    }

    validate(state) {
        // Check turn index matches
        if (this.turn_index !== state.turnIndex) {
            return {
                valid: false,
                reason: `Turn index mismatch: expected ${state.turnIndex}, got ${this.turn_index}`
            };
        }

        // Check actor is current side to move
        if (this.actor_color !== state.sideToMove) {
            return {
                valid: false,
                reason: `Not ${this.actor_color}'s turn`
            };
        }

        const piece1 = state.board[this.square1_row]?.[this.square1_col];
        const piece2 = state.board[this.square2_row]?.[this.square2_col];

        if (!piece1 || !piece2) {
            return { valid: false, reason: 'One or both squares are empty' };
        }

        // Cache pieces
        this.piece1 = piece1;
        this.piece2 = piece2;

        // Validate combination using existing rules
        const { validateCombination } = require('../utils/combinationRules.js');
        const validation = validateCombination(
            state.board,
            this.square1_row,
            this.square1_col,
            this.square2_row,
            this.square2_col,
            this.anchor_row,
            this.anchor_col,
            state.sideToMove
        );

        if (!validation.valid) {
            return validation;
        }

        // Compute deterministic fields if not provided
        if (!this.hybrid_identity) {
            const { createHybridPiece } = require('../utils/combinationRules.js');
            this.hybrid_identity = createHybridPiece(piece1, piece2);
        }

        if (this.placement_row === null || this.placement_col === null) {
            const { determinePlacementSquare } = require('../utils/combinationRules.js');
            const placement = determinePlacementSquare(
                piece1, this.square1_row, this.square1_col,
                piece2, this.square2_row, this.square2_col,
                this.anchor_row, this.anchor_col
            );
            this.placement_row = placement.row;
            this.placement_col = placement.col;
        }

        return { valid: true };
    }

    apply(state) {
        const { copyBoard } = require('../utils/gameState.js');

        // Create new board
        const newBoard = copyBoard(state.board);

        // Place hybrid at placement square
        newBoard[this.placement_row][this.placement_col] = this.hybrid_identity;

        // Clear the other square
        if (this.placement_row === this.square1_row && this.placement_col === this.square1_col) {
            newBoard[this.square2_row][this.square2_col] = '';
        } else {
            newBoard[this.square1_row][this.square1_col] = '';
        }

        return { board: newBoard };
    }

    serialize() {
        return {
            ...super.serialize(),
            square1_row: this.square1_row,
            square1_col: this.square1_col,
            square2_row: this.square2_row,
            square2_col: this.square2_col,
            anchor_row: this.anchor_row,
            anchor_col: this.anchor_col,
            hybrid_identity: this.hybrid_identity,
            placement_row: this.placement_row,
            placement_col: this.placement_col,
            piece1: this.piece1,
            piece2: this.piece2
        };
    }

    static deserialize(data) {
        const action = new CombineAction(
            data.actor_color,
            data.turn_index,
            data.square1_row,
            data.square1_col,
            data.square2_row,
            data.square2_col,
            data.anchor_row,
            data.anchor_col,
            data.hybrid_identity,
            data.placement_row,
            data.placement_col,
            data.action_id
        );
        action.piece1 = data.piece1;
        action.piece2 = data.piece2;
        action.result_checksum = data.result_checksum;
        action.timestamp = data.timestamp;
        return action;
    }
}

/**
 * DECOMBINE Action
 * Represents splitting a hybrid into its components
 */
export class DecombineAction extends Action {
    static ACTION_TYPE = ACTION_TYPES.DECOMBINE;

    constructor(
        actorColor,
        turnIndex,
        hybridRow,
        hybridCol,
        spawnRow,
        spawnCol,
        stayingPiece = null,
        spawningPiece = null,
        actionId = null
    ) {
        super(actorColor, turnIndex, actionId);
        this.hybrid_row = hybridRow;
        this.hybrid_col = hybridCol;
        this.spawn_row = spawnRow;
        this.spawn_col = spawnCol;

        // Deterministic assignment (computed during validation if not provided)
        this.staying_piece = stayingPiece;
        this.spawning_piece = spawningPiece;

        // Cached for reversal
        this.original_hybrid = null;
    }

    validate(state) {
        // Check turn index matches
        if (this.turn_index !== state.turnIndex) {
            return {
                valid: false,
                reason: `Turn index mismatch: expected ${state.turnIndex}, got ${this.turn_index}`
            };
        }

        // Check actor is current side to move
        if (this.actor_color !== state.sideToMove) {
            return {
                valid: false,
                reason: `Not ${this.actor_color}'s turn`
            };
        }

        const hybrid = state.board[this.hybrid_row]?.[this.hybrid_col];

        if (!hybrid) {
            return { valid: false, reason: 'No piece at hybrid square' };
        }

        // Cache original hybrid
        this.original_hybrid = hybrid;

        // Validate de-combination using existing rules
        const { validateDeCombination } = require('../utils/deCombinationRules.js');
        const validation = validateDeCombination(
            state.board,
            this.hybrid_row,
            this.hybrid_col,
            this.spawn_row,
            this.spawn_col,
            state.sideToMove
        );

        if (!validation.valid) {
            return validation;
        }

        // Compute deterministic assignment if not provided
        if (!this.staying_piece || !this.spawning_piece) {
            const { computeLegalAssignments, selectDeterministicAssignment } = require('../utils/deCombinationRules.js');
            const assignments = computeLegalAssignments(
                state.board,
                this.hybrid_row,
                this.hybrid_col,
                this.spawn_row,
                this.spawn_col,
                state.sideToMove
            );

            if (assignments.length === 0) {
                return { valid: false, reason: 'No legal assignments found' };
            }

            // Use deterministic selection if multiple assignments
            const selectedAssignment = selectDeterministicAssignment(assignments);
            this.staying_piece = selectedAssignment.staying;
            this.spawning_piece = selectedAssignment.spawning;
        }

        return { valid: true };
    }

    apply(state) {
        const { copyBoard } = require('../utils/gameState.js');

        // Create new board
        const newBoard = copyBoard(state.board);

        // Place components
        newBoard[this.hybrid_row][this.hybrid_col] = this.staying_piece;
        newBoard[this.spawn_row][this.spawn_col] = this.spawning_piece;

        return { board: newBoard };
    }

    serialize() {
        return {
            ...super.serialize(),
            hybrid_row: this.hybrid_row,
            hybrid_col: this.hybrid_col,
            spawn_row: this.spawn_row,
            spawn_col: this.spawn_col,
            staying_piece: this.staying_piece,
            spawning_piece: this.spawning_piece,
            original_hybrid: this.original_hybrid
        };
    }

    static deserialize(data) {
        const action = new DecombineAction(
            data.actor_color,
            data.turn_index,
            data.hybrid_row,
            data.hybrid_col,
            data.spawn_row,
            data.spawn_col,
            data.staying_piece,
            data.spawning_piece,
            data.action_id
        );
        action.original_hybrid = data.original_hybrid;
        action.result_checksum = data.result_checksum;
        action.timestamp = data.timestamp;
        return action;
    }
}

/**
 * CASTLE Action
 * Represents castling (king-side or queen-side)
 */
export class CastleAction extends Action {
    static ACTION_TYPE = ACTION_TYPES.CASTLE;

    constructor(actorColor, turnIndex, side, actionId = null) {
        super(actorColor, turnIndex, actionId);
        this.side = side; // 'king-side' or 'queen-side'
        this.king_start_row = actorColor === 'white' ? 7 : 0;
        this.king_start_col = 4;
        this.rook_start_col = side === 'king-side' ? 7 : 0;
        this.king_end_col = side === 'king-side' ? 6 : 2;
        this.rook_end_col = side === 'king-side' ? 5 : 3;
    }

    validate(state) {
        // Check turn index matches
        if (this.turn_index !== state.turnIndex) {
            return {
                valid: false,
                reason: `Turn index mismatch: expected ${state.turnIndex}, got ${this.turn_index}`
            };
        }

        // Check actor is current side to move
        if (this.actor_color !== state.sideToMove) {
            return {
                valid: false,
                reason: `Not ${this.actor_color}'s turn`
            };
        }

        // Check castling rights
        if (!state.castlingRights || !state.castlingRights[this.actor_color]) {
            return { valid: false, reason: 'Castling rights not available' };
        }

        const rights = state.castlingRights[this.actor_color];
        if (this.side === 'king-side' && !rights.kingSide) {
            return { valid: false, reason: 'King-side castling right lost' };
        }
        if (this.side === 'queen-side' && !rights.queenSide) {
            return { valid: false, reason: 'Queen-side castling right lost' };
        }

        // Check king and rook are in starting positions
        const king = this.actor_color === 'white' ? 'K' : 'k';
        const rook = this.actor_color === 'white' ? 'R' : 'r';

        if (state.board[this.king_start_row][this.king_start_col] !== king) {
            return { valid: false, reason: 'King not in starting position' };
        }

        if (state.board[this.king_start_row][this.rook_start_col] !== rook) {
            return { valid: false, reason: 'Rook not in starting position' };
        }

        // Check squares between king and rook are empty
        const minCol = Math.min(this.king_start_col, this.rook_start_col);
        const maxCol = Math.max(this.king_start_col, this.rook_start_col);
        for (let col = minCol + 1; col < maxCol; col++) {
            if (state.board[this.king_start_row][col]) {
                return { valid: false, reason: 'Pieces between king and rook' };
            }
        }

        // Check king is not in check
        const { isInCheck } = require('../utils/moveCalculator.js');
        if (isInCheck(state.board, this.actor_color)) {
            return { valid: false, reason: 'Cannot castle while in check' };
        }

        // Check king doesn't pass through check
        const { wouldBeInCheck } = require('../utils/moveCalculator.js');
        const passCol = this.side === 'king-side' ? 5 : 3;
        if (wouldBeInCheck(state.board, this.king_start_row, this.king_start_col, this.king_start_row, passCol, this.actor_color)) {
            return { valid: false, reason: 'Cannot castle through check' };
        }

        // Check king doesn't end in check
        if (wouldBeInCheck(state.board, this.king_start_row, this.king_start_col, this.king_start_row, this.king_end_col, this.actor_color)) {
            return { valid: false, reason: 'Cannot castle into check' };
        }

        return { valid: true };
    }

    apply(state) {
        const { copyBoard } = require('../utils/gameState.js');

        // Create new board
        const newBoard = copyBoard(state.board);

        const king = state.board[this.king_start_row][this.king_start_col];
        const rook = state.board[this.king_start_row][this.rook_start_col];

        // Move king
        newBoard[this.king_start_row][this.king_end_col] = king;
        newBoard[this.king_start_row][this.king_start_col] = '';

        // Move rook
        newBoard[this.king_start_row][this.rook_end_col] = rook;
        newBoard[this.king_start_row][this.rook_start_col] = '';

        // Update castling rights - king moved, lose all rights
        const newCastlingRights = JSON.parse(JSON.stringify(state.castlingRights));
        newCastlingRights[this.actor_color].kingSide = false;
        newCastlingRights[this.actor_color].queenSide = false;

        return {
            board: newBoard,
            castlingRights: newCastlingRights
        };
    }

    serialize() {
        return {
            ...super.serialize(),
            side: this.side
        };
    }

    static deserialize(data) {
        const action = new CastleAction(
            data.actor_color,
            data.turn_index,
            data.side,
            data.action_id
        );
        action.result_checksum = data.result_checksum;
        action.timestamp = data.timestamp;
        return action;
    }
}

/**
 * PROMOTE Action
 * Represents pawn promotion to a new piece
 */
export class PromoteAction extends Action {
    static ACTION_TYPE = ACTION_TYPES.PROMOTE;

    constructor(actorColor, turnIndex, fromRow, fromCol, toRow, toCol, promoteTo, capturedPiece = null, actionId = null) {
        super(actorColor, turnIndex, actionId);
        this.from_row = fromRow;
        this.from_col = fromCol;
        this.to_row = toRow;
        this.to_col = toCol;
        this.promote_to = promoteTo; // 'Q', 'R', 'N', 'B' (uppercase for white, lowercase for black)
        this.captured_piece = capturedPiece;
    }

    validate(state) {
        // Check turn index matches
        if (this.turn_index !== state.turnIndex) {
            return {
                valid: false,
                reason: `Turn index mismatch: expected ${state.turnIndex}, got ${this.turn_index}`
            };
        }

        // Check actor is current side to move
        if (this.actor_color !== state.sideToMove) {
            return {
                valid: false,
                reason: `Not ${this.actor_color}'s turn`
            };
        }

        // Check piece is a pawn
        const piece = state.board[this.from_row]?.[this.from_col];
        const pawn = this.actor_color === 'white' ? 'P' : 'p';
        if (piece !== pawn) {
            return { valid: false, reason: 'Not a pawn' };
        }

        // Check destination is promotion rank
        const promotionRank = this.actor_color === 'white' ? 0 : 7;
        if (this.to_row !== promotionRank) {
            return { valid: false, reason: 'Not a promotion rank' };
        }

        // Check move is legal for pawn
        const { isValidMove } = require('../utils/moveValidation.js');
        if (!isValidMove(state.board, this.from_row, this.from_col, this.to_row, this.to_col)) {
            return { valid: false, reason: 'Illegal pawn move' };
        }

        // Check promotion piece is valid
        const validPromotions = ['Q', 'R', 'N', 'B', 'q', 'r', 'n', 'b'];
        if (!validPromotions.includes(this.promote_to)) {
            return { valid: false, reason: 'Invalid promotion piece' };
        }

        // Check promotion piece matches color
        const isWhitePiece = this.promote_to === this.promote_to.toUpperCase();
        const isWhitePlayer = this.actor_color === 'white';
        if (isWhitePiece !== isWhitePlayer) {
            return { valid: false, reason: 'Promotion piece color mismatch' };
        }

        // Check move wouldn't expose king to check
        const { wouldBeInCheck } = require('../utils/moveCalculator.js');
        if (wouldBeInCheck(state.board, this.from_row, this.from_col, this.to_row, this.to_col, this.actor_color)) {
            return { valid: false, reason: 'Move would expose king to check' };
        }

        return { valid: true };
    }

    apply(state) {
        const { copyBoard } = require('../utils/gameState.js');

        // Create new board
        const newBoard = copyBoard(state.board);
        const capturedPiece = newBoard[this.to_row][this.to_col];

        // Execute promotion
        newBoard[this.to_row][this.to_col] = this.promote_to;
        newBoard[this.from_row][this.from_col] = '';

        // Store captured piece if not already set
        if (!this.captured_piece && capturedPiece) {
            this.captured_piece = capturedPiece;
        }

        return {
            board: newBoard,
            capturedPiece: this.captured_piece
        };
    }

    serialize() {
        return {
            ...super.serialize(),
            from_row: this.from_row,
            from_col: this.from_col,
            to_row: this.to_row,
            to_col: this.to_col,
            promote_to: this.promote_to,
            captured_piece: this.captured_piece
        };
    }

    static deserialize(data) {
        const action = new PromoteAction(
            data.actor_color,
            data.turn_index,
            data.from_row,
            data.from_col,
            data.to_row,
            data.to_col,
            data.promote_to,
            data.captured_piece,
            data.action_id
        );
        action.result_checksum = data.result_checksum;
        action.timestamp = data.timestamp;
        return action;
    }
}

/**
 * Deserialize any action from JSON data
 */
export const deserializeAction = (data) => {
    switch (data.type) {
        case ACTION_TYPES.MOVE:
            return MoveAction.deserialize(data);
        case ACTION_TYPES.COMBINE:
            return CombineAction.deserialize(data);
        case ACTION_TYPES.DECOMBINE:
            return DecombineAction.deserialize(data);
        case ACTION_TYPES.CASTLE:
            return CastleAction.deserialize(data);
        case ACTION_TYPES.PROMOTE:
            return PromoteAction.deserialize(data);
        default:
            throw new Error(`Unknown action type: ${data.type}`);
    }
};

/**
 * Validate and apply an action to a game state
 * Returns {success: boolean, state?: GameState, reason?: string}
 */
export const validateAndApply = (action, state) => {
    const validation = action.validate(state);

    if (!validation.valid) {
        return {
            success: false,
            reason: validation.reason
        };
    }

    try {
        const newStateData = action.apply(state);
        return {
            success: true,
            stateData: newStateData,
            action: action
        };
    } catch (error) {
        return {
            success: false,
            reason: `Error applying action: ${error.message}`
        };
    }
};
