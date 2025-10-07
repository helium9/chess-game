import { useState, useCallback, useRef, useEffect } from 'react';
import WebRTCSignalingService from '../services/WebRTCSignalingService.js';
import { COLORS } from '../utils/constants.js';

const useWebRTC = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionId, setConnectionId] = useState('');
    const [connectionState, setConnectionState] = useState('closed');
    const [error, setError] = useState(null);
    const [gracefulDisconnectReceived, setGracefulDisconnectReceived] = useState(false);

    // Game mode and player management
    const [gameMode, setGameMode] = useState('singlePlayer'); // 'singlePlayer' | 'host' | 'guest'
    const [playerColor, setPlayerColor] = useState(null); // 'white' | 'black' | null

    const signalingService = useRef(null);

    // Initialize signaling service
    useEffect(() => {
        signalingService.current = new WebRTCSignalingService();

        // Set up connection state callback
        signalingService.current.setConnectionStateCallback((state) => {
            console.log('WebRTC connection state changed:', state);
            setConnectionState(state);
            setIsConnected(state === 'connected');

            if (state === 'connected') {
                setIsConnecting(false);
                setError(null);
            } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                // Peer disconnected or connection failed - reset to initial state
                setIsConnected(false);
                setIsConnecting(false);

                if (state === 'failed') {
                    setError('Connection failed');
                } else if (state === 'disconnected') {
                    // Check if this was a graceful disconnect
                    if (gracefulDisconnectReceived) {
                        setError('Opponent left the game');
                        setGracefulDisconnectReceived(false); // Reset flag
                    } else {
                        setError('Connection lost unexpectedly');
                    }
                    // Auto-clear the error after a few seconds
                    setTimeout(() => setError(null), 5000);
                }

                // Reset to single player mode immediately
                setGameMode('singlePlayer');
                setPlayerColor(null);
                console.log('Connection lost - returning to single player mode');

                // Reset connection ID after a delay to allow user to see what happened
                setTimeout(() => {
                    setConnectionId('');
                }, 2000);
            }
        });

        return () => {
            if (signalingService.current) {
                signalingService.current.disconnect();
            }
        };
    }, []);

    // Create a new call
    const createCall = useCallback(async () => {
        try {
            setIsConnecting(true);
            setError(null);

            const callId = await signalingService.current.createCall();
            setConnectionId(callId);

            // Set as host (plays white)
            setGameMode('host');
            setPlayerColor(COLORS.WHITE);

            console.log('Call created with ID:', callId, '- You are HOST (WHITE)');
            return callId;
        } catch (err) {
            console.error('Failed to create call:', err);
            setError('Failed to create call: ' + err.message);
            setIsConnecting(false);
            throw err;
        }
    }, []);

    // Join an existing call
    const joinCall = useCallback(async (callId) => {
        try {
            setIsConnecting(true);
            setError(null);

            await signalingService.current.joinCall(callId);
            setConnectionId(callId);

            // Set as guest (plays black)
            setGameMode('guest');
            setPlayerColor(COLORS.BLACK);

            console.log('Joined call:', callId, '- You are GUEST (BLACK)');
            return true;
        } catch (err) {
            console.error('Failed to join call:', err);
            setError('Failed to join call: ' + err.message);
            setIsConnecting(false);
            throw err;
        }
    }, []);

    // Disconnect from call
    const disconnect = useCallback(async () => {
        try {
            if (signalingService.current) {
                await signalingService.current.disconnect();
            }

            setIsConnected(false);
            setIsConnecting(false);
            setConnectionId('');
            setConnectionState('closed');
            setError(null);

            // Reset to single player mode
            setGameMode('singlePlayer');
            setPlayerColor(null);

            console.log('Disconnected from call - Back to single player mode');
        } catch (err) {
            console.error('Failed to disconnect:', err);
            setError('Failed to disconnect: ' + err.message);
        }
    }, []);

    // Cancel call creation
    const cancelCall = useCallback(async () => {
        try {
            if (signalingService.current) {
                await signalingService.current.disconnect();
            }

            setIsConnecting(false);
            setConnectionId('');
            setConnectionState('closed');
            setError(null);

            // Reset to single player mode
            setGameMode('singlePlayer');
            setPlayerColor(null);

            console.log('Call cancelled - Back to single player mode');
        } catch (err) {
            console.error('Failed to cancel call:', err);
            setError('Failed to cancel call: ' + err.message);
        }
    }, []);

    // Send game state to peer
    const sendGameState = useCallback((gameState) => {
        if (signalingService.current && isConnected) {
            signalingService.current.sendGameState(gameState);
        }
    }, [isConnected]);

    // Send move to peer
    const sendMove = useCallback((move) => {
        if (signalingService.current && isConnected) {
            signalingService.current.sendMove(move);
        }
    }, [isConnected]);

    // Send disconnect notification
    const sendDisconnectNotification = useCallback(() => {
        if (signalingService.current && isConnected) {
            signalingService.current.sendDisconnectNotification();
        }
    }, [isConnected]);

    // Set graceful disconnect flag
    const setGracefulDisconnectFlag = useCallback((flag) => {
        setGracefulDisconnectReceived(flag);
    }, []);

    // Set callback for receiving messages
    const setOnMessageReceived = useCallback((callback) => {
        if (signalingService.current) {
            signalingService.current.setDataChannelMessageCallback(callback);
        }
    }, []);

    return {
        // Connection State
        isConnecting,
        isConnected,
        connectionId,
        connectionState,
        error,

        // Game State
        gameMode,
        playerColor,

        // Actions
        createCall,
        joinCall,
        disconnect,
        cancelCall,
        sendGameState,
        sendMove,
        sendDisconnectNotification,
        setGracefulDisconnectFlag,
        setOnMessageReceived,
    };
};

export default useWebRTC;