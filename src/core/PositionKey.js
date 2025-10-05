/**
 * Position Key (Zobrist Hashing)
 * 
 * Provides deterministic hashing for chess positions.
 * Used for:
 * - Engine transposition tables
 * - Threefold repetition detection
 * - Position equality checks
 * - Network synchronization verification
 * 
 * Implementation uses Zobrist hashing with pre-generated random numbers
 * seeded deterministically to ensure cross-platform consistency.
 */

/**
 * Seeded random number generator (PRNG) for deterministic hashing
 * Using a simple Linear Congruential Generator (LCG)
 */
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed;
    }

    nextFloat() {
        return this.next() / 0x7fffffff;
    }

    nextInt(max) {
        return Math.floor(this.nextFloat() * max);
    }
}

/**
 * Generate Zobrist hash table
 * Each possible piece on each square gets a unique 32-bit number
 */
const generateZobristTable = () => {
    const rng = new SeededRandom(20251005); // Fixed seed for determinism

    const table = {
        pieces: {},
        sideToMove: rng.next(),
        castling: {
            whiteKingSide: rng.next(),
            whiteQueenSide: rng.next(),
            blackKingSide: rng.next(),
            blackQueenSide: rng.next()
        },
        enPassant: []
    };

    // All possible pieces (including hybrids)
    const pieces = [
        'K', 'Q', 'R', 'B', 'N', 'P',
        'k', 'q', 'r', 'b', 'n', 'p',
        'RB', 'RN', 'BN', 'QN',
        'rb', 'rn', 'bn', 'qn'
    ];

    // Generate random number for each piece on each square
    for (const piece of pieces) {
        table.pieces[piece] = [];
        for (let square = 0; square < 64; square++) {
            table.pieces[piece][square] = rng.next();
        }
    }

    // Generate random numbers for en passant files
    for (let file = 0; file < 8; file++) {
        table.enPassant[file] = rng.next();
    }

    return table;
};

// Global Zobrist table (generated once)
const ZOBRIST_TABLE = generateZobristTable();

/**
 * Compute position key from position snapshot
 * @param {Object} snapshot - Position snapshot from GameState
 * @returns {number} - 32-bit hash
 */
export const computePositionKey = (snapshot) => {
    let hash = 0;

    // Hash board pieces
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = snapshot.board[row][col];
            if (piece) {
                const square = row * 8 + col;
                if (ZOBRIST_TABLE.pieces[piece]) {
                    hash ^= ZOBRIST_TABLE.pieces[piece][square];
                }
            }
        }
    }

    // Hash side to move
    if (snapshot.sideToMove === 'black') {
        hash ^= ZOBRIST_TABLE.sideToMove;
    }

    // Hash castling rights (when implemented)
    if (snapshot.castlingRights) {
        if (snapshot.castlingRights.white.kingSide) {
            hash ^= ZOBRIST_TABLE.castling.whiteKingSide;
        }
        if (snapshot.castlingRights.white.queenSide) {
            hash ^= ZOBRIST_TABLE.castling.whiteQueenSide;
        }
        if (snapshot.castlingRights.black.kingSide) {
            hash ^= ZOBRIST_TABLE.castling.blackKingSide;
        }
        if (snapshot.castlingRights.black.queenSide) {
            hash ^= ZOBRIST_TABLE.castling.blackQueenSide;
        }
    }

    // Hash en passant target (when implemented)
    if (snapshot.enPassantTarget) {
        hash ^= ZOBRIST_TABLE.enPassant[snapshot.enPassantTarget.col];
    }

    return hash >>> 0; // Ensure unsigned 32-bit integer
};

/**
 * Compare two position keys
 */
export const positionKeysEqual = (key1, key2) => {
    return key1 === key2;
};

/**
 * Convert position key to hex string for debugging
 */
export const positionKeyToString = (key) => {
    return key.toString(16).padStart(8, '0');
};

/**
 * Incremental hash update functions
 * More efficient than recomputing from scratch
 */

/**
 * Update hash when a piece moves
 */
export const updateHashForMove = (hash, piece, fromRow, fromCol, toRow, toCol, capturedPiece = null) => {
    const fromSquare = fromRow * 8 + fromCol;
    const toSquare = toRow * 8 + toCol;

    // Remove piece from source
    if (ZOBRIST_TABLE.pieces[piece]) {
        hash ^= ZOBRIST_TABLE.pieces[piece][fromSquare];
    }

    // Remove captured piece if any
    if (capturedPiece && ZOBRIST_TABLE.pieces[capturedPiece]) {
        hash ^= ZOBRIST_TABLE.pieces[capturedPiece][toSquare];
    }

    // Add piece to destination
    if (ZOBRIST_TABLE.pieces[piece]) {
        hash ^= ZOBRIST_TABLE.pieces[piece][toSquare];
    }

    // Toggle side to move
    hash ^= ZOBRIST_TABLE.sideToMove;

    return hash >>> 0;
};

/**
 * Update hash when pieces are combined
 */
export const updateHashForCombine = (hash, piece1, row1, col1, piece2, row2, col2, hybridPiece, placementRow, placementCol) => {
    const square1 = row1 * 8 + col1;
    const square2 = row2 * 8 + col2;
    const placementSquare = placementRow * 8 + placementCol;

    // Remove both original pieces
    if (ZOBRIST_TABLE.pieces[piece1]) {
        hash ^= ZOBRIST_TABLE.pieces[piece1][square1];
    }
    if (ZOBRIST_TABLE.pieces[piece2]) {
        hash ^= ZOBRIST_TABLE.pieces[piece2][square2];
    }

    // Add hybrid piece at placement square
    if (ZOBRIST_TABLE.pieces[hybridPiece]) {
        hash ^= ZOBRIST_TABLE.pieces[hybridPiece][placementSquare];
    }

    // Toggle side to move
    hash ^= ZOBRIST_TABLE.sideToMove;

    return hash >>> 0;
};

/**
 * Update hash when a hybrid is de-combined
 */
export const updateHashForDecombine = (hash, hybridPiece, hybridRow, hybridCol, stayingPiece, spawningPiece, spawnRow, spawnCol) => {
    const hybridSquare = hybridRow * 8 + hybridCol;
    const spawnSquare = spawnRow * 8 + spawnCol;

    // Remove hybrid
    if (ZOBRIST_TABLE.pieces[hybridPiece]) {
        hash ^= ZOBRIST_TABLE.pieces[hybridPiece][hybridSquare];
    }

    // Add staying piece (at same square)
    if (ZOBRIST_TABLE.pieces[stayingPiece]) {
        hash ^= ZOBRIST_TABLE.pieces[stayingPiece][hybridSquare];
    }

    // Add spawning piece (at spawn square)
    if (ZOBRIST_TABLE.pieces[spawningPiece]) {
        hash ^= ZOBRIST_TABLE.pieces[spawningPiece][spawnSquare];
    }

    // Toggle side to move
    hash ^= ZOBRIST_TABLE.sideToMove;

    return hash >>> 0;
};
