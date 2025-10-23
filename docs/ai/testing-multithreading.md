# How to Test Multi-Threading

## Quick Test (Browser Console)

Open your browser console (F12) and paste this code:

```javascript
// Quick test - paste this in browser console
(async () => {
    console.log('🔬 Testing Multi-Threading...\n');
    
    // 1. Check SharedArrayBuffer
    if (typeof SharedArrayBuffer === 'undefined') {
        console.log('❌ SharedArrayBuffer NOT available');
        console.log('   Check COOP/COEP headers in Network tab');
        return;
    }
    console.log('✅ SharedArrayBuffer available');
    
    // 2. Test buffer creation
    try {
        const testBuffer = new SharedArrayBuffer(1024 * 1024); // 1MB
        console.log(`✅ Created test SharedArrayBuffer: ${(testBuffer.byteLength / 1024).toFixed(0)}KB`);
    } catch (e) {
        console.log('❌ Cannot create SharedArrayBuffer:', e.message);
        return;
    }
    
    // 3. Import and test
    const { quickSpeedupTest } = await import('/src/ai/diagnostics.js');
    
    console.log('\n⏱️  Running speedup test (takes ~10 seconds)...\n');
    const speedup = await quickSpeedupTest();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (speedup > 2.5) {
        console.log('✅ MULTI-THREADING CONFIRMED!');
        console.log(`   ${speedup.toFixed(2)}x speedup detected`);
    } else if (speedup > 1.3) {
        console.log('⚠️  Partial multi-threading');
        console.log(`   ${speedup.toFixed(2)}x speedup (expected 2.5-3.5x)`);
    } else {
        console.log('❌ NO MULTI-THREADING');
        console.log('   Workers may be running sequentially');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
})();
```

## What to Look For

### ✅ Multi-threading is working if you see:
1. `SharedArrayBuffer available`
2. Worker initialization logs (4 workers)
3. Speedup of 2.5-3.5x
4. Multiple "Worker N: X nodes" lines with different node counts
5. Parallel search completes faster than single-threaded

### ❌ Multi-threading is NOT working if you see:
1. `SharedArrayBuffer NOT available` 
2. "Falling back to single-threaded search"
3. Speedup < 1.5x
4. Only one worker or no worker logs

### ⚠️ Common Issues:

**Issue 1: SharedArrayBuffer not available**
- Solution: Check Network tab → Response Headers should have:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- If missing: Restart Vite dev server

**Issue 2: Workers created but no speedup**
- Could be running on 2-core CPU (limited speedup)
- Could be thermal throttling
- Could be other browser tabs using CPU

**Issue 3: CORS errors in worker**
- Worker files must be served from same origin
- Check Vite is bundling worker correctly

## Visual Test (UI)

1. Start a game vs AI
2. Make a move
3. **Watch for these indicators:**
   - Console shows: `🔍 Starting Parallel Search (Phase 2B)`
   - Console shows: `⚙️  Workers: 4`
   - Console shows multiple `Worker 0: X nodes, Worker 1: Y nodes` lines
   - **Timer keeps running smoothly** (not frozen)
   - Search completes faster than before

## Benchmark Test

```javascript
// Compare old vs new performance
(async () => {
    const { findBestMove, findBestMoveParallel } = await import('/src/ai/alphaBeta.js');
    const { createInitialGameState } = await import('/src/utils/gameState.js');
    
    const gameState = createInitialGameState();
    const depth = 5;
    
    console.time('Single-threaded');
    await findBestMove(gameState, depth);
    console.timeEnd('Single-threaded');
    
    console.time('Multi-threaded');
    await findBestMoveParallel(gameState, depth);
    console.timeEnd('Multi-threaded');
})();
```

Expected output:
```
Single-threaded: 2500ms
Multi-threaded: 800ms
```

## Full Diagnostic Suite

Visit: `http://localhost:5173/test-multithreading.html`

Or run in console:
```javascript
const { runAllTests } = await import('/src/ai/diagnostics.js');
await runAllTests();
```

This runs:
1. Worker creation test
2. Shared memory test
3. Work distribution test
4. Parallel execution test

## CPU Usage Test (External)

**Linux/Mac:**
```bash
# In terminal, watch CPU usage while AI thinks
top -p $(pgrep -f chrome)
```

**Expected:**
- Single-threaded: ~100% CPU (1 core)
- Multi-threaded: ~300-400% CPU (3-4 cores)

**Windows:**
- Open Task Manager
- Performance tab → CPU
- Should see 4 cores spike during AI search

## Summary

The easiest way to verify:

1. **Open browser console**
2. **Paste the quick test code** (top of this file)
3. **Look for:** `✅ MULTI-THREADING CONFIRMED!` and `3.x speedup`

If you see that, workers are definitely running in parallel! 🎉
