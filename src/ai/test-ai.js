// AI Testing Suite
// Run this file to test the chess AI implementation

import { createInitialGameState } from '../utils/gameState.js';
import { evaluatePosition, evaluatePositionDetailed } from '../ai/evaluator.js';
import { findBestMove, countLegalMoves, moveToAlgebraic } from '../ai/alphaBeta.js';
import { AI_DIFFICULTY } from '../ai/constants.js';
import { isInCheck } from '../utils/moveCalculator.js';

console.log('='.repeat(60));
console.log('🧪 CHESS AI TEST SUITE - PHASE 1');
console.log('='.repeat(60));

// ============================================
// TEST 1: Initial Position Evaluation
// ============================================
console.log('\n📊 TEST 1: Initial Position Evaluation');
console.log('-'.repeat(60));

const gameState = createInitialGameState();
const legalMoves = countLegalMoves(
    gameState.board,
    gameState.currentTurn,
    gameState.castlingRights
);
const inCheck = isInCheck(gameState.board, gameState.currentTurn);

console.log(`Legal moves available: ${legalMoves}`);
console.log(`In check: ${inCheck}`);

const score = evaluatePosition(
    gameState.board,
    gameState.currentTurn,
    legalMoves,
    inCheck
);
console.log(`Position score: ${score} centipawns`);
console.log(`Expected: ~0 (equal material)`);

// Detailed breakdown
const detailed = evaluatePositionDetailed(
    gameState.board,
    gameState.currentTurn,
    legalMoves,
    inCheck
);
console.log('\nDetailed breakdown:');
console.log(`  White material: ${detailed.breakdown.material.white}`);
console.log(`  Black material: ${detailed.breakdown.material.black}`);
console.log(`  White position: ${detailed.breakdown.positional.white}`);
console.log(`  Black position: ${detailed.breakdown.positional.black}`);
console.log(`  Is endgame: ${detailed.breakdown.isEndgame}`);

// ============================================
// TEST 2: AI Opening Move (Easy)
// ============================================
console.log('\n\n🤖 TEST 2: AI Opening Move (Easy - Depth 2)');
console.log('-'.repeat(60));

console.log('Thinking...');
const startTime = Date.now();
const bestMove = findBestMove(gameState, AI_DIFFICULTY.EASY.depth);
const thinkTime = Date.now() - startTime;

if (bestMove) {
    console.log(`Best move: ${moveToAlgebraic(bestMove)}`);
    console.log(`Move type: ${bestMove.type}`);
    console.log(`From: (${bestMove.from.row}, ${bestMove.from.col})`);
    console.log(`To: (${bestMove.to.row}, ${bestMove.to.col})`);
    console.log(`Think time: ${thinkTime}ms`);
} else {
    console.log('❌ No legal moves found!');
}

// ============================================
// TEST 3: AI Opening Move (Medium)
// ============================================
console.log('\n\n🤖 TEST 3: AI Opening Move (Medium - Depth 4)');
console.log('-'.repeat(60));

console.log('Thinking...');
const startTime2 = Date.now();
const bestMove2 = findBestMove(gameState, AI_DIFFICULTY.MEDIUM.depth);
const thinkTime2 = Date.now() - startTime2;

if (bestMove2) {
    console.log(`Best move: ${moveToAlgebraic(bestMove2)}`);
    console.log(`Move type: ${bestMove2.type}`);
    console.log(`Think time: ${thinkTime2}ms`);
    console.log(`Expected: <5 seconds`);
} else {
    console.log('❌ No legal moves found!');
}

// ============================================
// TEST 4: Material Advantage Evaluation
// ============================================
console.log('\n\n📊 TEST 4: Material Advantage Test');
console.log('-'.repeat(60));

// Create position where white is up a queen
const advantageState = createInitialGameState();
advantageState.board[0][3] = ''; // Remove black queen

const advLegalMoves = countLegalMoves(
    advantageState.board,
    advantageState.currentTurn,
    advantageState.castlingRights
);

const advScore = evaluatePosition(
    advantageState.board,
    advantageState.currentTurn,
    advLegalMoves,
    false
);

console.log('Position: White removed black queen');
console.log(`Score: ${advScore} centipawns`);
console.log(`Expected: ~-900 (black is down a queen, score from white's perspective)`);

// ============================================
// TEST 5: Hybrid Piece Value Test
// ============================================
console.log('\n\n🔧 TEST 5: Hybrid Piece Evaluation');
console.log('-'.repeat(60));

// Create position with a Rook-Bishop hybrid
const hybridState = createInitialGameState();
hybridState.board[7][0] = 'RB'; // White Rook-Bishop hybrid
hybridState.board[0][0] = '';   // Remove black rook

const hybLegalMoves = countLegalMoves(
    hybridState.board,
    hybridState.currentTurn,
    hybridState.castlingRights
);

const hybScore = evaluatePosition(
    hybridState.board,
    hybridState.currentTurn,
    hybLegalMoves,
    false
);

const hybDetailed = evaluatePositionDetailed(
    hybridState.board,
    hybridState.currentTurn,
    hybLegalMoves,
    false
);

console.log('Position: White has RB hybrid (930), black missing rook (500)');
console.log(`Score: ${hybScore} centipawns`);
console.log(`White material: ${hybDetailed.breakdown.material.white}`);
console.log(`Black material: ${hybDetailed.breakdown.material.black}`);
console.log(`Expected: Positive (white has material advantage)`);

// ============================================
// SUMMARY
// ============================================
console.log('\n' + '='.repeat(60));
console.log('✅ TEST SUITE COMPLETE');
console.log('='.repeat(60));
console.log('\nNext steps:');
console.log('1. Verify all tests pass');
console.log('2. Test mate-in-2 positions');
console.log('3. Integrate with GUI');
console.log('4. Add web workers for Phase 2');
console.log('\n');
