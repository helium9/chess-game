import React, { useState } from 'react';
import { PIECE_SYMBOLS, COLORS } from '../utils/constants.js';
import { calculateLegalMoves, wouldBeInCheck, isInCheck } from '../utils/moveCalculator.js';
import {
    createInitialGameState,
    makeMove,
    switchTurn,
    isCurrentPlayersPiece,
    addMoveToHistory,
    addCapturedPiece
} from '../utils/gameState.js';

const ChessBoard = () => {
    const [gameState, setGameState] = useState(createInitialGameState());
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [legalMoves, setLegalMoves] = useState([]);
    const [message, setMessage] = useState('White to move');

    // Handle square click
    const handleSquareClick = (row, col) => {
        const piece = gameState.board[row][col];

        // If a square is already selected
        if (selectedSquare) {
            const { row: fromRow, col: fromCol } = selectedSquare;

            // Check if clicked square is a legal move
            const isLegalMove = legalMoves.some(move => move.row === row && move.col === col);

            if (isLegalMove) {
                // Check if move would put king in check
                if (wouldBeInCheck(gameState.board, fromRow, fromCol, row, col, gameState.currentTurn)) {
                    setMessage(`Illegal move: ${gameState.currentTurn} king would be in check!`);
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
                let statusMessage = `${newTurn === COLORS.WHITE ? 'White' : 'Black'} to move`;
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
                setMessage(`Selected ${piece}. Click a highlighted square to move.`);
            } else {
                // Deselect
                setSelectedSquare(null);
                setLegalMoves([]);
                setMessage(`${gameState.currentTurn === COLORS.WHITE ? 'White' : 'Black'} to move`);
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
                setMessage(`Selected ${piece}. Click a highlighted square to move.`);
            }
        }
    };

    // Check if a square is selected
    const isSelected = (row, col) => {
        return selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
    };

    // Check if a square is a legal move
    const isLegalMoveSquare = (row, col) => {
        return legalMoves.some(move => move.row === row && move.col === col);
    };

    // Reset game
    const resetGame = () => {
        setGameState(createInitialGameState());
        setSelectedSquare(null);
        setLegalMoves([]);
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

                <div className="flex gap-8 flex-wrap justify-center">
                    {/* Captured pieces - Black */}
                    <div className="flex flex-col items-center">
                        <h3 className="text-white text-sm mb-2">Captured (Black)</h3>
                        <div className="min-h-12 flex flex-wrap gap-1 items-start justify-center w-32 bg-gray-700 p-2 rounded">
                            {gameState.capturedPieces.black.map((piece, idx) => (
                                <span key={idx} className="text-2xl text-black">
                                    {PIECE_SYMBOLS[piece]}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Chess board */}
                    <div className="flex flex-col items-center">
                        <div className="grid grid-cols-8 gap-0 border-8 border-gray-700 shadow-2xl">
                            {gameState.board.map((row, rowIndex) => (
                                row.map((piece, colIndex) => {
                                    const isLightSquare = (rowIndex + colIndex) % 2 === 0;
                                    const selected = isSelected(rowIndex, colIndex);
                                    const isLegalMove = isLegalMoveSquare(rowIndex, colIndex);

                                    let squareColor = isLightSquare ? 'bg-amber-100' : 'bg-amber-800';
                                    if (selected) {
                                        squareColor = 'bg-yellow-400';
                                    } else if (isLegalMove) {
                                        squareColor = isLightSquare ? 'bg-green-300' : 'bg-green-600';
                                    }

                                    return (
                                        <div
                                            key={`${rowIndex}-${colIndex}`}
                                            onClick={() => handleSquareClick(rowIndex, colIndex)}
                                            className={`w-16 h-16 flex items-center justify-center ${squareColor} 
                        hover:opacity-80 transition-all cursor-pointer relative
                        ${isLegalMove ? 'ring-2 ring-green-400 ring-inset' : ''}`}
                                        >
                                            {piece && (
                                                <span
                                                    className={`text-5xl select-none ${piece === piece.toUpperCase() ? 'text-white' : 'text-black'
                                                        }`}
                                                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                                                >
                                                    {PIECE_SYMBOLS[piece]}
                                                </span>
                                            )}
                                            {isLegalMove && !piece && (
                                                <div className="w-4 h-4 bg-green-500 rounded-full opacity-60"></div>
                                            )}
                                        </div>
                                    );
                                })
                            ))}
                        </div>

                        {/* Coordinate labels */}
                        <div className="flex mt-2 gap-0 ml-8">
                            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter) => (
                                <div key={letter} className="w-16 text-center text-gray-400 text-sm">
                                    {letter}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Captured pieces - White */}
                    <div className="flex flex-col items-center">
                        <h3 className="text-white text-sm mb-2">Captured (White)</h3>
                        <div className="min-h-12 flex flex-wrap gap-1 items-start justify-center w-32 bg-gray-700 p-2 rounded">
                            {gameState.capturedPieces.white.map((piece, idx) => (
                                <span key={idx} className="text-2xl text-white">
                                    {PIECE_SYMBOLS[piece]}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="mt-8 flex gap-4">
                    <button
                        onClick={resetGame}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg 
              shadow-lg transition-colors"
                    >
                        Reset Game
                    </button>
                </div>

                {/* Legend */}
                <div className="mt-6 text-gray-300 text-sm text-center space-y-1">
                    <p><span className="inline-block w-4 h-4 bg-yellow-400 mr-2"></span>Selected piece</p>
                    <p><span className="inline-block w-4 h-4 bg-green-500 mr-2"></span>Legal moves</p>
                    <p className="text-xs mt-2 text-gray-400">
                        Click a piece to select it, then click a highlighted square to move
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChessBoard;
