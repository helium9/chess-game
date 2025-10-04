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
    executeCombination
} from '../utils/gameState.js';
import {
    findEligiblePairs,
    getEligiblePartners,
    validateCombination
} from '../utils/combinationRules.js';

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

    // Memoize eligible pairs calculation (Issue #9)
    const memoizedEligiblePairs = useMemo(() => {
        return findEligiblePairs(gameState.board, gameState.currentTurn);
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

    // Enter combine mode
    const enterCombineMode = () => {
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

    // Handle keyboard events
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Escape' && combineMode) {
                exitCombineMode();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [combineMode, exitCombineMode]);

    // Handle square click
    const handleSquareClick = (row, col) => {
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

                // Execute the move
                const capturedPiece = gameState.board[row][col];
                const newBoard = makeMove(gameState.board, fromRow, fromCol, row, col);
                const newTurn = switchTurn(gameState.currentTurn);

                // Update captured pieces
                let newCapturedPieces = gameState.capturedPieces;
                if (capturedPiece) {
                    newCapturedPieces = addCapturedPiece(gameState.capturedPieces, capturedPiece);
                }

                // Add to move history
                const move = {
                    from: { row: fromRow, col: fromCol },
                    to: { row, col },
                    piece: gameState.board[fromRow][fromCol],
                    captured: capturedPiece,
                    turn: gameState.currentTurn
                };
                const newMoveHistory = addMoveToHistory(gameState.moveHistory, move);

                // Check if opponent is in check
                const opponentInCheck = isInCheck(newBoard, newTurn);
                let statusMessage = announceTurn(newTurn);
                if (opponentInCheck) {
                    statusMessage += ' - CHECK!';
                }

                setGameState({
                    board: newBoard,
                    currentTurn: newTurn,
                    moveHistory: newMoveHistory,
                    capturedPieces: newCapturedPieces
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
        const newMoveHistory = addMoveToHistory(gameState.moveHistory, combineMove);

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
            board: result.board,
            currentTurn: newTurn,
            moveHistory: newMoveHistory,
            capturedPieces: gameState.capturedPieces
        });

        // Set success message AFTER exiting combine mode
        setMessage(statusMessage);
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

    // Reset game
    const resetGame = () => {
        setGameState(createInitialGameState());
        setSelectedSquare(null);
        setLegalMoves([]);
        setCombineMode(false);
        setEligiblePairs([]);
        setCombineAnchor(null);
        setEligiblePartners([]);
        setMessage('White to move');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 p-4">
            <div className="flex flex-col items-center max-w-6xl w-full">
                <h1 className="text-4xl font-bold text-white mb-4">Interactive Chess</h1>

                {/* Status message */}
                <div className="mb-4 text-xl font-semibold text-amber-400 min-h-8">
                    {message}
                </div>

                {/* Combine Mode Indicator */}
                {combineMode && (
                    <div className="mb-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold">
                        🔮 COMBINE MODE ACTIVE - Press ESC to cancel
                    </div>
                )}

                <div className="flex gap-8 flex-wrap justify-center">
                    {/* Issue #19: Captured pieces - pieces captured BY White (black pieces) */}
                    <div className="flex flex-col items-center">
                        <h3 className="text-white text-sm mb-2">Captured by White</h3>
                        <div className="min-h-12 flex flex-wrap gap-1 items-start justify-center w-32 bg-gray-700 p-2 rounded">
                            {gameState.capturedPieces.black.map((piece, idx) => (
                                <span key={idx} className="text-2xl text-gray-900" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
                                    {PIECE_SYMBOLS[piece]}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Chess board */}
                    <div className="flex items-center">
                        {/* Issue #20: Add rank labels (1-8) */}
                        <div className="flex flex-col-reverse gap-0 mr-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((rank) => (
                                <div key={rank} className="h-16 flex items-center text-gray-400 text-sm">
                                    {rank}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="grid grid-cols-8 gap-0 border-8 border-gray-700 shadow-2xl">
                                {gameState.board.map((row, rowIndex) => (
                                    row.map((piece, colIndex) => {
                                        const isLightSquare = (rowIndex + colIndex) % 2 === 0;
                                        const selected = isSelected(rowIndex, colIndex);
                                        const isLegalMove = isLegalMoveSquare(rowIndex, colIndex);
                                        const eligible = isEligibleForCombine(rowIndex, colIndex);
                                        const partner = isEligiblePartner(rowIndex, colIndex);
                                        const anchor = isCombineAnchor(rowIndex, colIndex);

                                        // Issue #7: Check if this is a capture move
                                        const isCapture = isLegalMove && gameState.board[rowIndex][colIndex];

                                        let squareColor = isLightSquare ? 'bg-amber-100' : 'bg-amber-800';
                                        let ringClass = '';

                                        // Combine mode highlighting
                                        if (combineMode) {
                                            if (anchor) {
                                                squareColor = 'bg-purple-400';
                                                ringClass = 'ring-4 ring-purple-600 ring-inset';
                                            } else if (partner) {
                                                squareColor = isLightSquare ? 'bg-purple-200' : 'bg-purple-500';
                                                ringClass = 'ring-2 ring-purple-400 ring-inset';
                                            } else if (eligible) {
                                                squareColor = isLightSquare ? 'bg-blue-200' : 'bg-blue-500';
                                                ringClass = 'ring-2 ring-blue-400 ring-inset animate-pulse';
                                            }
                                        } else {
                                            // Normal move mode highlighting
                                            if (selected) {
                                                squareColor = 'bg-yellow-400';
                                            } else if (isLegalMove) {
                                                squareColor = isLightSquare ? 'bg-green-300' : 'bg-green-600';
                                                ringClass = 'ring-2 ring-green-400 ring-inset';
                                            }
                                        }

                                        return (
                                            <div
                                                key={`${rowIndex}-${colIndex}`}
                                                onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                className={`w-16 h-16 flex items-center justify-center ${squareColor} 
                            hover:opacity-80 transition-all cursor-pointer relative ${ringClass}`}
                                            >
                                                {piece && (
                                                    <div className="relative">
                                                        <span
                                                            className={`text-5xl select-none ${piece === piece.toUpperCase() ? 'text-white' : 'text-gray-900'
                                                                }`}
                                                            style={{
                                                                // Issue #8: Improve contrast for black pieces
                                                                textShadow: piece === piece.toUpperCase()
                                                                    ? '2px 2px 4px rgba(0,0,0,0.7)'
                                                                    : '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.4)'
                                                            }}
                                                        >
                                                            {PIECE_SYMBOLS[piece]}
                                                        </span>
                                                        {isHybridPiece(piece) && (
                                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 rounded-full border border-white"></div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Issue #7: Different indicators for empty moves vs captures */}
                                                {isLegalMove && !piece && !combineMode && (
                                                    <div className="w-4 h-4 bg-green-500 rounded-full opacity-60"></div>
                                                )}
                                                {isCapture && !combineMode && (
                                                    <div className="absolute inset-0 border-4 border-red-500 opacity-50 pointer-events-none"></div>
                                                )}
                                            </div>
                                        );
                                    })
                                ))}
                            </div>

                            {/* Coordinate labels */}
                            <div className="flex mt-2 gap-0">
                                {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter) => (
                                    <div key={letter} className="w-16 text-center text-gray-400 text-sm">
                                        {letter}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Issue #19: Captured pieces - pieces captured BY Black (white pieces) */}
                    <div className="flex flex-col items-center">
                        <h3 className="text-white text-sm mb-2">Captured by Black</h3>
                        <div className="min-h-12 flex flex-wrap gap-1 items-start justify-center w-32 bg-gray-700 p-2 rounded">
                            {gameState.capturedPieces.white.map((piece, idx) => (
                                <span key={idx} className="text-2xl text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
                                    {PIECE_SYMBOLS[piece]}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="mt-8 flex gap-4">
                    <button
                        onClick={combineMode ? exitCombineMode : enterCombineMode}
                        disabled={!combineMode && memoizedEligiblePairs.length === 0}
                        role="button"
                        aria-pressed={combineMode}
                        aria-label={combineMode ? 'Cancel Combine Mode' : 'Enter Combine Mode'}
                        className={`px-6 py-3 font-semibold rounded-lg shadow-lg transition-colors focus:outline-none focus:ring-4 focus:ring-purple-400 ${combineMode
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed'
                            }`}
                    >
                        {combineMode ? 'Cancel Combine' : '🔮 Combine Pieces'}
                    </button>
                    <button
                        onClick={resetGame}
                        aria-label="Reset Game"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg 
              shadow-lg transition-colors focus:outline-none focus:ring-4 focus:ring-blue-400"
                    >
                        Reset Game
                    </button>
                </div>

                {/* Legend */}
                <div className="mt-6 text-gray-300 text-sm text-center space-y-1">
                    {!combineMode ? (
                        <>
                            <p><span className="inline-block w-4 h-4 bg-yellow-400 mr-2"></span>Selected piece</p>
                            <p><span className="inline-block w-4 h-4 bg-green-500 mr-2"></span>Legal moves</p>
                            <p className="text-xs mt-2 text-gray-400">
                                Click a piece to select it, then click a highlighted square to move
                            </p>
                        </>
                    ) : (
                        <>
                            <p><span className="inline-block w-4 h-4 bg-blue-400 mr-2 animate-pulse"></span>Eligible for combination</p>
                            <p><span className="inline-block w-4 h-4 bg-purple-400 mr-2"></span>Selected anchor</p>
                            <p><span className="inline-block w-4 h-4 bg-purple-300 mr-2"></span>Eligible partners</p>
                            <p><span className="inline-block w-3 h-3 bg-purple-600 rounded-full mr-2"></span>Hybrid piece</p>
                            <p className="text-xs mt-2 text-gray-400">
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
