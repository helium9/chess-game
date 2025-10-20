/**
 * Performance Diagnostics for Parallel vs Single-threaded Search
 * 
 * Use these functions to compare and diagnose parallel search performance
 */

import { findBestMove, findBestMoveParallel } from './alphaBeta.js';
import { AI_DIFFICULTY } from './constants.js';

/**
 * Compare single-threaded vs parallel search performance
 * @param {Array} board - Current board state
 * @param {string} currentTurn - Current turn (WHITE or BLACK)
 * @param {Object} castlingRights - Castling rights
 * @param {string} difficulty - AI difficulty level
 * @returns {Object} Comparison results
 */
export async function compareSearchMethods(board, currentTurn, castlingRights, difficulty = 'MEDIUM') {
    const depth = AI_DIFFICULTY[difficulty];

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔬 PERFORMANCE DIAGNOSTIC: Single vs Parallel Search');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Depth: ${depth}, Difficulty: ${difficulty}`);
    console.log('───────────────────────────────────────────────────────\n');

    // Run single-threaded search
    console.log('🔄 Running single-threaded search...');
    const singleStart = performance.now();
    const singleResult = await findBestMove(board, currentTurn, castlingRights, difficulty);
    const singleEnd = performance.now();
    const singleTime = singleEnd - singleStart;

    console.log(`✅ Single-threaded complete: ${singleTime.toFixed(2)}ms`);
    console.log(`   Nodes: ${singleResult.nodesSearched?.toLocaleString() || 'N/A'}`);
    console.log(`   Best move: ${JSON.stringify(singleResult.bestMove)}`);
    console.log(`   Score: ${singleResult.bestScore}\n`);

    // Run parallel search
    console.log('🔄 Running parallel search...');
    const parallelStart = performance.now();
    const parallelResult = await findBestMoveParallel(board, currentTurn, castlingRights, difficulty);
    const parallelEnd = performance.now();
    const parallelTime = parallelEnd - parallelStart;

    console.log(`✅ Parallel complete: ${parallelTime.toFixed(2)}ms`);

    // Calculate speedup
    const speedup = singleTime / parallelTime;
    const efficiency = (speedup / 4) * 100; // Assuming 4 workers

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 COMPARISON SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Single-threaded time:  ${singleTime.toFixed(2)}ms`);
    console.log(`Parallel time:         ${parallelTime.toFixed(2)}ms`);
    console.log(`───────────────────────────────────────────────────────`);
    console.log(`Speedup:              ${speedup.toFixed(2)}x`);
    console.log(`Efficiency:           ${efficiency.toFixed(1)}% (of ideal 4x)`);
    console.log(`Time saved:           ${(singleTime - parallelTime).toFixed(2)}ms`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Analysis
    if (speedup < 1.5) {
        console.log('⚠️  WARNING: Speedup is very low (<1.5x)');
        console.log('   Possible causes:');
        console.log('   - Depth too shallow (overhead > benefit)');
        console.log('   - Poor move distribution (some workers idle)');
        console.log('   - High communication overhead');
        console.log('   - TT contention between workers');
    } else if (speedup < 2.5) {
        console.log('⚠️  Speedup is below expected range (2.5-3.5x)');
        console.log('   Check per-worker breakdown for load imbalance');
    } else if (speedup >= 2.5 && speedup <= 3.5) {
        console.log('✅ Speedup is within expected range (2.5-3.5x)');
    } else {
        console.log('🎉 Excellent speedup! (>3.5x)');
    }

    return {
        single: {
            time: singleTime,
            nodes: singleResult.nodesSearched,
            move: singleResult.bestMove,
            score: singleResult.bestScore
        },
        parallel: {
            time: parallelTime,
            nodes: parallelResult.nodesSearched,
            move: parallelResult.bestMove,
            score: parallelResult.bestScore
        },
        speedup,
        efficiency
    };
}

/**
 * Test parallel search at different depths
 * @param {Array} board - Current board state
 * @param {string} currentTurn - Current turn
 * @param {Object} castlingRights - Castling rights
 */
export async function testDepthScaling(board, currentTurn, castlingRights) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📈 DEPTH SCALING TEST');
    console.log('═══════════════════════════════════════════════════════\n');

    const depths = ['EASY', 'MEDIUM', 'HARD']; // 3, 5, 6

    for (const difficulty of depths) {
        console.log(`\nTesting ${difficulty} (depth ${AI_DIFFICULTY[difficulty]})...`);
        await compareSearchMethods(board, currentTurn, castlingRights, difficulty);
        console.log('\n' + '─'.repeat(55) + '\n');
    }
}

/**
 * Run in browser console to compare performance
 * Usage: window.runPerformanceDiagnostic()
 */
export function setupGlobalDiagnostics() {
    if (typeof window !== 'undefined') {
        window.runPerformanceDiagnostic = async () => {
            console.log('⚠️  Please call this from your game with actual board state:');
            console.log('   await compareSearchMethods(board, currentTurn, castlingRights, "MEDIUM")');
        };
    }
}
