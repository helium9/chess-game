# WebRTC Disconnection Debugging Guide

## Recent Fixes Applied

### Fix 1: Heartbeat Timestamp Update Bug
**Issue**: `lastHeartbeatReceived` was only updated for heartbeat messages, not for regular game messages.

**Fix Applied**: Update timestamp for ANY incoming/outgoing message, not just heartbeats.

**Files Modified**: `WebRTCSignalingService.js`

### Fix 2: Data Channel Reference Bug
**Issue**: Remote data channel reference wasn't being stored, potentially causing messages to be sent to wrong/closed channel.

**Fix Applied**: Store reference to remote data channel when received.

### Fix 3: Data Channel Reliability
**Issue**: No retry mechanism for failed messages.

**Fix Applied**: Added `maxRetransmits: 3` to data channel configuration.

---

## Debugging Steps

### Step 1: Check Browser Console Logs

Open DevTools (F12) and look for these patterns:

#### Normal Connection Pattern (Good):
```
Connection state: connecting
ICE connection state: checking
Data channel opened
Connection state: connected
ICE connection state: connected
Heartbeat sent (every 30s)
Heartbeat received, sending response
```

#### Disconnection Pattern (Bad):
```
ICE connection state: disconnected
ICE connection disconnected - will check if this persists
(5 seconds later)
ICE connection still disconnected - scheduling reconnection
Connection loss scheduled
Attempting reconnection (attempt X/3)
```

#### False Positive Pattern (Bug):
```
Heartbeat timeout detected - no response for 90000+ ms
(But you see game messages being sent/received)
```

### Step 2: Check Network Conditions

Run these commands in your terminal to check network quality:

```bash
# Check ping to Google's STUN server
ping -c 10 stun1.l.google.com

# Check if TURN server is reachable
nc -zv 20.251.170.209 3478

# Check if UDP is being blocked (common in some networks)
nc -u -zv 20.251.170.209 3478
```

**Good Results:**
- Ping: < 100ms, 0% packet loss
- TURN server: Connection successful
- UDP: Connection successful

**Bad Results (Network Issue):**
- Ping: > 200ms, > 5% packet loss
- TURN server: Connection failed/timeout
- UDP: Blocked (use TCP fallback)

### Step 3: Check WebRTC Statistics

Add this code temporarily to see connection quality:

```javascript
// In browser console while connected:
const stats = await webRTC.localConnection.getStats();
stats.forEach(report => {
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        console.log('Connection Type:', report.networkType);
        console.log('Local Candidate Type:', report.localCandidateType);
        console.log('Remote Candidate Type:', report.remoteCandidateType);
        console.log('Bytes Sent:', report.bytesSent);
        console.log('Bytes Received:', report.bytesReceived);
        console.log('Round Trip Time:', report.currentRoundTripTime);
    }
});
```

**Indicators:**
- `currentRoundTripTime > 0.5`: Network latency issues
- `localCandidateType: 'relay'`: Using TURN (slower but more reliable)
- `localCandidateType: 'host'`: Direct connection (faster)

### Step 4: Monitor Disconnection Timing

Record when disconnections happen:

1. **Consistent 30s intervals**: Likely heartbeat bug (should be fixed now)
2. **Consistent 90s intervals**: Heartbeat timeout (indicates real connection issue)
3. **Random intervals**: Network instability
4. **When tab is backgrounded**: Browser throttling (known issue)
5. **During high activity**: Data channel overload (unlikely with chess)

### Step 5: Test Different Network Scenarios

#### Test A: Same Network
Both players on same WiFi → If disconnects, likely code issue

#### Test B: Different Networks
Players on different networks → If disconnects, likely network/NAT/firewall issue

#### Test C: Mobile Data
One player on cellular → If disconnects, likely NAT traversal issue

#### Test D: VPN
One player on VPN → If disconnects, likely VPN interference

---

## Common Network Issues

### Issue 1: Symmetric NAT
**Symptom**: Connection works initially but drops after 30-60s

**Cause**: NAT mapping expires, TURN server required but not working

**Solution**: Verify TURN server credentials and accessibility

**Test**: 
```bash
# Test TURN server manually
turnutils_uclient -v -u turnserver -w Turnserver@123456 20.251.170.209
```

### Issue 2: Firewall Blocking UDP
**Symptom**: Connection only works on local network

**Cause**: Corporate/university firewalls block UDP

**Solution**: Ensure TCP fallback for TURN is working

**Code Check**: Verify this is present in `WebRTCSignalingService.js`:
```javascript
urls: [
    `turn:${SERVER}?transport=udp`,
    `turn:${SERVER}?transport=tcp`  // ← TCP fallback
]
```

### Issue 3: Browser Throttling
**Symptom**: Disconnects when tab is not focused

**Cause**: Browser reduces setInterval frequency in background tabs

**Solution**: This is a known browser limitation. Options:
1. Use Web Workers for heartbeat
2. Increase heartbeat timeout to 120s+
3. Use visible tab indicators

### Issue 4: ICE Candidate Gathering Failure
**Symptom**: Connection never establishes or establishes then immediately drops

**Cause**: STUN/TURN servers not responding

**Solution**: Add more STUN servers as fallback

**Code Fix**: Already includes multiple STUN servers ✓

---

## Diagnostic Logging

### Enable Verbose Logging

Add this to the top of `WebRTCSignalingService.js`:

```javascript
const DEBUG = true;

function debugLog(category, message, data = null) {
    if (DEBUG) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${category}]`, message, data || '');
    }
}
```

Then replace console.log calls with `debugLog('HEARTBEAT', 'message', data)`

### Log Connection Quality

Add this periodic check:

```javascript
// In startHeartbeat():
setInterval(async () => {
    if (this.localConnection) {
        const stats = await this.localConnection.getStats();
        let rtt = 0;
        stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                rtt = report.currentRoundTripTime * 1000; // Convert to ms
            }
        });
        debugLog('CONNECTION_QUALITY', 'RTT:', rtt + 'ms');
    }
}, 10000); // Every 10 seconds
```

---

## Is It a Network Issue or Code Issue?

### Indicators of CODE Issue:
- ✅ Works on same network, fails on different networks (NAT/TURN config)
- ✅ Disconnects at exact intervals (30s, 60s, 90s) - timing-based bug
- ✅ Console shows errors/warnings before disconnect
- ✅ Happens even with excellent network (low ping, no packet loss)
- ✅ Reconnection immediately succeeds then fails again

### Indicators of NETWORK Issue:
- ✅ Works fine for X minutes, then random disconnect
- ✅ Worse on mobile/cellular data
- ✅ Worse during peak hours
- ✅ High ping/packet loss in network tests
- ✅ TURN server unreachable/slow
- ✅ Works fine on LAN, fails on WAN
- ✅ Reconnection takes long time or fails

---

## Recommended Network Configuration

For production deployment, consider:

1. **Multiple STUN/TURN Servers**: Have fallbacks
2. **TURN Server Monitoring**: Ensure it's always up
3. **Adaptive Heartbeat**: Increase interval if RTT is high
4. **Quality of Service**: Prioritize WebRTC traffic on your network
5. **CDN/Edge Deployment**: Deploy TURN servers closer to users

---

## Testing Checklist

- [ ] Console shows "Data channel opened" for both players
- [ ] Heartbeats sent every 30s without triggering timeout
- [ ] Game state messages flow in both directions
- [ ] Ping to STUN server < 100ms
- [ ] TURN server accessible on both UDP and TCP
- [ ] No firewall rules blocking ports 3478, 19302
- [ ] Works on same network (LAN)
- [ ] Works on different networks (WAN)
- [ ] Works when one player on mobile data
- [ ] Survives tab being backgrounded for 30s
- [ ] Survives 5+ minutes of gameplay
- [ ] Reconnection works within 10s after disconnect

---

## Next Steps

1. **Run network tests** (ping, nc commands above)
2. **Monitor console logs** for 5 minutes during gameplay
3. **Check disconnection timing** (when exactly does it happen?)
4. **Test different networks** (same WiFi vs different locations)
5. **Report findings**:
   - Network test results
   - Console log patterns
   - Timing of disconnections
   - Environmental factors (VPN, mobile, etc.)

Based on your findings, we can:
- **If code issue**: Apply additional fixes
- **If network issue**: Improve TURN configuration or add redundancy
- **If browser issue**: Implement workarounds for throttling
