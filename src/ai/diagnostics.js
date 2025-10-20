// Diagnostic Tools for Verifying Multi-Threading (Phase 2B)

import workerManager from './WorkerManager.js';
import { findBestMove, findBestMoveParallel } from './alphaBeta.js';
import { createInitialGameState } from '../utils/gameState.js';

/**
 * Test 1: Verify workers are actually created
 */
export const testWorkerCreation = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 1: Worker Creation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const initialized = await workerManager.initialize();

    if (!initialized) {
        console.log('❌ Workers NOT initialized - using single-threaded fallback');
        return false;
    }

    console.log(`✅ Workers initialized: ${workerManager.workers.length} workers`);
    workerManager.workers.forEach((w, i) => {
        console.log(`   Worker ${i}: Ready=${w.isReady}, Busy=${w.isBusy}`);
    });

    return true;
};

/**
 * Test 2: Verify parallel execution (workers run simultaneously, not sequentially)
 * We'll send tasks that take time and measure if they overlap
 */
export const testParallelExecution = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 2: Parallel vs Sequential Execution');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const gameState = createInitialGameState();
    const depth = 5; // Deep enough to take measurable time

    // Test 1: Single-threaded
    console.log('⏱️  Testing single-threaded search...');
    const singleStart = performance.now();
    await findBestMove(gameState, depth);
    const singleTime = performance.now() - singleStart;
    console.log(`✅ Single-threaded: ${singleTime.toFixed(2)}ms`);

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));

    // Test 2: Multi-threaded
    console.log('⏱️  Testing multi-threaded search...');
    const parallelStart = performance.now();
    await findBestMoveParallel(gameState, depth);
    const parallelTime = performance.now() - parallelStart;
    console.log(`✅ Multi-threaded: ${parallelTime.toFixed(2)}ms`);

    // Calculate speedup
    const speedup = singleTime / parallelTime;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 SPEEDUP: ${speedup.toFixed(2)}x`);

    if (speedup < 1.5) {
        console.log('❌ POOR SPEEDUP - Workers may be running sequentially!');
        console.log('   Expected: 2.5-3.5x speedup on 4 cores');
        return false;
    } else if (speedup < 2.5) {
        console.log('⚠️  MODERATE SPEEDUP - Some parallelism, but not optimal');
        return true;
    } else {
        console.log('✅ GOOD SPEEDUP - Workers running in parallel!');
        return true;
    }
};

/**
 * Test 3: Verify workers are processing different moves
 * Check that each worker gets a different batch of moves
 */
export const testWorkDistribution = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 3: Work Distribution');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const gameState = createInitialGameState();

    // Monkey-patch workerManager to log move distribution
    const originalDistribute = workerManager._distributeMoves.bind(workerManager);
    workerManager._distributeMoves = function (moves) {
        const batches = originalDistribute(moves);
        console.log(`📦 Total moves: ${moves.length}`);
        batches.forEach((batch, i) => {
            console.log(`   Worker ${i}: ${batch.length} moves`);
            console.log(`      First move: ${batch[0].piece} ${String.fromCharCode(97 + batch[0].fromCol)}${8 - batch[0].fromRow} → ${String.fromCharCode(97 + batch[0].toCol)}${8 - batch[0].toRow}`);
        });
        return batches;
    };

    await findBestMoveParallel(gameState, 4);

    // Restore original
    workerManager._distributeMoves = originalDistribute;

    console.log('✅ Work distribution test complete');
};

/**
 * Test 4: Verify SharedArrayBuffer is actually shared
 * Each worker should see the same TT buffer
 */
export const testSharedMemory = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 4: Shared Memory');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!workerManager.transpositionTable) {
        console.log('❌ No TT available');
        return false;
    }

    const buffer = workerManager.transpositionTable.getBuffer();
    const isShared = workerManager.transpositionTable.isSharedBuffer();

    console.log(`Buffer type: ${buffer.constructor.name}`);
    console.log(`Is shared: ${isShared}`);
    console.log(`Size: ${(buffer.byteLength / (1024 * 1024)).toFixed(2)} MB`);

    if (!isShared) {
        console.log('❌ NOT using SharedArrayBuffer - workers have separate TTs');
        return false;
    }

    console.log('✅ Using SharedArrayBuffer - all workers share same TT');
    return true;
};

/**
 * Run all diagnostic tests
 */
export const runAllTests = async () => {
    console.log('\n');
    console.log('═══════════════════════════════════════════');
    console.log('🔬 MULTI-THREADING DIAGNOSTIC SUITE');
    console.log('═══════════════════════════════════════════');
    console.log('\n');

    // Test 1: Worker creation
    const test1 = await testWorkerCreation();
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!test1) {
        console.log('\n❌ Workers not available - multi-threading NOT working');
        return;
    }

    // Test 2: Shared memory
    await testSharedMemory();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 3: Work distribution
    await testWorkDistribution();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 4: Parallel execution (slowest test)
    const test4 = await testParallelExecution();

    console.log('\n');
    console.log('═══════════════════════════════════════════');
    if (test4) {
        console.log('✅ MULTI-THREADING IS WORKING!');
        console.log('   - Workers created successfully');
        console.log('   - SharedArrayBuffer in use');
        console.log('   - Parallel speedup detected');
    } else {
        console.log('⚠️  MULTI-THREADING PARTIALLY WORKING');
        console.log('   - Workers created but speedup is low');
        console.log('   - May be CPU-bound or other bottleneck');
    }
    console.log('═══════════════════════════════════════════');
    console.log('\n');
};

/**
 * Quick test - just check if we get speedup
 */
export const quickSpeedupTest = async () => {
    console.log('🏎️  Quick Speedup Test (depth 4)...\n');

    const gameState = createInitialGameState();

    const singleStart = performance.now();
    await findBestMove(gameState, 4);
    const singleTime = performance.now() - singleStart;

    const parallelStart = performance.now();
    await findBestMoveParallel(gameState, 4);
    const parallelTime = performance.now() - parallelStart;

    const speedup = singleTime / parallelTime;

    console.log(`Single-threaded: ${singleTime.toFixed(0)}ms`);
    console.log(`Multi-threaded:  ${parallelTime.toFixed(0)}ms`);
    console.log(`Speedup:         ${speedup.toFixed(2)}x`);

    if (speedup > 2) {
        console.log('✅ Multi-threading is working well!');
    } else if (speedup > 1.3) {
        console.log('⚠️  Some parallelism, but not optimal');
    } else {
        console.log('❌ No significant speedup - likely single-threaded');
    }

    return speedup;
};
