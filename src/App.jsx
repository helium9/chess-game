import { useState, useEffect, useCallback } from 'react';
import ChessBoard from "./components/ChessBoard.jsx";
import Navbar from "./components/ui/Navbar.jsx";
import useWebRTC from "./hooks/useWebRTC.js";
import { createInitialGameState } from "./utils/gameState.js";
import { COLORS } from "./utils/constants.js";
import "./App.css";

function App() {
  const webRTC = useWebRTC();
  const [gameState, setGameState] = useState(() => createInitialGameState());

  // Function to handle game state changes from ChessBoard
  const handleGameStateChange = (newGameState) => {
    console.log('Game state changed:', {
      oldState: gameState,
      newState: newGameState,
      currentTurn: newGameState.currentTurn,
      gameMode: webRTC.gameMode,
      playerColor: webRTC.playerColor
    });

    setGameState(newGameState);

    // Send to peer if connected
    if (webRTC.isConnected) {
      console.log('Sending game state to peer:', {
        type: 'gameStateSync',
        gameState: newGameState,
        timestamp: Date.now()
      });
      webRTC.sendGameState({
        type: 'gameStateSync',
        gameState: newGameState,
        timestamp: Date.now()
      });
    }
  };

  // Handle incoming game state from peer with useCallback to prevent stale closures
  const handleMessage = useCallback((message) => {
    console.log('Received message from peer:', message);

    // Handle the double-wrapped message structure from WebRTC service
    if (message.type === 'gameState' && message.data) {
      const innerMessage = message.data;

      if (innerMessage.type === 'gameStateSync') {
        console.log('Updating game state from peer:', innerMessage.gameState);
        setGameState(prevState => {
          console.log('State update - from:', prevState, 'to:', innerMessage.gameState);
          return innerMessage.gameState;
        });
      } else if (innerMessage.type === 'playerAssignment') {
        console.log('Received initial game state from host:', innerMessage.initialGameState);
        setGameState(innerMessage.initialGameState);
      }
    }
    // Handle graceful disconnect notification
    else if (message.type === 'disconnect' && message.data) {
      const innerMessage = message.data;
      if (innerMessage.type === 'gracefulDisconnect') {
        console.log('Received graceful disconnect notification');
        webRTC.setGracefulDisconnectFlag && webRTC.setGracefulDisconnectFlag(true);
      }
    }
    // Legacy handling for direct messages (fallback)
    else if (message.type === 'gameStateSync') {
      console.log('Updating game state from peer (direct):', message.gameState);
      setGameState(prevState => {
        console.log('State update - from:', prevState, 'to:', message.gameState);
        return message.gameState;
      });
    } else if (message.type === 'playerAssignment') {
      console.log('Received initial game state from host (direct):', message.initialGameState);
      setGameState(message.initialGameState);
    }
  }, []);

  // Set up message handler
  useEffect(() => {
    if (webRTC.setOnMessageReceived) {
      webRTC.setOnMessageReceived(handleMessage);
    }
  }, [webRTC.setOnMessageReceived, handleMessage]);

  // Send initial game state to guest when they connect (host only)
  useEffect(() => {
    if (webRTC.isConnected && webRTC.gameMode === 'host') {
      // Small delay to ensure connection is fully established
      setTimeout(() => {
        console.log('Host sending initial game state to guest:', gameState);
        webRTC.sendGameState({
          type: 'playerAssignment',
          hostColor: COLORS.WHITE,
          guestColor: COLORS.BLACK,
          initialGameState: gameState
        });
      }, 1500); // Increased delay
    }
  }, [webRTC.isConnected, webRTC.gameMode, gameState]);

  // Reset game state when returning to single player
  useEffect(() => {
    if (webRTC.gameMode === 'singlePlayer') {
      console.log('Returning to single player - resetting game state');
      setGameState(createInitialGameState());
    }
  }, [webRTC.gameMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar webRTC={webRTC} gameState={gameState} />
      <ChessBoard
        gameState={gameState}
        onGameStateChange={handleGameStateChange}
        gameMode={webRTC.gameMode}
        playerColor={webRTC.playerColor}
        isConnected={webRTC.isConnected}
      />
    </div>
  );
}

export default App;
