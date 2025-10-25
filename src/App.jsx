import { useState, useEffect, useCallback, useRef } from "react";
import ChessBoard from "./components/ChessBoard.jsx";
import Navbar from "./components/ui/Navbar.jsx";
import useWebRTC from "./hooks/useWebRTC.js";
import { createInitialGameState, makeMove } from "./utils/gameState.js";
import { COLORS } from "./utils/constants.js";
import { findBestMove, findBestMoveParallel } from "./ai/alphaBeta.js";
import { AI_DIFFICULTY } from "./ai/constants.js";
import "./App.css";

function App() {
  const webRTC = useWebRTC();
  const [gameState, setGameState] = useState(() => createInitialGameState());
  const lastSyncRequestTime = useRef(0); // Track last time we sent a sync request

  // Engine mode state
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState("MEDIUM"); // 'EASY', 'MEDIUM', or 'HARD'

  // Timer state - using ref to avoid re-renders
  const timerStateRef = useRef({
    whiteTime: 180000, // 3 minutes in ms
    blackTime: 180000,
    lastUpdate: Date.now(),
  });

  // Function to handle game state changes from ChessBoard
  const handleGameStateChange = (newGameState) => {
    console.log("Game state changed:", {
      oldState: gameState,
      newState: newGameState,
      currentTurn: newGameState.currentTurn,
      gameMode: webRTC.gameMode,
      playerColor: webRTC.playerColor,
    });

    // Update timer state when a move is made (only in multiplayer and vsEngine mode)
    if (
      webRTC.gameMode === "vsEngine" ||
      (webRTC.gameMode !== "singlePlayer" && webRTC.isConnected)
    ) {
      const now = Date.now();
      const elapsed = now - timerStateRef.current.lastUpdate;

      // Deduct time from the player who just moved (opposite of current turn)
      const movingColor =
        newGameState.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      if (movingColor === COLORS.WHITE) {
        timerStateRef.current.whiteTime = Math.max(
          0,
          timerStateRef.current.whiteTime - elapsed
        );
      } else {
        timerStateRef.current.blackTime = Math.max(
          0,
          timerStateRef.current.blackTime - elapsed
        );
      }
      timerStateRef.current.lastUpdate = now;

      // console.log('Timer updated:', {
      //   whiteTime: timerStateRef.current.whiteTime,
      //   blackTime: timerStateRef.current.blackTime,
      //   elapsed,
      //   movingColor
      // });
    }

    setGameState(newGameState);

    // Check if it's AI's turn (engine mode + BLACK to move + game not over)
    if (
      webRTC.gameMode === "vsEngine" &&
      newGameState.currentTurn === COLORS.BLACK &&
      !isAiThinking &&
      !newGameState.gameStatus?.isGameOver
    ) {
      makeAiMove(newGameState);
    }

    // Send to peer if connected (WebRTC multiplayer only)
    if (webRTC.isConnected) {
      // console.log('Sending game state to peer:', {
      //   type: 'gameStateSync',
      //   gameState: newGameState,
      //   timerState: { ...timerStateRef.current },
      //   timestamp: Date.now()
      // });
      webRTC.sendGameState({
        type: "gameStateSync",
        gameState: newGameState,
        timerState: { ...timerStateRef.current },
        timestamp: Date.now(),
      });
    }
  };

  // Make AI move in engine mode
  const makeAiMove = async (currentGameState) => {
    setIsAiThinking(true);

    try {
      console.log("AI is thinking...");

      // Use parallel search with web workers (Phase 2B)
      // Falls back to single-threaded if workers unavailable
      const bestMove = await findBestMoveParallel(
        currentGameState,
        AI_DIFFICULTY[aiDifficulty].depth
      );

      if (bestMove) {
        console.log("AI found best move:", bestMove);

        // Import necessary functions
        const {
          copyBoard,
          makeMove: makeBoardMove,
          executeCombination: executeCombinationOnBoard,
          switchTurn,
          addCapturedPiece,
        } = await import("./utils/gameState.js");
        const { executeCastleMove } = await import(
          "./components/helpers/castlingLogic.js"
        );

        // Create new game state
        let newBoard;
        let capturedPiece = null;

        switch (bestMove.type) {
          case "normal":
            // Check for capture
            capturedPiece =
              currentGameState.board[bestMove.to.row][bestMove.to.col];
            newBoard = makeBoardMove(
              currentGameState.board,
              bestMove.from.row,
              bestMove.from.col,
              bestMove.to.row,
              bestMove.to.col
            );
            break;

          case "castling":
            newBoard = executeCastleMove(
              currentGameState.board,
              currentGameState.currentTurn,
              bestMove.side === "kingside"
            );
            break;

          case "promotion":
            capturedPiece =
              currentGameState.board[bestMove.to.row][bestMove.to.col];
            newBoard = copyBoard(currentGameState.board);
            newBoard[bestMove.to.row][bestMove.to.col] = bestMove.promoteTo;
            newBoard[bestMove.from.row][bestMove.from.col] = "";
            break;

          case "combine": {
            const { piece1, piece2 } = bestMove.pieces;
            const result = executeCombinationOnBoard(
              currentGameState.board,
              piece1.row,
              piece1.col,
              piece2.row,
              piece2.col,
              piece1.row, // anchor row
              piece1.col // anchor col
            );
            newBoard = result ? result.board : currentGameState.board;
            break;
          }

          case "decombine":
            newBoard = copyBoard(currentGameState.board);
            newBoard[bestMove.from.row][bestMove.from.col] =
              bestMove.assignment.staying;
            newBoard[bestMove.to.row][bestMove.to.col] =
              bestMove.assignment.spawning;
            break;

          default:
            console.error("Unknown move type:", bestMove.type);
            newBoard = currentGameState.board;
        }

        // Update captured pieces if any
        let newCapturedPieces = { ...currentGameState.capturedPieces };
        if (capturedPiece && capturedPiece !== "") {
          newCapturedPieces = addCapturedPiece(
            currentGameState.capturedPieces,
            capturedPiece
          );
        }

        // Update castling rights (simplified - you might need more logic here)
        let newCastlingRights = { ...currentGameState.castlingRights };
        const piece =
          currentGameState.board[bestMove.from.row][bestMove.from.col];

        // King moves - lose all castling rights
        if (piece && piece.toLowerCase() === "k") {
          if (currentGameState.currentTurn === COLORS.BLACK) {
            newCastlingRights = {
              ...newCastlingRights,
              black: { kingSide: false, queenSide: false },
            };
          }
        }

        // Create the new game state
        const newGameState = {
          ...currentGameState,
          board: newBoard,
          currentTurn: switchTurn(currentGameState.currentTurn),
          capturedPieces: newCapturedPieces,
          castlingRights: newCastlingRights,
          moveHistory: [...currentGameState.moveHistory, bestMove],
          enPassantTarget: null, // Reset en passant
        };

        // Update timer for BLACK (AI)
        const now = Date.now();
        const elapsed = now - timerStateRef.current.lastUpdate;
        timerStateRef.current.blackTime = Math.max(
          0,
          timerStateRef.current.blackTime - elapsed
        );
        timerStateRef.current.lastUpdate = now;

        // Update game state (this won't trigger another AI move since turn switches to WHITE)
        setGameState(newGameState);
      } else {
        console.log("AI has no legal moves (game over)");
      }
    } catch (error) {
      console.error("Error during AI move calculation:", error);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Start a new engine game
  const startEngineGame = useCallback(() => {
    console.log("Starting engine game (vs AI)");

    // Set game mode to vsEngine
    webRTC.updateGameMode("vsEngine");
    webRTC.updatePlayerColor(COLORS.WHITE);

    // Reset game state
    setGameState(createInitialGameState());

    // Reset timer state
    timerStateRef.current = {
      whiteTime: 180000,
      blackTime: 180000,
      lastUpdate: Date.now(),
    };

    // Reset AI thinking state
    setIsAiThinking(false);
  }, [webRTC]);

  // Handle reset board - return to single player mode
  const handleResetToSinglePlayer = useCallback(() => {
    console.log("Resetting to single player mode");

    // Set game mode to single player
    webRTC.updateGameMode("singlePlayer");
    webRTC.updatePlayerColor(null);

    // Reset game state
    setGameState(createInitialGameState());

    // Reset timer state
    timerStateRef.current = {
      whiteTime: 180000,
      blackTime: 180000,
      lastUpdate: Date.now(),
    };

    // Reset AI thinking state
    setIsAiThinking(false);
  }, [webRTC]);

  // Handle incoming game state from peer with useCallback to prevent stale closures
  const handleMessage = useCallback((message) => {
    // console.log('Received message from peer:', message);

    // Handle the double-wrapped message structure from WebRTC service
    if (message.type === "gameState" && message.data) {
      const innerMessage = message.data;

      if (innerMessage.type === "gameStateSync") {
        console.log("Updating game state from peer:", innerMessage.gameState);
        setGameState((prevState) => {
          // console.log('State update - from:', prevState, 'to:', innerMessage.gameState);
          return innerMessage.gameState;
        });

        // Update timer ref without causing re-render
        if (innerMessage.timerState) {
          timerStateRef.current = { ...innerMessage.timerState };
          console.log(
            "Timer state updated from peer:",
            innerMessage.timerState
          );
        }
      } else if (innerMessage.type === "playerAssignment") {
        // console.log('Received initial game state from host:', innerMessage.initialGameState);
        setGameState(innerMessage.initialGameState);
      }
    }
    // Handle game state sync request
    else if (message.type === "requestGameStateSync") {
      // console.log('Peer requested current game state, sending...');

      // Prevent rapid duplicate sync requests (debounce to max once per 2 seconds)
      const now = Date.now();
      const timeSinceLastRequest = now - lastSyncRequestTime.current;

      // Use setGameState to get the current state and send it
      setGameState((currentState) => {
        // console.log('Sending current game state in response to request:', currentState);
        webRTC.sendGameState({
          type: "gameStateSync",
          gameState: currentState,
          timerState: { ...timerStateRef.current },
          timestamp: now,
        });
        return currentState; // Don't modify state, just use it
      });

      // Only request back if we haven't recently requested
      if (timeSinceLastRequest > 2000) {
        lastSyncRequestTime.current = now;
      }
    }
    // Handle graceful disconnect notification
    else if (message.type === "disconnect" && message.data) {
      const innerMessage = message.data;
      if (innerMessage.type === "gracefulDisconnect") {
        // console.log('Received graceful disconnect notification');
        webRTC.setGracefulDisconnectFlag &&
          webRTC.setGracefulDisconnectFlag(true);
      }
    }
    // Legacy handling for direct messages (fallback)
    else if (message.type === "gameStateSync") {
      // console.log('Updating game state from peer (direct):', message.gameState);
      setGameState((prevState) => {
        // console.log('State update - from:', prevState, 'to:', message.gameState);
        return message.gameState;
      });
    } else if (message.type === "playerAssignment") {
      // console.log('Received initial game state from host (direct):', message.initialGameState);
      setGameState(message.initialGameState);
    }
  }, []);

  // Set up message handler
  useEffect(() => {
    if (webRTC.setOnMessageReceived) {
      webRTC.setOnMessageReceived((message) => {
        // Always call the main handler first
        handleMessage(message);

        // Forward ALL messages to Navbar's debug panel via a custom event
        // This allows Navbar to display messages without conflicting with App's handler
        window.dispatchEvent(new CustomEvent('webrtc-message', { detail: message }));
      });
    }
  }, [webRTC.setOnMessageReceived, handleMessage]);

  // Set up data channel open handler to send initial state when ready
  useEffect(() => {
    if (webRTC.setOnDataChannelOpen && webRTC.gameMode === "host") {
      webRTC.setOnDataChannelOpen(() => {
        // console.log('Data channel ready - sending initial game state to guest:', gameState);
        webRTC.sendGameState({
          type: "playerAssignment",
          hostColor: COLORS.WHITE,
          guestColor: COLORS.BLACK,
          initialGameState: gameState,
        });
      });
    }
  }, [webRTC.setOnDataChannelOpen, webRTC.gameMode, gameState, webRTC]);

  // Reset game state when returning to single player
  useEffect(() => {
    if (webRTC.gameMode === "singlePlayer") {
      // console.log('Returning to single player - resetting game state');
      setGameState(createInitialGameState());
      // Reset timer state as well
      timerStateRef.current = {
        whiteTime: 180000,
        blackTime: 180000,
        lastUpdate: Date.now(),
      };
      // Reset AI thinking state
      setIsAiThinking(false);
    }
  }, [webRTC.gameMode]);

  // Handle reconnection - request game state sync if we're the guest
  useEffect(() => {
    if (
      webRTC.isConnected &&
      !webRTC.isReconnecting &&
      webRTC.gameMode === "guest"
    ) {
      // Small delay to ensure connection is stable after reconnection
      setTimeout(() => {
        // console.log('Reconnected as guest - requesting game state sync');
        webRTC.requestGameStateSync();
      }, 1000);
    }
  }, [
    webRTC.isConnected,
    webRTC.isReconnecting,
    webRTC.gameMode,
    webRTC.requestGameStateSync,
  ]);

  // Reset lastUpdate timestamp when reconnection completes to prevent time deduction bug
  useEffect(() => {
    // When reconnection completes (transitions from true to false while connected)
    if (webRTC.isConnected && !webRTC.isReconnecting) {
      // Update lastUpdate to current time to prevent elapsed time from including reconnection period
      timerStateRef.current.lastUpdate = Date.now();
      // console.log('Reconnection completed - reset timer lastUpdate to prevent time deduction bug');
    }
  }, [webRTC.isConnected, webRTC.isReconnecting]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar
        webRTC={webRTC}
        gameState={gameState}
        onStartEngineGame={startEngineGame}
        aiDifficulty={aiDifficulty}
        onDifficultyChange={setAiDifficulty}
      />

      {/* Reconnection Status Overlay */}
      {webRTC.isReconnecting && (
        <div className="fixed top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg flex items-center space-x-2 sm:space-x-3 max-w-[90vw]">
          <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
          <span className="font-medium text-sm sm:text-base">
            Reconnecting...
          </span>
        </div>
      )}

      <ChessBoard
        gameState={gameState}
        onGameStateChange={handleGameStateChange}
        gameMode={webRTC.gameMode}
        playerColor={webRTC.playerColor}
        isConnected={webRTC.isConnected}
        timerStateRef={timerStateRef}
        isReconnecting={webRTC.isReconnecting}
        isAiThinking={isAiThinking}
        onResetToSinglePlayer={handleResetToSinglePlayer}
      />
    </div>
  );
}

export default App;
