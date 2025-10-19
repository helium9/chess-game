// AI Configuration and Evaluation Constants

// ============================================
// AI DIFFICULTY LEVELS
// ============================================
export const AI_DIFFICULTY = {
    EASY: { depth: 2, name: 'Easy' },
    MEDIUM: { depth: 4, name: 'Medium' },
    HARD: { depth: 6, name: 'Hard' }
};

// ============================================
// PIECE MATERIAL VALUES (Centipawns)
// ============================================
export const PIECE_VALUES = {
    // Standard pieces
    p: 100,   // Pawn
    n: 320,   // Knight
    b: 330,   // Bishop
    r: 500,   // Rook
    q: 900,   // Queen
    k: 0,     // King (infinite value, but 0 for evaluation)

    // Hybrid pieces - TODO: Fill in values
    rb: 930,    // Rook-Bishop 
    rn: 850,    // Rook-Knight 
    bn: 700,    // Bishop-Knight 
    qn: 1400     // Queen-Knight
};

// ============================================
// SPECIAL SCORES
// ============================================
export const CHECKMATE_SCORE = 100000;
export const STALEMATE_SCORE = 0;

// ============================================
// PIECE-SQUARE TABLES (PST)
// Positional bonuses for each piece type
// Indexed [row][col], from white's perspective
// Values in centipawns
// ============================================

// Pawn PST - Encourage central control and advancement
export const PAWN_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0]
];

// Knight PST - Penalize edges, reward center
export const KNIGHT_TABLE = [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50]
];

// Bishop PST - Reward long diagonals and central position
export const BISHOP_TABLE = [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20]
];

// Rook PST - Reward open files and 7th rank
export const ROOK_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0]
];

// Queen PST - Slight central preference, avoid early development
export const QUEEN_TABLE = [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20]
];

// King PST - Middle game (prefer castled position)
export const KING_MIDDLE_GAME_TABLE = [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20]
];

// King PST - End game (king becomes active)
export const KING_END_GAME_TABLE = [
    [-50, -40, -30, -20, -20, -30, -40, -50],
    [-30, -20, -10, 0, 0, -10, -20, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -30, 0, 0, 0, 0, -30, -30],
    [-50, -30, -30, -30, -30, -30, -30, -50]
];

// ============================================
// HYBRID PIECE-SQUARE TABLES
// TODO: Define PSTs for hybrid pieces
// Options:
// 1. Weighted average of component PSTs
// 2. Use PST of most valuable component
// 3. Custom tables
// ============================================

// Placeholder - you can customize these
export const HYBRID_PST = {
    rb: ROOK_TABLE,  // Default to rook table (TODO: customize)
    rn: ROOK_TABLE,  // Default to rook table (TODO: customize)
    bn: BISHOP_TABLE, // Default to bishop table (TODO: customize)
    qn: QUEEN_TABLE  // Default to queen table (TODO: customize)
};

// ============================================
// HELPER FUNCTION
// Get piece-square table for a piece type
// ============================================
export const getPieceSquareTable = (pieceType) => {
    const type = pieceType.toLowerCase();

    switch (type) {
        case 'p':
            return PAWN_TABLE;
        case 'n':
            return KNIGHT_TABLE;
        case 'b':
            return BISHOP_TABLE;
        case 'r':
            return ROOK_TABLE;
        case 'q':
            return QUEEN_TABLE;
        case 'k':
            return KING_MIDDLE_GAME_TABLE; // Default to middle game
        // Hybrid pieces
        case 'rb':
        case 'rn':
        case 'bn':
        case 'qn':
            return HYBRID_PST[type];
        default:
            return Array(8).fill(Array(8).fill(0)); // Empty table
    }
};

// ============================================
// EVALUATION WEIGHTS
// ============================================
export const EVAL_WEIGHTS = {
    MATERIAL: 1.0,           // Material balance weight
    POSITION: 0.1,           // Positional bonus weight (PST values are in centipawns)
    MOBILITY: 5,             // Bonus per legal move (optional, for future)
    KING_SAFETY: 10          // King safety bonus (optional, for future)
};
