# WebRTC Multiplayer Documentation

This directory contains documentation for the peer-to-peer multiplayer system using WebRTC and Firebase Firestore for signaling.

## Available Documentation

- **[Reconnection Architecture](./reconnection-architecture.md)** - P2P connection handling, reconnection logic, and resilience
- **[Disconnection Debugging](./disconnection-debugging.md)** - Troubleshooting connection issues and debugging guide

## WebRTC System Overview

The multiplayer system uses:

- **WebRTC**: Peer-to-peer data channels for real-time game state synchronization
- **Firebase Firestore**: Signaling server for ICE candidate exchange
- **Automatic Reconnection**: Up to 3 retry attempts with progressive delays
- **Heartbeat Monitoring**: 90-second timeout for connection health

## Key Features

### Connection Management

- Room-based matchmaking with 6-character codes
- Host/Guest role assignment
- ICE candidate exchange via Firestore
- STUN/TURN server support for NAT traversal

### Reconnection System

- Automatic retry with exponential backoff
- Up to 3 reconnection attempts
- Progressive delays: 2s → 4s → 8s
- Graceful degradation on failure

### State Synchronization

- Real-time game state updates via data channel
- Move validation on both peers
- Turn-based coordination
- Color assignment (Host=White, Guest=Black)

### Health Monitoring

- 90-second heartbeat timeout
- Connection state tracking
- Explicit disconnect detection
- "Opponent left" vs "Connection lost" distinction

## Architecture

```
┌─────────────┐                    ┌─────────────┐
│   Host      │                    │   Guest     │
│  (White)    │                    │  (Black)    │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │  1. Create Room                  │
       ├─────────────────────────────────>│
       │     (6-char code)                │
       │                                  │
       │  2. ICE Candidates (via Firestore)
       │<─────────────────────────────────│
       │                                  │
       │  3. WebRTC Data Channel          │
       │<════════════════════════════════>│
       │     (Direct P2P)                 │
       │                                  │
       │  4. Game State Sync              │
       │<════════════════════════════════>│
       │                                  │
```

## Connection States

1. **Disconnected**: No active connection
2. **Connecting**: ICE exchange in progress
3. **Connected**: P2P data channel active
4. **Reconnecting**: Attempting to restore connection
5. **Failed**: All reconnection attempts exhausted

## Common Issues & Solutions

### NAT Traversal Problems

- Ensure TURN server credentials are configured
- Check firewall settings
- Verify STUN server accessibility

### Connection Drops

- Check network stability
- Monitor heartbeat timeouts
- Review browser console for WebRTC errors

### State Desynchronization

- Validate moves on both peers
- Use deterministic game state updates
- Implement conflict resolution (planned)

## Configuration

### Environment Variables

```env
VITE_TURN_SERVER_URL=turn:example.com:3478
VITE_TURN_SERVER_USERNAME=username
VITE_TURN_SERVER_CREDENTIAL=password
```

### Firebase Setup

See `FIREBASE_SETUP.md` in project root for:

- Creating Firebase project
- Configuring Firestore
- Setting up security rules

## Usage Example

```javascript
import { useWebRTC } from './hooks/useWebRTC';

const MyComponent = () => {
  const {
    connectionState,
    createRoom,
    joinRoom,
    sendGameState
  } = useWebRTC(gameState, onGameStateUpdate);

  // Host creates room
  const roomCode = await createRoom();

  // Guest joins room
  await joinRoom(roomCode);

  // Send game state updates
  sendGameState(updatedGameState);
};
```

## Testing Multiplayer

1. **Local Testing**: Open two browser windows
2. **Network Testing**: Use different devices on same network
3. **Internet Testing**: Use devices on different networks
4. **Reconnection Testing**: Simulate network interruptions

## Performance Considerations

- Data channel messages are small (~1-5KB per game state)
- Low latency (<50ms typical for local network)
- Bandwidth usage negligible (~1KB/s average)
- No server costs (P2P direct connection)

## Security

- Firebase security rules restrict room access
- No sensitive data transmitted (game state only)
- ICE candidates expire after use
- Rooms auto-cleanup after inactivity

## Future Enhancements

- [ ] Chess.com-style pre-move support
- [ ] Spectator mode
- [ ] Game replay/recording
- [ ] Chat system
- [ ] Multiple simultaneous games
- [ ] Ranked matchmaking
- [ ] Tournament support

## Related Documentation

- [Core Systems](../03-CORE-SYSTEMS.md) - Game state structure
- [Developer Guide](../development/developer-guide.md) - Setup and configuration
- [Known Issues](../07-ISSUES-AND-BUGS.md) - Current limitations

## Troubleshooting

See [Disconnection Debugging](./disconnection-debugging.md) for detailed troubleshooting steps.

---

[← Back to Documentation Index](../00-INDEX.md)
