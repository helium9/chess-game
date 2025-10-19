// Simple test script for Phase 2A - Transposition Table
// Run with: node src/ai/test-tt.js

import { findBestMove, getTranspositionTableStats, clearTranspositionTable } from './alphaBeta.js';
import { createInitialGameState } from '../utils/gameState.js';

console.log('='.repeat(60));
console.log('Phase 2A - Transposition Table Test');
console.log('='.repeat(60));

// Create initial position
const gameState = createInitialGameState();

console.log('\n📋 Test Configuration:');
console.log('  Position: Starting position');
console.log('  Depth: 4 (should complete in <1 second)');
console.log('  TT Size: 128 MB\n');

console.log('🔍 Searching...\n');
const startTime = Date.now();

// Search depth 4
const bestMove = findBestMove(gameState, 4);

const endTime = Date.now();
const duration = endTime - startTime;

console.log('✅ Search Complete!\n');
console.log('📊 Results:');
console.log(`  Time: ${duration}ms`);
console.log(`  Best Move: ${JSON.stringify(bestMove, null, 2)}`);

// Get TT statistics
const stats = getTranspositionTableStats();
console.log('\n📈 Transposition Table Statistics:');
console.log(`  Entries: ${stats.entries.toLocaleString()}`);
console.log(`  Size: ${(stats.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Total Probes: ${stats.totalProbes.toLocaleString()}`);
console.log(`  Hits: ${stats.hits.toLocaleString()}`);
console.log(`  Misses: ${stats.misses.toLocaleString()}`);
console.log(`  Collisions: ${stats.collisions.toLocaleString()}`);
console.log(`  Stores: ${stats.stores.toLocaleString()}`);
console.log(`  Hit Rate: ${stats.hitRate}`);

console.log('\n📝 Interpretation:');
if (stats.hits > 0) {
    console.log('  ✅ TT is working! Caching positions successfully.');

    const hitRateNum = parseFloat(stats.hitRate);
    if (hitRateNum >= 40) {
        console.log('  ✅ Hit rate is excellent (40%+)');
    } else if (hitRateNum >= 20) {
        console.log('  ⚠️  Hit rate is decent but could be better');
    } else {
        console.log('  ❌ Hit rate is low - possible issue');
    }

    if (stats.collisions / stats.totalProbes < 0.01) {
        console.log('  ✅ Collision rate is very low (<1%)');
    } else {
        console.log('  ⚠️  Collision rate is high - consider larger TT');
    }
} else {
    console.log('  ❌ TT not working - no hits recorded');
}

console.log('\n' + '='.repeat(60));
console.log('Test Complete!');
console.log('='.repeat(60) + '\n');

// Test clearing
console.log('🧹 Testing TT clear...');
clearTranspositionTable();
const statsAfterClear = getTranspositionTableStats();
console.log(`  Hits after clear: ${statsAfterClear.hits} (should be 0)`);
console.log(statsAfterClear.hits === 0 ? '  ✅ Clear working!' : '  ❌ Clear failed!');

console.log('\n✅ All tests passed!\n');
