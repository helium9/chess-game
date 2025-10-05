import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PIECE_SYMBOLS, COLORS, HYBRID_NAMES, isHybridPiece } from '../utils/constants.js';
import { calculateLegalMoves, wouldBeInCheck, isInCheck } from '../utils/moveCalculator.js';
import {
    createInitialGameState,
    makeMove,
    switchTurn,
    isCurrentPlayersPiece,
    addMoveToHistory,
    addCapturedPiece,
    executeCombination,
    saveStateForUndo,
    undoMove,
    redoMove,
    canUndo,
    canRedo,
    copyBoard
} from '../utils/gameState.js';
import {
    findEligiblePairs,
    getEligiblePartners,
    validateCombination
} from '../utils/combinationRules.js';
import {
    findPlayerHybrids,
    findSpawnSquares,
    validateDeCombination,
    executeDeCombination,
    getHybridComponents,
    DE_COMBINE_ERRORS,
    getSuccessMessage,
    computeLegalAssignments
} from '../utils/deCombinationRules.js';

// Message helper functions (Issue #4, #24)
const capitalizeColor = (color) => {
    return color === COLORS.WHITE ? 'White' : 'Black';
};

const announceTurn = (turn) => {
    return `${capitalizeColor(turn)} to move`;
};

const announceError = (msg) => {
    return msg;
};

const announceSuccess = (msg) => {
    return msg;
};

const ChessBoard = () => {
    const [gameState, setGameState] = useState(createInitialGameState());
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [legalMoves, setLegalMoves] = useState([]);
    const [message, setMessage] = useState('White to move');

    // Combine mode state
    const [combineMode, setCombineMode] = useState(false);
    const [eligiblePairs, setEligiblePairs] = useState([]);
    const [combineAnchor, setCombineAnchor] = useState(null);
    const [eligiblePartners, setEligiblePartners] = useState([]);

    // De-Combine mode state (structured for improved flow control)
    const [deCombine, setDeCombine] = useState({
        mode: false,                    // Is de-combine mode active?
        activeHybrid: null,            // Selected hybrid {row, col, piece}
        eligibleSquares: [],           // Valid adjacent spawn squares
        selectedSquare: null,          // Chosen spawn square
        assignment: null,              // Resolved assignment from two-assignment check
        isConfirmOpen: false           // Confirmation dialog state
    });

    // Legacy state for backward compatibility (will migrate gradually)
    const [eligibleHybrids, setEligibleHybrids] = useState([]);

    // Promotion dialog state
    const [promotionDialog, setPromotionDialog] = useState({
        isOpen: false,
        fromRow: null,
        fromCol: null,
        toRow: null,
        toCol: null,
        capturedPiece: null
    });

    // Memoize eligible pairs calculation (Issue #9)
    const memoizedEligiblePairs = useMemo(() => {
        return findEligiblePairs(gameState.board, gameState.currentTurn);
    }, [gameState.board, gameState.currentTurn]);

    // Memoize eligible hybrids for de-combine
    const memoizedEligibleHybrids = useMemo(() => {
        return findPlayerHybrids(gameState.board, gameState.currentTurn);
    }, [gameState.board, gameState.currentTurn]);

    // Exit combine mode - defined early so useEffect can reference it
    // Issue #1-3: Add preserveMessage parameter to avoid overwriting important messages
    const exitCombineMode = useCallback((preserveMessage = false) => {
        setCombineMode(false);
        setEligiblePairs([]);
        setCombineAnchor(null);
        setEligiblePartners([]);
        if (!preserveMessage) {
            setMessage(announceTurn(gameState.currentTurn));
        }
    }, [gameState.currentTurn]);

    // Exit de-combine mode
    const exitDeCombineMode = useCallback((preserveMessage = false) => {
        setDeCombine({
            mode: false,
            activeHybrid: null,
            eligibleSquares: [],
            selectedSquare: null,
            assignment: null,
            isConfirmOpen: false
        });
        setEligibleHybrids([]);
        if (!preserveMessage) {
            setMessage(announceTurn(gameState.currentTurn));
        }
    }, [gameState.currentTurn]);

    // Update eligible pairs when board or turn changes
    useEffect(() => {
        if (combineMode) {
            const pairs = memoizedEligiblePairs;
            setEligiblePairs(pairs);

            if (pairs.length === 0) {
                // Issue #3: Show persistent warning before exiting
                setMessage(announceError('No eligible pieces to combine. Exiting Combine Mode.'));
                // Exit after showing message, preserve it
                setTimeout(() => {
                    exitCombineMode(true);
                }, 100);
            }
        }
    }, [gameState.board, gameState.currentTurn, combineMode, exitCombineMode, memoizedEligiblePairs]);

    // Update eligible hybrids when board or turn changes
    useEffect(() => {
        if (deCombine.mode) {
            const hybrids = memoizedEligibleHybrids;
            setEligibleHybrids(hybrids);

            if (hybrids.length === 0) {
                setMessage(announceError('No hybrid pieces available to De-Combine. Exiting.'));
                setTimeout(() => {
                    exitDeCombineMode(true);
                }, 100);
            }
        }
    }, [gameState.board, gameState.currentTurn, deCombine.mode, exitDeCombineMode, memoizedEligibleHybrids]);

    // Enter combine mode
    const enterCombineMode = () => {
        // Exit de-combine mode if active
        if (deCombine.mode) {
            exitDeCombineMode();
        }

        const pairs = memoizedEligiblePairs;

        if (pairs.length === 0) {
            // Issue #3: Show persistent warning
            setMessage(announceError('No eligible pieces to combine!'));
            return;
        }

        setCombineMode(true);
        setEligiblePairs(pairs);
        setCombineAnchor(null);
        setEligiblePartners([]);
        setSelectedSquare(null);
        setLegalMoves([]);
        setMessage('Combine Mode: Click a piece to start combination');
    };

    // Enter de-combine mode
    const enterDeCombineMode = () => {
        // Exit combine mode if active
        if (combineMode) {
            exitCombineMode();
        }

        const hybrids = memoizedEligibleHybrids;

        if (hybrids.length === 0) {
            setMessage(announceError('No hybrid pieces available to De-Combine.'));
            return;
        }

        setDeCombine({
            mode: true,
            activeHybrid: null,
            eligibleSquares: [],
            selectedSquare: null,
            assignment: null,
            isConfirmOpen: false
        });
        setEligibleHybrids(hybrids);
        setSelectedSquare(null);
        setLegalMoves([]);
        setMessage('De-Combine Mode: Click a hybrid to split it into components.');
    };

    // Handle keyboard events with improved ESC hierarchy
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                if (combineMode) {
                    exitCombineMode();
                } else if (deCombine.mode) {
                    // ESC hierarchy for de-combine mode:
                    // 1. If confirm open → close confirm but keep hybrid selected
                    // 2. If hybrid selected → clear selection, stay in de-combine mode  
                    // 3. If nothing selected → exit de-combine mode
                    if (deCombine.isConfirmOpen) {
                        setDeCombine(prev => ({
                            ...prev,
                            isConfirmOpen: false,
                            selectedSquare: null
                        }));
                        setMessage('Confirmation cancelled. Select a spawn square or choose another hybrid.');
                    } else if (deCombine.activeHybrid) {
                        setDeCombine(prev => ({
                            ...prev,
                            activeHybrid: null,
                            eligibleSquares: [],
                            selectedSquare: null,
                            assignment: null
                        }));
                        setMessage('Hybrid deselected. Click a hybrid to start.');
                    } else {
                        exitDeCombineMode();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [combineMode, deCombine, exitCombineMode, exitDeCombineMode]);

    // Handle square click
    const handleSquareClick = (row, col) => {
        // Turn safety: block all actions if not player's turn (for future multiplayer)
        // Currently single-player, but architecture ready for networking

        // Handle de-combine mode clicks
        if (deCombine.mode) {
            handleDeCombineClick(row, col);
            return;
        }

        // Handle combine mode clicks
        if (combineMode) {
            handleCombineClick(row, col);
            return;
        }

        // Normal move mode
        const piece = gameState.board[row][col];

        // If a square is already selected
        if (selectedSquare) {
            const { row: fromRow, col: fromCol } = selectedSquare;
            const movingPiece = gameState.board[fromRow][fromCol];

            // Check for castling attempt
            const isKing = movingPiece.toLowerCase() === 'k';
            if (isKing) {
                const rank = gameState.currentTurn === COLORS.WHITE ? 7 : 0;
                const clickedPiece = gameState.board[row][col];

                // Check if clicking on own rook (castling in traditional way)
                if (row === rank && clickedPiece && clickedPiece.toLowerCase() === 'r' &&
                    isCurrentPlayersPiece(clickedPiece, gameState.currentTurn)) {
                    // Determine if kingside or queenside
                    const isKingSide = col === 7;
                    const isQueenSide = col === 0;

                    if (isKingSide && canCastle(true)) {
                        executeCastle(true);
                        return;
                    } else if (isQueenSide && canCastle(false)) {
                        executeCastle(false);
                        return;
                    } else {
                        setMessage(announceError('Cannot castle in this position'));
                        return;
                    }
                }

                // Check if clicking 2 squares away (castling in modern way)
                if (row === rank && fromCol === 4) {
                    if (col === 6 && canCastle(true)) {
                        executeCastle(true);
                        return;
                    } else if (col === 2 && canCastle(false)) {
                        executeCastle(false);
                        return;
                    }
                }
            }

            // Check if clicked square is a legal move
            const isLegalMove = legalMoves.some(move => move.row === row && move.col === col);

            if (isLegalMove) {
                // Check if move would put king in check
                if (wouldBeInCheck(gameState.board, fromRow, fromCol, row, col, gameState.currentTurn)) {
                    setMessage(announceError(`Illegal move: ${capitalizeColor(gameState.currentTurn)} king would be in check!`));
                    setSelectedSquare(null);
                    setLegalMoves([]);
                    return;
                }

                // Check if this is a pawn promotion
                const movingPiece = gameState.board[fromRow][fromCol];
                const isPawn = movingPiece.toLowerCase() === 'p';
                const promotionRank = gameState.currentTurn === COLORS.WHITE ? 0 : 7;

                if (isPawn && row === promotionRank) {
                    // Save state before opening promotion dialog
                    const newGameState = saveStateForUndo(gameState);
                    setGameState(newGameState);

                    // Open promotion dialog
                    const capturedPiece = gameState.board[row][col];
                    setPromotionDialog({
                        isOpen: true,
                        fromRow,
                        fromCol,
                        toRow: row,
                        toCol: col,
                        capturedPiece
                    });
                    setSelectedSquare(null);
                    setLegalMoves([]);
                    setMessage('Choose promotion piece');
                    return;
                }

                // Save state for undo
                const stateWithUndo = saveStateForUndo(gameState);

                // Execute the move
                const capturedPiece = gameState.board[row][col];
                const newBoard = makeMove(gameState.board, fromRow, fromCol, row, col);
                const newTurn = switchTurn(gameState.currentTurn);

                // Update castling rights if king or rook moved
                let newCastlingRights = { ...stateWithUndo.castlingRights };
                const movingPieceType = movingPiece.toLowerCase();

                if (movingPieceType === 'k') {
                    // King moved - lose all castling rights
                    newCastlingRights[gameState.currentTurn] = {
                        kingSide: false,
                        queenSide: false
                    };
                } else if (movingPieceType === 'r') {
                    // Rook moved - lose castling right for that side
                    const rank = gameState.currentTurn === COLORS.WHITE ? 7 : 0;
                    if (fromRow === rank) {
                        if (fromCol === 7) {
                            newCastlingRights[gameState.currentTurn].kingSide = false;
                        } else if (fromCol === 0) {
                            newCastlingRights[gameState.currentTurn].queenSide = false;
                        }
                    }
                }

                // If rook was captured, update opponent's castling rights
                if (capturedPiece && capturedPiece.toLowerCase() === 'r') {
                    const opponentColor = gameState.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
                    const opponentRank = opponentColor === COLORS.WHITE ? 7 : 0;
                    if (row === opponentRank) {
                        if (col === 7) {
                            newCastlingRights[opponentColor].kingSide = false;
                        } else if (col === 0) {
                            newCastlingRights[opponentColor].queenSide = false;
                        }
                    }
                }

                // Update captured pieces
                let newCapturedPieces = stateWithUndo.capturedPieces;
                if (capturedPiece) {
                    newCapturedPieces = addCapturedPiece(stateWithUndo.capturedPieces, capturedPiece);
                }

                // Add to move history
                const move = {
                    from: { row: fromRow, col: fromCol },
                    to: { row, col },
                    piece: gameState.board[fromRow][fromCol],
                    captured: capturedPiece,
                    turn: gameState.currentTurn
                };
                const newMoveHistory = addMoveToHistory(stateWithUndo.moveHistory, move);

                // Check if opponent is in check
                const opponentInCheck = isInCheck(newBoard, newTurn);
                let statusMessage = announceTurn(newTurn);
                if (opponentInCheck) {
                    statusMessage += ' - CHECK!';
                }

                setGameState({
                    ...stateWithUndo,
                    board: newBoard,
                    currentTurn: newTurn,
                    moveHistory: newMoveHistory,
                    capturedPieces: newCapturedPieces,
                    castlingRights: newCastlingRights
                });
                setMessage(statusMessage);
                setSelectedSquare(null);
                setLegalMoves([]);
            } else if (piece && isCurrentPlayersPiece(piece, gameState.currentTurn)) {
                // Select a different piece of the current player
                const moves = calculateLegalMoves(gameState.board, row, col, gameState.currentTurn);
                // Filter out moves that would put king in check
                const safeMoves = moves.filter(move =>
                    !wouldBeInCheck(gameState.board, row, col, move.row, move.col, gameState.currentTurn)
                );

                // Add castling destinations if king is selected
                if (piece.toLowerCase() === 'k') {
                    const rank = gameState.currentTurn === COLORS.WHITE ? 7 : 0;
                    if (canCastle(true)) {
                        safeMoves.push({ row: rank, col: 6 }); // Kingside destination
                    }
                    if (canCastle(false)) {
                        safeMoves.push({ row: rank, col: 2 }); // Queenside destination
                    }
                }

                setSelectedSquare({ row, col });
                setLegalMoves(safeMoves);
                setMessage(`Selected ${PIECE_SYMBOLS[piece]}. Click a highlighted square to move.`);
            } else {
                // Deselect
                setSelectedSquare(null);
                setLegalMoves([]);
                setMessage(announceTurn(gameState.currentTurn));
            }
        } else {
            // No square selected yet
            if (piece && isCurrentPlayersPiece(piece, gameState.currentTurn)) {
                const moves = calculateLegalMoves(gameState.board, row, col, gameState.currentTurn);
                // Filter out moves that would put king in check
                const safeMoves = moves.filter(move =>
                    !wouldBeInCheck(gameState.board, row, col, move.row, move.col, gameState.currentTurn)
                );

                // Add castling destinations if king is selected
                if (piece.toLowerCase() === 'k') {
                    const rank = gameState.currentTurn === COLORS.WHITE ? 7 : 0;
                    if (canCastle(true)) {
                        safeMoves.push({ row: rank, col: 6 }); // Kingside destination
                    }
                    if (canCastle(false)) {
                        safeMoves.push({ row: rank, col: 2 }); // Queenside destination
                    }
                }

                setSelectedSquare({ row, col });
                setLegalMoves(safeMoves);
                setMessage(`Selected ${PIECE_SYMBOLS[piece]}. Click a highlighted square to move.`);
            }
        }
    };

    // Handle combine mode clicks
    const handleCombineClick = (row, col) => {
        const piece = gameState.board[row][col];

        if (!combineAnchor) {
            // First click - select anchor
            const isEligible = eligiblePairs.some(pair =>
                (pair.piece1.row === row && pair.piece1.col === col) ||
                (pair.piece2.row === row && pair.piece2.col === col)
            );

            if (!isEligible) {
                setMessage(announceError('Not eligible for combine. Select a highlighted piece.'));
                return;
            }

            // Set anchor and find partners
            setCombineAnchor({ row, col });
            const partners = getEligiblePartners(gameState.board, row, col, gameState.currentTurn, eligiblePairs);
            setEligiblePartners(partners);
            setMessage(`Selected ${PIECE_SYMBOLS[piece]}. Click a partner to combine.`);
        } else {
            // Second click - check if it's a valid partner
            const isPartner = eligiblePartners.some(p => p.row === row && p.col === col);

            if (!isPartner) {
                // Not a partner - check if clicking another eligible piece
                const isEligible = eligiblePairs.some(pair =>
                    (pair.piece1.row === row && pair.piece1.col === col) ||
                    (pair.piece2.row === row && pair.piece2.col === col)
                );

                if (isEligible) {
                    // Issue #12: Clear stale partner highlights before switching anchor
                    setEligiblePartners([]);

                    // Switch to new anchor
                    setCombineAnchor({ row, col });
                    const partners = getEligiblePartners(gameState.board, row, col, gameState.currentTurn, eligiblePairs);
                    setEligiblePartners(partners);
                    setMessage(`Selected ${PIECE_SYMBOLS[piece]}. Click a partner to combine.`);
                } else {
                    setMessage(announceError('Not a valid partner. Select a highlighted piece.'));
                }
                return;
            }

            // Execute combination - Issue #5: Pass click order (first, second)
            executeCombine(combineAnchor.row, combineAnchor.col, row, col);
        }
    };

    // Execute combination
    const executeCombine = (row1, col1, row2, col2) => {
        const validation = validateCombination(gameState.board, row1, col1, row2, col2, gameState.currentTurn);

        if (!validation.valid) {
            const errorMsg = announceError(`Cannot combine: ${validation.reason}`);
            setMessage(errorMsg);
            // Issue #1-2: Preserve error message when exiting
            exitCombineMode(true);
            return;
        }

        // Save state for undo
        const stateWithUndo = saveStateForUndo(gameState);

        const result = executeCombination(
            gameState.board,
            row1, col1,
            row2, col2,
            combineAnchor.row, combineAnchor.col
        );

        if (!result) {
            const errorMsg = announceError('Combination failed!');
            setMessage(errorMsg);
            // Issue #1-2: Preserve error message when exiting
            exitCombineMode(true);
            return;
        }

        // Check if resulting position leaves king in check
        const wouldCheck = isInCheck(result.board, gameState.currentTurn);
        if (wouldCheck) {
            const errorMsg = announceError('Illegal combination: would leave king in check!');
            setMessage(errorMsg);
            // Issue #1-2: Preserve error message when exiting
            exitCombineMode(true);
            return;
        }

        const newTurn = switchTurn(gameState.currentTurn);

        // Add to move history
        const combineMove = {
            type: 'combination',
            pieces: [
                { row: row1, col: col1, piece: gameState.board[row1][col1] },
                { row: row2, col: col2, piece: gameState.board[row2][col2] }
            ],
            result: result.hybridPiece,
            placement: result.placementSquare,
            turn: gameState.currentTurn
        };
        const newMoveHistory = addMoveToHistory(stateWithUndo.moveHistory, combineMove);

        // Check if opponent is in check
        const opponentInCheck = isInCheck(result.board, newTurn);

        // Issue #6: Normalize hybrid name lookup (case-insensitive)
        const hybridName = HYBRID_NAMES[result.hybridPiece] || HYBRID_NAMES[result.hybridPiece.toLowerCase()] || 'Hybrid';
        let statusMessage = announceSuccess(`${hybridName} created! ${capitalizeColor(newTurn)} to move`);
        if (opponentInCheck) {
            statusMessage += ' - CHECK!';
        }

        // Issue #2: Exit BEFORE setting success message to prevent overwrite
        exitCombineMode(true);

        setGameState({
            ...stateWithUndo,
            board: result.board,
            currentTurn: newTurn,
            moveHistory: newMoveHistory
        });

        // Set success message AFTER exiting combine mode
        setMessage(statusMessage);
    };

    // Execute promotion
    const executePromotion = (promotionPiece) => {
        const { fromRow, fromCol, toRow, toCol, capturedPiece } = promotionDialog;

        // Create new board with promotion
        const newBoard = copyBoard(gameState.board);
        newBoard[toRow][toCol] = promotionPiece;
        newBoard[fromRow][fromCol] = '';

        const newTurn = switchTurn(gameState.currentTurn);

        // Update captured pieces
        let newCapturedPieces = gameState.capturedPieces;
        if (capturedPiece) {
            newCapturedPieces = addCapturedPiece(gameState.capturedPieces, capturedPiece);
        }

        // Add to move history
        const move = {
            type: 'promotion',
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            promotedTo: promotionPiece,
            captured: capturedPiece,
            turn: gameState.currentTurn
        };
        const newMoveHistory = addMoveToHistory(gameState.moveHistory, move);

        // Check if opponent is in check
        const opponentInCheck = isInCheck(newBoard, newTurn);
        let statusMessage = `Pawn promoted to ${PIECE_SYMBOLS[promotionPiece]}! ${capitalizeColor(newTurn)} to move`;
        if (opponentInCheck) {
            statusMessage += ' - CHECK!';
        }

        setGameState({
            ...gameState,
            board: newBoard,
            currentTurn: newTurn,
            moveHistory: newMoveHistory,
            capturedPieces: newCapturedPieces
        });

        setPromotionDialog({
            isOpen: false,
            fromRow: null,
            fromCol: null,
            toRow: null,
            toCol: null,
            capturedPiece: null
        });

        setMessage(statusMessage);
    };

    // Check if castling is valid
    const canCastle = (kingSide) => {
        const rank = gameState.currentTurn === COLORS.WHITE ? 7 : 0;
        const king = gameState.currentTurn === COLORS.WHITE ? 'K' : 'k';
        const rook = gameState.currentTurn === COLORS.WHITE ? 'R' : 'r';

        // Check castling rights
        const rights = gameState.castlingRights?.[gameState.currentTurn];
        if (!rights || (kingSide && !rights.kingSide) || (!kingSide && !rights.queenSide)) {
            return false;
        }

        // Check if king is in correct position
        if (gameState.board[rank][4] !== king) {
            return false;
        }

        // Check if rook is in correct position
        const rookCol = kingSide ? 7 : 0;
        if (gameState.board[rank][rookCol] !== rook) {
            return false;
        }

        // Check if squares between king and rook are empty
        const startCol = kingSide ? 5 : 1;
        const endCol = kingSide ? 6 : 3;
        for (let col = startCol; col <= endCol; col++) {
            if (gameState.board[rank][col]) {
                return false;
            }
        }

        // Check if king is in check
        if (isInCheck(gameState.board, gameState.currentTurn)) {
            return false;
        }

        // Check if king passes through check
        const kingDestCol = kingSide ? 6 : 2;
        const passCol = kingSide ? 5 : 3;

        // Check intermediate square
        const testBoard1 = gameState.board.map(r => [...r]);
        testBoard1[rank][4] = '';
        testBoard1[rank][passCol] = king;
        if (isInCheck(testBoard1, gameState.currentTurn)) {
            return false;
        }

        // Check destination square
        const testBoard2 = gameState.board.map(r => [...r]);
        testBoard2[rank][4] = '';
        testBoard2[rank][kingDestCol] = king;
        if (isInCheck(testBoard2, gameState.currentTurn)) {
            return false;
        }

        return true;
    };

    // Execute castling move
    const executeCastle = (kingSide) => {
        // Save state for undo
        const stateWithUndo = saveStateForUndo(gameState);

        const rank = gameState.currentTurn === COLORS.WHITE ? 7 : 0;
        const king = gameState.currentTurn === COLORS.WHITE ? 'K' : 'k';
        const rook = gameState.currentTurn === COLORS.WHITE ? 'R' : 'r';

        // Create new board
        const newBoard = copyBoard(gameState.board);

        // Move king and rook
        if (kingSide) {
            newBoard[rank][4] = ''; // Remove king
            newBoard[rank][7] = ''; // Remove rook
            newBoard[rank][6] = king; // Place king
            newBoard[rank][5] = rook; // Place rook
        } else {
            newBoard[rank][4] = ''; // Remove king
            newBoard[rank][0] = ''; // Remove rook
            newBoard[rank][2] = king; // Place king
            newBoard[rank][3] = rook; // Place rook
        }

        const newTurn = switchTurn(gameState.currentTurn);

        // Update castling rights - remove all rights for this player
        const newCastlingRights = {
            ...stateWithUndo.castlingRights,
            [gameState.currentTurn]: {
                kingSide: false,
                queenSide: false
            }
        };

        // Add to move history
        const move = {
            type: 'castle',
            side: kingSide ? 'kingside' : 'queenside',
            turn: gameState.currentTurn
        };
        const newMoveHistory = addMoveToHistory(stateWithUndo.moveHistory, move);

        // Check if opponent is in check
        const opponentInCheck = isInCheck(newBoard, newTurn);
        let statusMessage = `${capitalizeColor(gameState.currentTurn)} castles ${kingSide ? 'kingside' : 'queenside'}! ${announceTurn(newTurn)}`;
        if (opponentInCheck) {
            statusMessage += ' - CHECK!';
        }

        setGameState({
            ...stateWithUndo,
            board: newBoard,
            currentTurn: newTurn,
            moveHistory: newMoveHistory,
            castlingRights: newCastlingRights
        });
        setMessage(statusMessage);
        setSelectedSquare(null);
        setLegalMoves([]);
    };

    // Handle de-combine mode clicks with improved flow
    const handleDeCombineClick = (row, col) => {
        const piece = gameState.board[row][col];

        // Phase 1: Select hybrid
        if (!deCombine.activeHybrid) {
            // Check if clicking on an eligible hybrid
            const isEligible = eligibleHybrids.some(h => h.row === row && h.col === col);

            if (!isEligible) {
                setMessage(announceError(DE_COMBINE_ERRORS.NOT_HYBRID));
                return;
            }

            // Recompute eligible squares from latest board state
            const squares = findSpawnSquares(gameState.board, row, col);

            if (squares.length === 0) {
                setMessage(announceError(DE_COMBINE_ERRORS.NO_ADJACENT_SQUARES));
                return;
            }

            // Select hybrid and show eligible spawn squares
            setDeCombine({
                ...deCombine,
                activeHybrid: { row, col, piece },
                eligibleSquares: squares,
                selectedSquare: null,
                assignment: null,
                isConfirmOpen: false
            });

            const components = getHybridComponents(piece);
            const compNames = components ? `${PIECE_SYMBOLS[components[0]]} + ${PIECE_SYMBOLS[components[1]]}` : 'components';
            setMessage(`Hybrid selected. Click an adjacent square to place ${compNames}.`);
            return;
        }

        // Phase 2: Select spawn square
        // Recompute and verify eligibility
        const recomputedSquares = findSpawnSquares(gameState.board, deCombine.activeHybrid.row, deCombine.activeHybrid.col);
        const isEligibleSquare = recomputedSquares.some(sq => sq.row === row && sq.col === col);

        if (!isEligibleSquare) {
            setMessage(announceError(DE_COMBINE_ERRORS.SQUARE_NOT_ADJACENT));
            return;
        }

        // Defensive re-check: square must still be empty
        if (gameState.board[row][col]) {
            setMessage(announceError(DE_COMBINE_ERRORS.SQUARE_OCCUPIED));
            // Recompute eligible squares
            setDeCombine(prev => ({
                ...prev,
                eligibleSquares: recomputedSquares,
                selectedSquare: null
            }));
            return;
        }

        // Run two-assignment legality check
        const assignmentResult = computeLegalAssignments(
            gameState.board,
            deCombine.activeHybrid.row,
            deCombine.activeHybrid.col,
            { row, col },
            gameState.currentTurn
        );

        if (assignmentResult.legal.length === 0) {
            setMessage(announceError(assignmentResult.reason));
            return;
        }

        // Store selected square and assignment, open confirm dialog
        setDeCombine(prev => ({
            ...prev,
            selectedSquare: { row, col },
            assignment: assignmentResult.chosen,
            isConfirmOpen: true
        }));

        const toAlgebraic = (r, c) => String.fromCharCode(97 + c) + (8 - r);
        setMessage(`Ready to de-combine: ${assignmentResult.chosen.description} at ${toAlgebraic(row, col)}. Press Confirm or ESC to cancel.`);
    };

    // Execute de-combination with final validation
    const executeDeCombine = () => {
        if (!deCombine.activeHybrid || !deCombine.selectedSquare || !deCombine.assignment) {
            setMessage(announceError('Invalid de-combination state.'));
            return;
        }

        // Final legality pass (never assume earlier checks still hold)
        const validation = validateDeCombination(
            gameState.board,
            deCombine.activeHybrid.row,
            deCombine.activeHybrid.col,
            deCombine.selectedSquare,
            gameState.currentTurn
        );

        if (!validation.valid) {
            setMessage(announceError(validation.reason));
            setDeCombine(prev => ({
                ...prev,
                isConfirmOpen: false,
                selectedSquare: null,
                assignment: null
            }));
            return;
        }

        // Execute with determined assignment
        const result = executeDeCombination(
            gameState.board,
            deCombine.activeHybrid.row,
            deCombine.activeHybrid.col,
            deCombine.selectedSquare,
            gameState.currentTurn
        );

        if (!result) {
            setMessage(announceError('De-combination failed: could not execute.'));
            exitDeCombineMode(true);
            return;
        }

        // Update game state with new board
        const newGameState = {
            ...gameState,
            board: result.board,
            currentTurn: gameState.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE,
        };

        // Add to history (for replay/analytics)
        const historyEntry = {
            type: 'de-combine',
            hybrid: deCombine.activeHybrid.piece,
            hybridSquare: deCombine.activeHybrid,
            selectedSquare: deCombine.selectedSquare,
            assignment: result.assignment,
            stayingComponent: result.stayingComponent,
            spawningComponent: result.spawningComponent,
            assignmentType: result.assignmentType,
            turnIndex: gameState.moveHistory.length,
            timestamp: Date.now()
        };

        newGameState.moveHistory = [...gameState.moveHistory, historyEntry];

        setGameState(newGameState);

        // Success message
        const successMsg = getSuccessMessage(
            deCombine.activeHybrid.piece,
            result.stayingComponent,
            result.anchorSquare,
            result.spawningComponent,
            result.spawnSquare
        );
        setMessage(announceSuccess(successMsg));

        // Exit de-combine mode
        exitDeCombineMode(true);
    };

    // Check if a square is selected
    const isSelected = (row, col) => {
        return selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
    };

    // Check if a square is a legal move
    const isLegalMoveSquare = (row, col) => {
        return legalMoves.some(move => move.row === row && move.col === col);
    };

    // Check if a piece is eligible for combining
    const isEligibleForCombine = (row, col) => {
        if (!combineMode) return false;
        return eligiblePairs.some(pair =>
            (pair.piece1.row === row && pair.piece1.col === col) ||
            (pair.piece2.row === row && pair.piece2.col === col)
        );
    };

    // Check if a piece is an eligible partner
    const isEligiblePartner = (row, col) => {
        if (!combineAnchor) return false;
        return eligiblePartners.some(p => p.row === row && p.col === col);
    };

    // Check if square is the combine anchor
    const isCombineAnchor = (row, col) => {
        return combineAnchor && combineAnchor.row === row && combineAnchor.col === col;
    };

    // Check if a hybrid is eligible for de-combining
    const isEligibleForDeCombine = (row, col) => {
        if (!deCombine.mode) return false;
        return eligibleHybrids.some(h => h.row === row && h.col === col);
    };

    // Check if square is the selected hybrid
    const isSelectedHybrid = (row, col) => {
        return deCombine.activeHybrid && deCombine.activeHybrid.row === row && deCombine.activeHybrid.col === col;
    };

    // Check if square is a valid spawn square
    const isSpawnSquare = (row, col) => {
        if (!deCombine.activeHybrid) return false;
        return deCombine.eligibleSquares.some(sq => sq.row === row && sq.col === col);
    };

    // Check if square is the selected spawn square
    const isSelectedSpawnSquare = (row, col) => {
        return deCombine.selectedSquare && deCombine.selectedSquare.row === row && deCombine.selectedSquare.col === col;
    };

    // Reset game
    const resetGame = () => {
        setGameState(createInitialGameState());
        setSelectedSquare(null);
        setLegalMoves([]);
        setCombineMode(false);
        setEligiblePairs([]);
        setCombineAnchor(null);
        setEligiblePartners([]);
        setDeCombine({
            mode: false,
            activeHybrid: null,
            eligibleSquares: [],
            selectedSquare: null,
            assignment: null,
            isConfirmOpen: false
        });
        setEligibleHybrids([]);
        setMessage('White to move');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="flex flex-col items-center max-w-6xl w-full relative z-10">
                <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 mb-6 drop-shadow-2xl tracking-tight animate-fade-in">
                    Interactive Chess
                </h1>

                {/* Status message */}
                <div className="mb-6 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur-sm rounded-xl border border-amber-400/30 shadow-xl min-h-12 flex items-center">
                    <p className="text-xl font-semibold text-amber-200 text-center w-full drop-shadow-lg">
                        {message}
                    </p>
                </div>

                {/* Combine Mode Indicator */}
                {combineMode && (
                    <div className="mb-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold shadow-2xl border-2 border-purple-400 animate-pulse-subtle">
                        <span className="text-2xl mr-2">🔮</span>
                        COMBINE MODE ACTIVE - Press ESC to cancel
                    </div>
                )}

                {/* De-Combine Mode Indicator */}
                {deCombine.mode && (
                    <div className="mb-4 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold shadow-2xl border-2 border-teal-400 animate-pulse-subtle">
                        <span className="text-2xl mr-2">⚡</span>
                        DE-COMBINE MODE ACTIVE - Press ESC to cancel
                    </div>
                )}

                <div className="flex gap-8 flex-wrap justify-center">
                    {/* Issue #19: Captured pieces - pieces captured BY White (black pieces) */}
                    <div className="flex flex-col items-center transform transition-transform hover:scale-105">
                        <h3 className="text-amber-300 text-base font-bold mb-3 tracking-wide drop-shadow-lg">Captured by White</h3>
                        <div className="min-h-16 flex flex-wrap gap-2 items-start justify-center w-36 bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-xl border-2 border-amber-600/40 shadow-2xl backdrop-blur-sm">
                            {gameState.capturedPieces.black.map((piece, idx) => (
                                <span key={idx} className="text-3xl text-gray-900 transition-transform hover:scale-125" style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.9)' }}>
                                    {PIECE_SYMBOLS[piece]}
                                </span>
                            ))}
                            {gameState.capturedPieces.black.length === 0 && (
                                <span className="text-gray-600 text-sm italic">No captures yet</span>
                            )}
                        </div>
                    </div>

                    {/* Chess board */}
                    <div className="flex items-center transform transition-all hover:scale-[1.02]">
                        {/* Issue #20: Add rank labels (1-8) */}
                        <div className="flex flex-col-reverse gap-0 mr-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((rank) => (
                                <div key={rank} className="h-16 flex items-center text-amber-400 text-base font-bold drop-shadow-lg">
                                    {rank}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="grid grid-cols-8 gap-0 border-8 border-gradient-to-br from-amber-700 via-yellow-800 to-amber-900 shadow-2xl rounded-lg overflow-hidden backdrop-blur-sm" style={{ borderImage: 'linear-gradient(135deg, #d97706, #b45309, #92400e) 1' }}>
                                {gameState.board.map((row, rowIndex) => (
                                    row.map((piece, colIndex) => {
                                        const isLightSquare = (rowIndex + colIndex) % 2 === 0;
                                        const selected = isSelected(rowIndex, colIndex);
                                        const isLegalMove = isLegalMoveSquare(rowIndex, colIndex);
                                        const eligible = isEligibleForCombine(rowIndex, colIndex);
                                        const partner = isEligiblePartner(rowIndex, colIndex);
                                        const anchor = isCombineAnchor(rowIndex, colIndex);

                                        // De-combine mode checks
                                        const eligibleHybrid = isEligibleForDeCombine(rowIndex, colIndex);
                                        const hybridSelected = isSelectedHybrid(rowIndex, colIndex);
                                        const spawnSquare = isSpawnSquare(rowIndex, colIndex);
                                        const spawnSelected = isSelectedSpawnSquare(rowIndex, colIndex);

                                        // Issue #7: Check if this is a capture move
                                        const isCapture = isLegalMove && gameState.board[rowIndex][colIndex];

                                        let squareColor = isLightSquare ? 'bg-gradient-to-br from-amber-50 to-amber-100' : 'bg-gradient-to-br from-amber-700 to-amber-900';
                                        let ringClass = '';
                                        let opacity = 'opacity-100';
                                        let extraEffects = '';

                                        // De-Combine mode highlighting (Spec 6.1 enhanced)
                                        if (deCombine.mode) {
                                            if (hybridSelected) {
                                                // Active hybrid piece - purple glow
                                                squareColor = 'bg-gradient-to-br from-teal-300 to-teal-500';
                                                ringClass = 'ring-4 ring-teal-400 ring-inset animate-pulse shadow-lg shadow-teal-500/50';
                                            } else if (spawnSelected) {
                                                // Selected spawn square - bright green with stronger glow
                                                squareColor = 'bg-gradient-to-br from-lime-300 to-lime-500';
                                                ringClass = 'ring-4 ring-lime-400 ring-inset animate-pulse shadow-lg shadow-lime-500/50';
                                            } else if (spawnSquare) {
                                                // Eligible spawn squares - green
                                                squareColor = isLightSquare ? 'bg-gradient-to-br from-green-200 to-green-300' : 'bg-gradient-to-br from-green-500 to-green-700';
                                                ringClass = 'ring-2 ring-green-400 ring-inset shadow-inner';
                                            } else if (eligibleHybrid) {
                                                // Other eligible hybrids - teal
                                                squareColor = isLightSquare ? 'bg-gradient-to-br from-teal-200 to-teal-300' : 'bg-gradient-to-br from-teal-500 to-teal-700';
                                                ringClass = 'ring-2 ring-teal-300 ring-inset animate-pulse';
                                            } else {
                                                opacity = 'opacity-50'; // Dim non-relevant pieces
                                            }
                                        } else if (combineMode) {
                                            if (anchor) {
                                                squareColor = 'bg-gradient-to-br from-purple-300 to-purple-500';
                                                ringClass = 'ring-4 ring-purple-400 ring-inset shadow-lg shadow-purple-500/50';
                                            } else if (partner) {
                                                squareColor = isLightSquare ? 'bg-gradient-to-br from-purple-200 to-purple-300' : 'bg-gradient-to-br from-purple-500 to-purple-700';
                                                ringClass = 'ring-2 ring-purple-300 ring-inset shadow-inner';
                                            } else if (eligible) {
                                                squareColor = isLightSquare ? 'bg-gradient-to-br from-blue-200 to-blue-300' : 'bg-gradient-to-br from-blue-500 to-blue-700';
                                                ringClass = 'ring-2 ring-blue-300 ring-inset animate-pulse';
                                            }
                                        } else {
                                            // Normal move mode highlighting
                                            if (selected) {
                                                squareColor = 'bg-gradient-to-br from-yellow-300 to-yellow-500';
                                                extraEffects = 'shadow-lg shadow-yellow-500/50';
                                            } else if (isLegalMove) {
                                                squareColor = isLightSquare ? 'bg-gradient-to-br from-green-200 to-green-300' : 'bg-gradient-to-br from-green-500 to-green-700';
                                                ringClass = 'ring-2 ring-green-400 ring-inset shadow-inner';
                                            }
                                        }

                                        return (
                                            <div
                                                key={`${rowIndex}-${colIndex}`}
                                                onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                className={`w-16 h-16 flex items-center justify-center ${squareColor} ${opacity}
                            hover:brightness-110 hover:scale-105 transition-all duration-200 cursor-pointer relative ${ringClass} ${extraEffects}`}
                                            >
                                                {piece && (
                                                    <div className="relative transform transition-transform hover:scale-110">
                                                        <span
                                                            className={`text-5xl select-none ${piece === piece.toUpperCase() ? 'text-white' : 'text-gray-900'
                                                                }`}
                                                            style={{
                                                                // Issue #8: Improve contrast for black pieces
                                                                textShadow: piece === piece.toUpperCase()
                                                                    ? '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.5)'
                                                                    : '2px 2px 4px rgba(255,255,255,1), -1px -1px 2px rgba(255,255,255,0.6)',
                                                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                                                            }}
                                                        >
                                                            {PIECE_SYMBOLS[piece]}
                                                        </span>
                                                        {isHybridPiece(piece) && (
                                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Issue #7: Different indicators for empty moves vs captures */}
                                                {isLegalMove && !piece && !combineMode && (
                                                    <div className="w-5 h-5 bg-green-400 rounded-full opacity-70 shadow-lg animate-pulse"></div>
                                                )}
                                                {isCapture && !combineMode && (
                                                    <div className="absolute inset-0 border-4 border-red-500 rounded opacity-60 pointer-events-none animate-pulse shadow-inner"></div>
                                                )}
                                            </div>
                                        );
                                    })
                                ))}
                            </div>

                            {/* Coordinate labels */}
                            <div className="flex mt-3 gap-0">
                                {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter) => (
                                    <div key={letter} className="w-16 text-center text-amber-400 text-base font-bold drop-shadow-lg">
                                        {letter}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Issue #19: Captured pieces - pieces captured BY Black (white pieces) */}
                    <div className="flex flex-col items-center transform transition-transform hover:scale-105">
                        <h3 className="text-amber-300 text-base font-bold mb-3 tracking-wide drop-shadow-lg">Captured by Black</h3>
                        <div className="min-h-16 flex flex-wrap gap-2 items-start justify-center w-36 bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-xl border-2 border-amber-600/40 shadow-2xl backdrop-blur-sm">
                            {gameState.capturedPieces.white.map((piece, idx) => (
                                <span key={idx} className="text-3xl text-white transition-transform hover:scale-125" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>
                                    {PIECE_SYMBOLS[piece]}
                                </span>
                            ))}
                            {gameState.capturedPieces.white.length === 0 && (
                                <span className="text-gray-600 text-sm italic">No captures yet</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="mt-8 flex gap-4 flex-wrap justify-center">
                    {/* Undo/Redo buttons */}
                    <button
                        onClick={() => {
                            const newState = undoMove(gameState);
                            if (newState !== gameState) {
                                setGameState(newState);
                                setSelectedSquare(null);
                                setLegalMoves([]);
                                setMessage(`Undo - ${capitalizeColor(newState.currentTurn)} to move`);
                            }
                        }}
                        disabled={!canUndo(gameState)}
                        aria-label="Undo last move"
                        title="Undo last move"
                        className="px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl 
              shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-orange-400
              disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:opacity-50"
                    >
                        <span className="text-xl">↶ Undo</span>
                    </button>

                    <button
                        onClick={() => {
                            const newState = redoMove(gameState);
                            if (newState !== gameState) {
                                setGameState(newState);
                                setSelectedSquare(null);
                                setLegalMoves([]);
                                setMessage(`Redo - ${capitalizeColor(newState.currentTurn)} to move`);
                            }
                        }}
                        disabled={!canRedo(gameState)}
                        aria-label="Redo last undone move"
                        title="Redo last undone move"
                        className="px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl 
              shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-orange-400
              disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:opacity-50"
                    >
                        <span className="text-xl">↷ Redo</span>
                    </button>

                    <button
                        onClick={combineMode ? exitCombineMode : enterCombineMode}
                        disabled={!combineMode && memoizedEligiblePairs.length === 0}
                        role="button"
                        aria-pressed={combineMode}
                        aria-label={combineMode ? 'Cancel Combine Mode' : 'Enter Combine Mode'}
                        className={`px-8 py-4 font-bold rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-400 ${combineMode
                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                            : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:hover:scale-100'
                            }`}
                    >
                        <span className="text-xl">{combineMode ? '❌ Cancel Combine' : '🔮 Combine Pieces'}</span>
                    </button>

                    <button
                        onClick={deCombine.mode ? exitDeCombineMode : enterDeCombineMode}
                        disabled={!deCombine.mode && memoizedEligibleHybrids.length === 0}
                        role="button"
                        aria-pressed={deCombine.mode}
                        aria-label={deCombine.mode ? 'Cancel De-Combine Mode' : 'Enter De-Combine Mode'}
                        className={`px-8 py-4 font-bold rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-teal-400 ${deCombine.mode
                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                            : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:hover:scale-100'
                            }`}
                    >
                        <span className="text-xl">{deCombine.mode ? '❌ Cancel De-Combine' : '⚡ De-Combine Pieces'}</span>
                    </button>

                    <button
                        onClick={resetGame}
                        aria-label="Reset Game"
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl 
              shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-400"
                    >
                        <span className="text-xl">🔄 Reset Game</span>
                    </button>
                </div>

                {/* Confirm De-Combine Dialog (Enhanced with assignment details) */}
                {deCombine.isConfirmOpen && deCombine.activeHybrid && deCombine.selectedSquare && deCombine.assignment && (
                    <div
                        className="mt-6 px-8 py-6 bg-gradient-to-br from-teal-700 via-teal-800 to-cyan-900 text-white rounded-2xl shadow-2xl border-2 border-teal-400 max-w-lg mx-auto backdrop-blur-sm animate-fade-in"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="decom dialog-title"
                    >
                        <h3 id="decombine-dialog-title" className="text-center mb-4 text-xl font-bold">
                            Confirm De-Combination
                        </h3>
                        <div className="text-center mb-4 space-y-2">
                            <p className="text-lg">
                                Hybrid: <span className="text-3xl">{PIECE_SYMBOLS[deCombine.activeHybrid.piece]}</span>
                            </p>
                            <p className="text-md text-teal-200">
                                → {deCombine.assignment.description}
                            </p>
                            <p className="text-sm text-teal-300 italic">
                                Spawn square: {String.fromCharCode(97 + deCombine.selectedSquare.col)}{8 - deCombine.selectedSquare.row}
                            </p>
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={executeDeCombine}
                                autoFocus
                                className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 focus:ring-4 focus:ring-green-400"
                                aria-label="Confirm de-combination"
                            >
                                ✓ Confirm
                            </button>
                            <button
                                onClick={() => {
                                    setDeCombine(prev => ({
                                        ...prev,
                                        isConfirmOpen: false,
                                        selectedSquare: null
                                    }));
                                    setMessage('Confirmation cancelled. Select a different spawn square or ESC to cancel.');
                                }}
                                className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold rounded-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 focus:ring-4 focus:ring-gray-500"
                                aria-label="Cancel and reselect"
                            >
                                ✗ Reselect
                            </button>
                        </div>
                    </div>
                )}

                {/* Promotion Dialog */}
                {promotionDialog.isOpen && (
                    <div
                        className="mt-6 px-8 py-6 bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 text-white rounded-2xl shadow-2xl border-2 border-purple-400 max-w-lg mx-auto backdrop-blur-sm animate-fade-in"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="promotion-dialog-title"
                    >
                        <h3 id="promotion-dialog-title" className="text-center mb-4 text-xl font-bold">
                            Promote Your Pawn
                        </h3>
                        <p className="text-center mb-6 text-purple-200">
                            Choose which piece to promote to:
                        </p>
                        <div className="flex gap-4 justify-center flex-wrap">
                            <button
                                onClick={() => executePromotion(gameState.currentTurn === 'white' ? 'Q' : 'q')}
                                autoFocus
                                className="px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold rounded-xl shadow-xl transition-all transform hover:scale-110 active:scale-95 focus:ring-4 focus:ring-yellow-400 text-4xl"
                                aria-label="Promote to Queen"
                            >
                                {gameState.currentTurn === 'white' ? '♕' : '♛'}
                            </button>
                            <button
                                onClick={() => executePromotion(gameState.currentTurn === 'white' ? 'R' : 'r')}
                                className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-xl transition-all transform hover:scale-110 active:scale-95 focus:ring-4 focus:ring-blue-400 text-4xl"
                                aria-label="Promote to Rook"
                            >
                                {gameState.currentTurn === 'white' ? '♖' : '♜'}
                            </button>
                            <button
                                onClick={() => executePromotion(gameState.currentTurn === 'white' ? 'B' : 'b')}
                                className="px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-xl transition-all transform hover:scale-110 active:scale-95 focus:ring-4 focus:ring-green-400 text-4xl"
                                aria-label="Promote to Bishop"
                            >
                                {gameState.currentTurn === 'white' ? '♗' : '♝'}
                            </button>
                            <button
                                onClick={() => executePromotion(gameState.currentTurn === 'white' ? 'N' : 'n')}
                                className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-xl transition-all transform hover:scale-110 active:scale-95 focus:ring-4 focus:ring-red-400 text-4xl"
                                aria-label="Promote to Knight"
                            >
                                {gameState.currentTurn === 'white' ? '♘' : '♞'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="mt-8 text-amber-200 text-base text-center space-y-2 bg-slate-900/50 backdrop-blur-sm px-6 py-4 rounded-xl border border-amber-600/30 shadow-xl">
                    {deCombine.mode ? (
                        <>
                            <p className="font-semibold"><span className="inline-block w-5 h-5 bg-teal-400 mr-2 rounded animate-pulse shadow-lg"></span>Eligible hybrids</p>
                            <p className="font-semibold"><span className="inline-block w-5 h-5 bg-teal-500 mr-2 rounded shadow-lg"></span>Selected hybrid</p>
                            <p className="font-semibold"><span className="inline-block w-5 h-5 bg-green-400 mr-2 rounded shadow-lg"></span>Available spawn squares</p>
                            <p className="font-semibold"><span className="inline-block w-5 h-5 bg-lime-400 mr-2 rounded shadow-lg"></span>Selected spawn square</p>
                            <p className="text-sm mt-3 text-amber-300/80 italic">
                                Click a hybrid, then click an adjacent empty square to place components
                            </p>
                        </>
                    ) : !combineMode ? (
                        <>
                            <p className="font-semibold"><span className="inline-block w-5 h-5 bg-yellow-400 mr-2 rounded shadow-lg"></span>Selected piece</p>
                            <p className="font-semibold"><span className="inline-block w-5 h-5 bg-green-500 mr-2 rounded-full shadow-lg"></span>Legal moves</p>
                            <p className="text-sm mt-3 text-amber-300/80 italic">
                                Click a piece to select it, then click a highlighted square to move
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold"><span className="inline-block w-5 h-5 bg-blue-400 mr-2 rounded animate-pulse shadow-lg"></span>Eligible for combination</p>
                            <p className="font-semibold"><span className="inline-block w-5 h-5 bg-purple-400 mr-2 rounded shadow-lg"></span>Selected anchor</p>
                            <p className="font-semibold"><span className="inline-block w-5 h-5 bg-purple-300 mr-2 rounded shadow-lg"></span>Eligible partners</p>
                            <p className="font-semibold"><span className="inline-block w-4 h-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full mr-2 shadow-lg"></span>Hybrid piece</p>
                            <p className="text-sm mt-3 text-amber-300/80 italic">
                                Click an eligible piece, then click a partner to combine them
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChessBoard;
