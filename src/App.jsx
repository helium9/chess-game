import { useState, useEffect, useCallback, useRef } from 'react';
import ChessBoard from "./components/ChessBoard.jsx";
import Navbar from "./components/ui/Navbar.jsx";
import useWebRTC from "./hooks/useWebRTC.js";
import { createInitialGameState } from "./utils/gameState.js";
import { COLORS } from "./utils/constants.js";
import "./App.css";

function App() {
  const webRTC = useWebRTC();
  const [gameState, setGameState] = useState(() => createInitialGameState());
  const lastSyncRequestTime = useRef(0); // Track last time we sent a sync request

  // Timer state - using ref to avoid re-renders
  const timerStateRef = useRef({
    whiteTime: 180000, // 3 minutes in ms
    blackTime: 180000,
    lastUpdate: Date.now()
  });

  // Function to handle game state changes from ChessBoard
  const handleGameStateChange = (newGameState) => {
    console.log('Game state changed:', {
      oldState: gameState,
      newState: newGameState,
      currentTurn: newGameState.currentTurn,
      gameMode: webRTC.gameMode,
      playerColor: webRTC.playerColor
    });

    // Update timer state when a move is made (only in multiplayer)
    if (webRTC.gameMode !== 'singlePlayer' && webRTC.isConnected) {
      const now = Date.now();
      const elapsed = now - timerStateRef.current.lastUpdate;

      // Deduct time from the player who just moved (opposite of current turn)
      const movingColor = newGameState.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      if (movingColor === COLORS.WHITE) {
        timerStateRef.current.whiteTime = Math.max(0, timerStateRef.current.whiteTime - elapsed);
      } else {
        timerStateRef.current.blackTime = Math.max(0, timerStateRef.current.blackTime - elapsed);
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

    // Send to peer if connected
    if (webRTC.isConnected) {
      // console.log('Sending game state to peer:', {
      //   type: 'gameStateSync',
      //   gameState: newGameState,
      //   timerState: { ...timerStateRef.current },
      //   timestamp: Date.now()
      // });
      webRTC.sendGameState({
        type: 'gameStateSync',
        gameState: newGameState,
        timerState: { ...timerStateRef.current },
        timestamp: Date.now()
      });
    }
  };

  // Handle incoming game state from peer with useCallback to prevent stale closures
  const handleMessage = useCallback((message) => {
    // console.log('Received message from peer:', message);

    // Handle the double-wrapped message structure from WebRTC service
    if (message.type === 'gameState' && message.data) {
      const innerMessage = message.data;

      if (innerMessage.type === 'gameStateSync') {
        console.log('Updating game state from peer:', innerMessage.gameState);
        setGameState(prevState => {
          // console.log('State update - from:', prevState, 'to:', innerMessage.gameState);
          return innerMessage.gameState;
        });

        // Update timer ref without causing re-render
        if (innerMessage.timerState) {
          timerStateRef.current = { ...innerMessage.timerState };
          console.log('Timer state updated from peer:', innerMessage.timerState);
        }
      } else if (innerMessage.type === 'playerAssignment') {
        // console.log('Received initial game state from host:', innerMessage.initialGameState);
        setGameState(innerMessage.initialGameState);
      }
    }
    // Handle game state sync request
    else if (message.type === 'requestGameStateSync') {
      // console.log('Peer requested current game state, sending...');

      // Prevent rapid duplicate sync requests (debounce to max once per 2 seconds)
      const now = Date.now();
      const timeSinceLastRequest = now - lastSyncRequestTime.current;

      // Use setGameState to get the current state and send it
      setGameState(currentState => {
        // console.log('Sending current game state in response to request:', currentState);
        webRTC.sendGameState({
          type: 'gameStateSync',
          gameState: currentState,
          timerState: { ...timerStateRef.current },
          timestamp: now
        });
        return currentState; // Don't modify state, just use it
      });

      // Only request back if we haven't recently requested
      if (timeSinceLastRequest > 2000) {
        lastSyncRequestTime.current = now;
      }
    }
    // Handle graceful disconnect notification
    else if (message.type === 'disconnect' && message.data) {
      const innerMessage = message.data;
      if (innerMessage.type === 'gracefulDisconnect') {
        // console.log('Received graceful disconnect notification');
        webRTC.setGracefulDisconnectFlag && webRTC.setGracefulDisconnectFlag(true);
      }
    }
    // Legacy handling for direct messages (fallback)
    else if (message.type === 'gameStateSync') {
      // console.log('Updating game state from peer (direct):', message.gameState);
      setGameState(prevState => {
        // console.log('State update - from:', prevState, 'to:', message.gameState);
        return message.gameState;
      });
    } else if (message.type === 'playerAssignment') {
      // console.log('Received initial game state from host (direct):', message.initialGameState);
      setGameState(message.initialGameState);
    }
  }, []);

  // Set up message handler
  useEffect(() => {
    if (webRTC.setOnMessageReceived) {
      webRTC.setOnMessageReceived(handleMessage);
    }
  }, [webRTC.setOnMessageReceived, handleMessage]);

  // Set up data channel open handler to send initial state when ready
  useEffect(() => {
    if (webRTC.setOnDataChannelOpen && webRTC.gameMode === 'host') {
      webRTC.setOnDataChannelOpen(() => {
        // console.log('Data channel ready - sending initial game state to guest:', gameState);
        webRTC.sendGameState({
          type: 'playerAssignment',
          hostColor: COLORS.WHITE,
          guestColor: COLORS.BLACK,
          initialGameState: gameState
        });
      });
    }
  }, [webRTC.setOnDataChannelOpen, webRTC.gameMode, gameState, webRTC]);

  // Reset game state when returning to single player
  useEffect(() => {
    if (webRTC.gameMode === 'singlePlayer') {
      // console.log('Returning to single player - resetting game state');
      setGameState(createInitialGameState());
      // Reset timer state as well
      timerStateRef.current = {
        whiteTime: 180000,
        blackTime: 180000,
        lastUpdate: Date.now()
      };
    }
  }, [webRTC.gameMode]);

  // Handle reconnection - request game state sync if we're the guest
  useEffect(() => {
    if (webRTC.isConnected && !webRTC.isReconnecting && webRTC.gameMode === 'guest') {
      // Small delay to ensure connection is stable after reconnection
      setTimeout(() => {
        // console.log('Reconnected as guest - requesting game state sync');
        webRTC.requestGameStateSync();
      }, 1000);
    }
  }, [webRTC.isConnected, webRTC.isReconnecting, webRTC.gameMode, webRTC.requestGameStateSync]);

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
      <Navbar webRTC={webRTC} gameState={gameState} />

      {/* Reconnection Status Overlay */}
      {webRTC.isReconnecting && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span className="font-medium">Reconnecting to opponent...</span>
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
      />
    </div>
  );
}

export default App;
