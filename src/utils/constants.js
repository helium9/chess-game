// Piece types
export const PIECES = {
    KING: 'k',
    QUEEN: 'q',
    ROOK: 'r',
    BISHOP: 'b',
    KNIGHT: 'n',
    PAWN: 'p',
};

// Colors
export const COLORS = {
    WHITE: 'white',
    BLACK: 'black',
};

// Piece symbols mapping
export const PIECE_SYMBOLS = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Initial chess board setup
export const INITIAL_BOARD = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

// Helper functions
export const isWhitePiece = (piece) => {
    return piece === piece.toUpperCase() && piece !== '';
};

export const isBlackPiece = (piece) => {
    return piece === piece.toLowerCase() && piece !== '';
};

export const getPieceColor = (piece) => {
    if (!piece) return null;
    return isWhitePiece(piece) ? COLORS.WHITE : COLORS.BLACK;
};

export const isOpponentPiece = (piece1, piece2) => {
    if (!piece1 || !piece2) return false;
    return getPieceColor(piece1) !== getPieceColor(piece2);
};

export const isSameColor = (piece1, piece2) => {
    if (!piece1 || !piece2) return false;
    return getPieceColor(piece1) === getPieceColor(piece2);
};
