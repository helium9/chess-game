# WebRTC Reconnection Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Connection States](#connection-states)
4. [Core Components](#core-components)
5. [Connection Flow](#connection-flow)
6. [Reconnection Mechanisms](#reconnection-mechanisms)
7. [Edge Cases & Recovery](#edge-cases--recovery)
8. [Message Protocol](#message-protocol)
9. [State Synchronization](#state-synchronization)
10. [Configuration & Tuning](#configuration--tuning)

---

## Overview

The WebRTC reconnection system provides a robust peer-to-peer connection framework for real-time chess gameplay with comprehensive failure detection, automatic reconnection, and state synchronization capabilities.

### Key Features
- **Automatic Reconnection**: Up to 3 attempts with progressive delays
- **Connection Health Monitoring**: Heartbeat mechanism with 90-second timeout
- **State Preservation**: Game state maintained during reconnection
- **Graceful Disconnection**: Proper handling of intentional disconnects
- **Edge Case Coverage**: Handles network failures, browser backgrounding, and ICE failures

---

## System Architecture

### Component Hierarchy

```
App.jsx (React Component Layer)
    ↓
useWebRTC.js (State Management Hook)
    ↓
WebRTCSignalingService.js (Core WebRTC Logic)
    ↓
Firebase Firestore (Signaling Server)
    ↓
RTCPeerConnection (Browser WebRTC API)
```

### Data Flow

```
User Action → React State Update → WebRTC Service → Data Channel → Peer
                                         ↓
                                  Firebase Signaling
                                  (ICE Candidates)
```

---

## Connection States

### State Machine

The system manages multiple overlapping state machines:

#### 1. WebRTC Connection States
- **`closed`**: No connection exists
- **`new`**: Connection object created, not yet started
- **`connecting`**: ICE negotiation in progress
- **`connected`**: Peer-to-peer connection established
- **`disconnected`**: Connection lost but may recover
- **`failed`**: Connection permanently failed

#### 2. Application States
- **`singlePlayer`**: No multiplayer connection
- **`host`**: Player initiated the game (plays White)
- **`guest`**: Player joined the game (plays Black)

#### 3. Reconnection States
- **`isConnecting`**: Initial connection attempt
- **`isConnected`**: Active connection
- **`isReconnecting`**: Reconnection in progress
- **`reconnecting`**: State notification during reconnection
- **`reconnection-successful`**: Reconnection completed
- **`reconnection-failed`**: All reconnection attempts exhausted
- **`graceful-disconnect`**: Intentional disconnect detected

### State Transitions

```
[Single Player] 
    → createCall/joinCall → [Connecting]
    → success → [Connected (Host/Guest)]
    → disconnect → [Single Player]

[Connected]
    → network failure → [Reconnecting]
    → success → [Connected]
    → max attempts → [Single Player]
    
[Connected]
    → graceful disconnect → [Graceful Disconnect]
    → cleanup → [Single Player]
```

---

## Core Components

### 1. WebRTCSignalingService (`src/services/WebRTCSignalingService.js`)

The central service managing all WebRTC operations.

#### Key Properties
- **`localConnection`**: RTCPeerConnection instance
- **`dataChannel`**: RTCDataChannel for game data
- **`callDoc`**: Firestore document reference for signaling
- **`lastCallId`**: Preserved call ID for reconnection
- **`lastRole`**: 'initiator' or 'receiver' for reconnection
- **`reconnectAttempts`**: Current reconnection attempt count
- **`isReconnecting`**: Boolean flag for reconnection state
- **`gracefulDisconnectReceived`**: Flag for intentional disconnects

#### Core Methods

##### Connection Management
- **`initializePeerConnection()`**: Creates RTCPeerConnection with STUN/TURN servers
- **`createCall()`**: Host creates new Firestore signaling document
- **`joinCall(callId)`**: Guest joins existing call by ID
- **`disconnect()`**: Graceful cleanup of all connections

##### Reconnection Logic
- **`handleConnectionLoss()`**: Orchestrates reconnection attempts
- **`recreateCall()`**: Host updates existing Firestore doc with new offer
- **`rejoinCall(callId)`**: Guest rejoins with existing call ID
- **`scheduleConnectionLossHandler()`**: Debounced connection loss detection

##### Connection Monitoring
- **`startHeartbeat()`**: Initiates 30-second heartbeat interval
- **`sendHeartbeatResponse()`**: Responds to peer heartbeats
- **`stopHeartbeat()`**: Cleanup heartbeat timers

##### Cleanup Operations
- **`cleanupConnectionForReconnect()`**: Closes connections, keeps Firestore docs
- **`cleanupConnection()`**: Full cleanup including Firestore

### 2. useWebRTC Hook (`src/hooks/useWebRTC.js`)

React hook providing WebRTC functionality to components.

#### State Management
- Manages connection, reconnection, and game mode states
- Handles state transitions based on service callbacks
- Provides action callbacks for UI interactions

#### Key Functions
- **`createCall()`**: Initiates host connection (White player)
- **`joinCall(callId)`**: Joins as guest (Black player)
- **`disconnect()`**: Manual disconnection
- **`sendGameState(state)`**: Sends game state to peer
- **`requestGameStateSync()`**: Requests current state from peer

### 3. App Component (`src/App.jsx`)

Main application component orchestrating the game.

#### Responsibilities
- Game state management
- Message routing between WebRTC and ChessBoard
- Reconnection UI feedback
- Initial state synchronization

---

## Connection Flow

### Initial Connection (Host)

1. **User clicks "Create Game"**
2. `useWebRTC.createCall()` called
3. Service creates Firestore document with unique ID
4. RTCPeerConnection initialized with offer
5. ICE candidates collected and stored in Firestore
6. Host displays connection ID to share
7. Data channel created (initiator side)
8. Heartbeat mechanism started

### Initial Connection (Guest)

1. **User enters connection ID and clicks "Join"**
2. `useWebRTC.joinCall(callId)` called
3. Service retrieves Firestore document
4. RTCPeerConnection initialized
5. Retrieves host's offer from Firestore
6. Creates answer and updates Firestore
7. ICE candidates exchanged
8. Data channel established (receiver side)
9. Receives initial game state from host
10. Heartbeat mechanism started

### Data Channel Synchronization

The data channel opening is asynchronous and critical:

1. **Data channel opens** (either side)
2. `onDataChannelOpen` callback triggered
3. **Host-specific**: Sends initial game state with player assignments
4. Both sides can now exchange messages
5. Game state updates flow bidirectionally

---

## Reconnection Mechanisms

### 1. ICE Connection Monitoring

**Location**: `WebRTCSignalingService.oniceconnectionstatechange`

#### Detection Logic
- **`failed`**: Immediate reconnection scheduled
- **`disconnected`**: 5-second grace period before reconnection
- **`connected/completed`**: Cancels pending reconnections, requests sync

#### Why It Works
- ICE layer detects network-level issues before application layer
- Grace period allows transient disconnections to recover
- Different handling for permanent vs temporary failures

### 2. Heartbeat Mechanism

**Intervals**: 30-second heartbeat send, 10-second timeout check

#### Flow
1. Every 30 seconds: Send `{ type: 'heartbeat' }` message
2. Peer responds with `{ type: 'heartbeatResponse' }`
3. Update `lastHeartbeatReceived` timestamp
4. Every 10 seconds: Check if > 90 seconds since last heartbeat
5. If timeout: Schedule reconnection

#### Advantages
- Detects "silent" connection failures
- Independent of WebRTC state changes
- Catches issues like:
  - NAT binding timeouts
  - Firewall drops
  - Browser backgrounding
  - Network path changes

### 3. Connection Loss Handler

**Location**: `handleConnectionLoss()`

#### Debouncing Strategy
```
Connection Issue Detected
    ↓
scheduleConnectionLossHandler() (2-second debounce)
    ↓
Validate: Still disconnected?
    ↓
handleConnectionLoss()
```

#### Reconnection Flow
1. **Check preconditions**:
   - Not already reconnecting
   - Not graceful disconnect
   - Haven't exceeded max attempts
   - Have valid lastCallId and lastRole

2. **Progressive delay**: `min(2000ms × attemptNumber, 10000ms)`

3. **Cleanup**: Unsubscribe Firestore listeners, close connections

4. **Reconnect**:
   - **Host**: Update existing Firestore doc with new offer
   - **Guest**: Rejoin using same call ID

5. **Timeout**: 20-second timeout for connection establishment

6. **Success detection**: Triggered by `connectionState === 'connected'`

### 4. Reconnection Success Handling

**Location**: `onconnectionstatechange` callback

When `connectionState === 'connected'` AND `isReconnecting === true`:
1. Clear reconnection timeout
2. Reset attempt counter
3. Notify hook: `'reconnection-successful'`
4. Request game state sync (1.5s delay)
5. Resume heartbeat mechanism

---

## Edge Cases & Recovery

### 1. Graceful Disconnect

**Scenario**: User clicks "Disconnect" button

#### Process
1. **Disconnecting peer**:
   - Sends multiple `gracefulDisconnect` notifications (with retries)
   - Waits 100ms for delivery
   - Closes connections
   - Resets to single player

2. **Receiving peer**:
   - Sets `gracefulDisconnectReceived = true` flag
   - Stops reconnection attempts
   - Shows "Opponent left the game"
   - Auto-resets to single player after 3 seconds

#### Edge Case Handling
- If notification fails: Connection state `failed` is checked for graceful flag
- Prevents reconnection loops when peer intentionally leaves

### 2. Both Peers Disconnect Simultaneously

**Handled by**: Graceful disconnect detection + state machine

- Each peer sends disconnect notification
- Both receive notifications before connection closes
- Both reset to single player
- No reconnection attempts triggered

### 3. Connection Fails During Game

**Scenario**: Network drops mid-game

#### Recovery Steps
1. ICE state → `disconnected` (5-second grace)
2. If still disconnected → Schedule reconnection
3. Heartbeat timeout (90s) as backup trigger
4. Reconnection initiated (up to 3 attempts)
5. On success: Guest requests game state sync
6. Host sends current state
7. Boards re-synchronized

### 4. Firestore Document Conflicts

**Problem**: Old Firestore listeners adding ICE candidates to closed connections

#### Solution
```
Before closing RTCPeerConnection:
1. Unsubscribe ALL Firestore listeners
2. THEN close peer connection
3. Prevents InvalidStateError

During reconnection:
- Reuse SAME Firestore document (same call ID)
- Update offer/answer in existing doc
- Don't create new documents
```

### 5. Data Channel Opens Late

**Problem**: Initial game state sent before channel is ready

#### Solution
- **Old**: Fixed 1.5-second delay (unreliable)
- **New**: `onDataChannelOpen` callback
  - Host sets callback: Send state ONLY when channel opens
  - Guarantees message delivery
  - Sends most recent game state

### 6. Browser Tab Backgrounding

**Handled by**: Heartbeat timeout mechanism

- Browser may throttle WebRTC when tab backgrounded
- Heartbeat timeout (90s) still triggers
- Reconnection brings connection back when tab refocused

### 7. Network Switch (WiFi → Mobile)

**Handled by**: ICE connection state monitoring

- ICE detects network path change
- `disconnected` state triggers reconnection
- New ICE candidates negotiated
- Connection re-established on new network

### 8. State Desynchronization

**Scenario**: Boards show different game states

#### Prevention
1. **After reconnection**: Guest automatically requests sync
2. **After recovery without full reconnection**: Sync requested on ICE recovery
3. **Manual sync**: Peer can request current state anytime

#### Sync Flow
```
Guest: Send { type: 'requestGameStateSync' }
    ↓
Host: Respond with current game state
    ↓
Guest: Update local state
    ↓
Boards synchronized
```

### 9. Max Reconnection Attempts Reached

**Scenario**: 3 reconnection attempts all fail

#### Handling
1. Service notifies: `'reconnection-failed'`
2. Hook shows error: "Failed to reconnect. Connection lost."
3. Auto-reset to single player after 5 seconds
4. Game state cleared
5. UI returns to "Start Game"

---

## Message Protocol

### Message Types

#### 1. Game State Messages
```javascript
{
  type: 'gameState',
  data: {
    type: 'gameStateSync',
    gameState: { board, currentTurn, moveHistory, ... },
    timestamp: Date.now()
  }
}
```

#### 2. Player Assignment (Initial)
```javascript
{
  type: 'gameState',
  data: {
    type: 'playerAssignment',
    hostColor: 'white',
    guestColor: 'black',
    initialGameState: { ... }
  }
}
```

#### 3. Heartbeat Messages
```javascript
// Request
{ type: 'heartbeat', timestamp: Date.now() }

// Response
{ type: 'heartbeatResponse', timestamp: Date.now() }
```

#### 4. Game State Sync Request
```javascript
{ type: 'requestGameStateSync', timestamp: Date.now() }
```

#### 5. Disconnect Notification
```javascript
{
  type: 'disconnect',
  data: {
    type: 'gracefulDisconnect',
    message: 'Player left the game'
  },
  timestamp: Date.now()
}
```

### Message Flow

```
App.jsx (handleMessage)
    ↑
WebRTCService (onDataChannelMessage callback)
    ↑
Data Channel (onmessage event)
    ↑
RTCDataChannel (WebRTC)
    ↑
Network (peer)
```

---

## State Synchronization

### Synchronization Points

#### 1. Initial Connection
- **When**: Data channel opens
- **Who**: Host → Guest
- **What**: Initial game state + player colors
- **Reliability**: Guaranteed via `onDataChannelOpen` callback

#### 2. Every Move
- **When**: Game state changes
- **Who**: Current player → Peer
- **What**: Updated game state
- **Reliability**: Best-effort, recovered by sync requests

#### 3. After Reconnection
- **When**: Connection re-established AND `isReconnecting` becomes false
- **Who**: Guest → Host (request), Host → Guest (response)
- **What**: Current game state
- **Delay**: 1-second delay for connection stability

#### 4. After Connection Recovery
- **When**: ICE state recovers to `connected` without full reconnection
- **Who**: Guest → Host (request), Host → Guest (response)
- **What**: Current game state
- **Purpose**: Ensure boards in sync after temporary disruption

### Conflict Resolution

**Rule**: Host is authoritative source of truth

- Guest always requests from Host
- Host never requests from Guest
- Prevents sync loops
- Clear authority hierarchy

### Debouncing

**Location**: `App.jsx` - `lastSyncRequestTime` ref

- Max one sync request per 2 seconds
- Prevents rapid duplicate requests
- Reduces unnecessary network traffic

---

## Configuration & Tuning

### Reconnection Parameters

```javascript
maxReconnectAttempts: 3
reconnectDelay: 2000ms (base delay)
progressiveDelay: min(2000ms × attemptNumber, 10000ms)
reconnectionTimeout: 20000ms (20 seconds)
```

### Heartbeat Configuration

```javascript
heartbeatInterval: 30000ms (30 seconds)
heartbeatTimeoutCheck: 10000ms (10 seconds)
heartbeatTimeout: 90000ms (90 seconds)
```

### ICE Configuration

```javascript
iceServers: [
  // Google STUN servers
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  
  // Custom STUN server
  'stun:20.251.170.209:3478',
  
  // Custom TURN server (UDP + TCP)
  'turn:20.251.170.209:3478?transport=udp',
  'turn:20.251.170.209:3478?transport=tcp'
]

iceCandidatePoolSize: 10
```

### Timing Delays

```javascript
// ICE disconnection grace period
iceDisconnectGrace: 5000ms

// Connection loss debounce
connectionLossDebounce: 2000ms

// Data channel open to send initial state
dataChannelDelay: 0ms (callback-based)

// Post-reconnection sync request
postReconnectSyncDelay: 1000ms

// Post-recovery sync request
postRecoverySyncDelay: 1000ms

// Graceful disconnect reset
gracefulDisconnectReset: 3000ms

// Reconnection failed reset
reconnectionFailedReset: 5000ms
```

### Tuning Recommendations

#### For Poor Network Conditions
- Increase `heartbeatTimeout` to 120s
- Increase `maxReconnectAttempts` to 5
- Increase `reconnectionTimeout` to 30s

#### For Fast Networks
- Decrease `heartbeatInterval` to 20s
- Decrease `connectionLossDebounce` to 1s
- Decrease grace periods

#### For Mobile Networks
- Keep longer timeouts (current settings)
- Consider adding mobile-specific STUN/TURN servers
- Monitor battery usage (heartbeat frequency)

---

## Component Function Reference

### WebRTCSignalingService.js

| Function | Purpose |
|----------|---------|
| `initializePeerConnection()` | Creates RTCPeerConnection with ICE servers and event handlers |
| `setupDataChannelHandlers(channel)` | Attaches data channel event listeners |
| `createCall()` | Host creates Firestore signaling doc and offer |
| `joinCall(callId)` | Guest joins using call ID and creates answer |
| `scheduleConnectionLossHandler()` | Debounces connection loss detection |
| `handleConnectionLoss()` | Orchestrates reconnection attempts |
| `recreateCall()` | Host updates existing Firestore doc for reconnection |
| `rejoinCall(callId)` | Guest rejoins existing call |
| `cleanupConnectionForReconnect()` | Closes connections, preserves Firestore docs |
| `cleanupConnection()` | Full cleanup including Firestore |
| `startHeartbeat()` | Initiates heartbeat interval and timeout checker |
| `sendHeartbeatResponse()` | Responds to peer heartbeat |
| `stopHeartbeat()` | Clears heartbeat intervals |
| `notifyReconnectionFailed()` | Notifies hook of reconnection failure |
| `sendDisconnectNotification()` | Sends graceful disconnect with retries |
| `sendGameState(state)` | Sends game state via data channel |
| `requestGameStateSync()` | Requests current state from peer |
| `disconnect()` | Graceful disconnection with cleanup |

### useWebRTC.js

| Function | Purpose |
|----------|---------|
| `createCall()` | Wrapper to create host connection, sets game mode |
| `joinCall(callId)` | Wrapper to join as guest, sets game mode |
| `disconnect()` | Manual disconnection, resets to single player |
| `sendGameState(state)` | Sends game state if connected |
| `requestGameStateSync()` | Requests sync if connected |
| `setOnMessageReceived(callback)` | Sets message handler for data channel |
| `setOnDataChannelOpen(callback)` | Sets callback for data channel open event |
| `setGracefulDisconnectFlag(flag)` | Sets graceful disconnect flag |

### App.jsx

| Function | Purpose |
|----------|---------|
| `handleGameStateChange(newState)` | Processes local game state changes, sends to peer |
| `handleMessage(message)` | Routes incoming peer messages to appropriate handlers |

---

## Testing Scenarios

### Manual Test Cases

1. **Normal Connection**: Host creates, Guest joins → Verify game sync
2. **Graceful Disconnect**: One player disconnects → Other resets cleanly
3. **Network Failure**: Disable network mid-game → Re-enable → Verify reconnection
4. **Browser Background**: Background tab → Wait 2 minutes → Refocus → Verify recovery
5. **Rapid Disconnect/Reconnect**: Disconnect and reconnect quickly → Verify stability
6. **Simultaneous Disconnect**: Both players disconnect together → Verify clean reset
7. **State Desync**: Force desync → Verify sync request recovers
8. **Max Attempts**: Permanently disable network → Verify gives up after 3 attempts

---

## Conclusion

This WebRTC reconnection system provides enterprise-grade reliability for peer-to-peer chess gameplay through:

- **Multi-layered failure detection**: ICE monitoring, heartbeats, state changes
- **Intelligent reconnection**: Progressive delays, role preservation, state reuse
- **Comprehensive edge case handling**: Graceful disconnects, simultaneous failures, state desync
- **Robust state synchronization**: Authority model, debouncing, automatic recovery

The architecture balances reliability with performance, ensuring seamless gameplay across various network conditions and edge cases.
