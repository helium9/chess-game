// Transposition Table for Chess Engine
// Caches evaluated positions to avoid redundant search work

/**
 * TT Entry Flag Types (for alpha-beta bounds)
 */
export const FLAG_EXACT = 0;  // Exact score (PV node, all moves searched)
export const FLAG_LOWER = 1;  // Lower bound (fail-high, beta cutoff, score >= beta)
export const FLAG_UPPER = 2;  // Upper bound (fail-low, alpha cutoff, score <= alpha)

/**
 * TT Entry Structure (6 × 32-bit integers = 24 bytes per entry)
 * 
 * [0] hashLow32      - Lower 32 bits of position hash (verification)
 * [1] hashHigh32     - Upper 32 bits of position hash (verification)
 * [2] score          - Evaluation score in centipawns (signed int32)
 * [3] depth          - Search depth that produced this score
 * [4] flag           - Score type: EXACT | LOWER | UPPER
 * [5] bestMoveEncoded - Best move (16 bits: from=6bits, to=6bits, type=4bits)
 */
const ENTRY_SIZE = 6; // Number of Int32 elements per entry

/**
 * Transposition Table with Atomic Operations
 * 
 * Features:
 * - Thread-safe using Atomics (for future web worker support)
 * - Lock-free design (accepts occasional lost writes for performance)
 * - Depth-preferred replacement strategy
 * - Hash verification to detect collisions
 */
class TranspositionTable {
    /**
     * Create a transposition table
     * 
     * @param {number} sizeInMB - Size of table in megabytes (default 128 MB)
     * @param {SharedArrayBuffer|null} sharedBuffer - Optional shared buffer for multi-threading
     */
    constructor(sizeInMB = 128, sharedBuffer = null) {
        const bytesPerEntry = ENTRY_SIZE * 4; // 4 bytes per Int32
        const numEntries = Math.floor((sizeInMB * 1024 * 1024) / bytesPerEntry);

        // Use shared buffer if provided, otherwise create new one
        if (sharedBuffer) {
            this.buffer = sharedBuffer;
            this.isShared = true;
        } else {
            // Try to create SharedArrayBuffer (for future web workers)
            // Fall back to regular ArrayBuffer if SharedArrayBuffer is unavailable
            try {
                if (typeof SharedArrayBuffer !== 'undefined') {
                    this.buffer = new SharedArrayBuffer(numEntries * bytesPerEntry);
                    this.isShared = true;
                } else {
                    throw new Error('SharedArrayBuffer not available');
                }
            } catch (e) {
                // Fallback to regular ArrayBuffer (single-threaded)
                this.buffer = new ArrayBuffer(numEntries * bytesPerEntry);
                this.isShared = false;
                console.warn('SharedArrayBuffer not available, using ArrayBuffer (single-threaded mode)');
            }
        }

        this.table = new Int32Array(this.buffer);
        this.numEntries = numEntries;

        // For non-power-of-2 sizes, we must use modulo instead of bitwise mask
        // Mask only works for powers of 2 (e.g., 2^20 = 1,048,576)
        this.useMask = this.isPowerOf2(numEntries);
        this.mask = numEntries - 1;  // Only valid if numEntries is power of 2

        // Statistics (optional, for debugging)
        this.stats = {
            hits: 0,
            misses: 0,
            collisions: 0,
            stores: 0
        };

        console.log(`TranspositionTable initialized: ${sizeInMB}MB, ${numEntries} entries (${this.isShared ? 'shared' : 'single-threaded'})`);
    }

    /**
     * Check if a number is a power of 2
     * @param {number} n - Number to check
     * @returns {boolean} True if power of 2
     */
    isPowerOf2(n) {
        return n > 0 && (n & (n - 1)) === 0;
    }

    /**
     * Get index for a hash (handles both power-of-2 and arbitrary sizes)
     * @param {BigInt} hash - Position hash
     * @returns {number} Index in table
     */
    getIndex(hash) {
        if (this.useMask) {
            // Fast path: bitwise AND for power-of-2 sizes
            return Number(hash & BigInt(this.mask)) * ENTRY_SIZE;
        } else {
            // Slow path: modulo for arbitrary sizes
            return Number(hash % BigInt(this.numEntries)) * ENTRY_SIZE;
        }
    }

    /**
     * Get buffer size in bytes
     * @returns {number} Buffer size
     */
    getBufferSize() {
        return this.buffer.byteLength;
    }

    /**
     * Get the underlying SharedArrayBuffer (for passing to workers)
     * @returns {SharedArrayBuffer} The shared buffer
     */
    getBuffer() {
        return this.buffer;
    }

    /**
     * Clear all entries in the table
     * Useful when starting a new game or new search
     */
    clear() {
        this.table.fill(0);
        this.stats = { hits: 0, misses: 0, collisions: 0, stores: 0 };
    }

    /**
     * Store a position evaluation in the TT
     * Uses atomic operations for thread safety (when available)
     * 
     * Replacement strategy: Depth-preferred
     * - Always replace if slot is empty
     * - Always replace if same position (hash match)
     * - Replace if our search is deeper
     * 
     * @param {BigInt} hash - 64-bit Zobrist hash
     * @param {number} score - Evaluation score (centipawns)
     * @param {number} depth - Search depth for this score
     * @param {number} flag - FLAG_EXACT | FLAG_LOWER | FLAG_UPPER
     * @param {Object|null} bestMove - Best move object { from: {row, col}, to: {row, col}, type: '...' }
     */
    store(hash, score, depth, flag, bestMove = null) {
        const index = this.getIndex(hash);

        // Split 64-bit hash into two 32-bit parts and convert to signed 32-bit
        // Int32Array stores SIGNED 32-bit integers, so we must match that representation
        // Values with high bit set (>= 2^31) will become negative - this is EXPECTED and correct!
        // Example: 0x80000000 (unsigned) = -2147483648 (signed) in Int32Array
        const hashLowRaw = Number(hash & 0xFFFFFFFFn);
        const hashHighRaw = Number((hash >> 32n) & 0xFFFFFFFFn);
        const hashLow = hashLowRaw | 0;   // force to signed 32-bit (-2^31 to 2^31-1)
        const hashHigh = hashHighRaw | 0; // force to signed 32-bit (-2^31 to 2^31-1)

        // Encode best move (0 if null)
        const moveEncoded = this.encodeMove(bestMove);

        // Read current entry to check replacement strategy
        const storedHashHigh = this.isShared
            ? Atomics.load(this.table, index + 1)
            : this.table[index + 1];
        const storedHashLow = this.isShared
            ? Atomics.load(this.table, index + 0)
            : this.table[index + 0];
        const storedDepth = this.isShared
            ? Atomics.load(this.table, index + 3)
            : this.table[index + 3];

        // Check if slot is empty: both hash parts are 0 (probability 1 in 2^64 for real position)
        const isEmpty = (storedHashHigh === 0 && storedHashLow === 0);

        // Check if same position: both hash parts match
        const isSamePosition = (storedHashHigh === hashHigh && storedHashLow === hashLow);

        // Replacement strategy: replace if...
        // 1. Slot is empty (both hash parts are 0)
        // 2. Same position (both hash parts match - always update)
        // 3. Our search is STRICTLY deeper (depth > storedDepth)
        //    IMPORTANT: Use > not >=, otherwise shallow searches evict deep ones!
        const shouldReplace =
            isEmpty ||
            isSamePosition ||
            depth > storedDepth;

        if (shouldReplace) {
            // Write all fields (use Atomics if shared, otherwise direct access)
            if (this.isShared) {
                Atomics.store(this.table, index + 0, hashLow);
                Atomics.store(this.table, index + 1, hashHigh);
                Atomics.store(this.table, index + 2, score);
                Atomics.store(this.table, index + 3, depth);
                Atomics.store(this.table, index + 4, flag);
                Atomics.store(this.table, index + 5, moveEncoded);
            } else {
                this.table[index + 0] = hashLow;
                this.table[index + 1] = hashHigh;
                this.table[index + 2] = score;
                this.table[index + 3] = depth;
                this.table[index + 4] = flag;
                this.table[index + 5] = moveEncoded;
            }

            this.stats.stores++;
        }
    }

    /**
     * Probe the TT for a cached evaluation
     * 
     * Returns:
     * - null if position not found (miss)
     * - { score, move } if exact score can be used
     * - { move } if only move hint available (depth too shallow or wrong bound type)
     * 
     * @param {BigInt} hash - 64-bit Zobrist hash
     * @param {number} depth - Current search depth
     * @param {number} alpha - Current alpha value
     * @param {number} beta - Current beta value
     * @returns {Object|null} TT probe result
     */
    probe(hash, depth, alpha, beta) {
        const index = this.getIndex(hash);

        // Expected hash parts (signed 32-bit to match Int32Array storage)
        // Negative values are EXPECTED when high bit is set - this is correct!
        const hashLowRaw = Number(hash & 0xFFFFFFFFn);
        const hashHighRaw = Number((hash >> 32n) & 0xFFFFFFFFn);
        const hashLow = hashLowRaw | 0;
        const hashHigh = hashHighRaw | 0;

        // Read stored hash parts (use Atomics if shared, otherwise direct access)
        const storedHashHigh = this.isShared
            ? Atomics.load(this.table, index + 1)
            : this.table[index + 1];
        const storedHashLow = this.isShared
            ? Atomics.load(this.table, index + 0)
            : this.table[index + 0];

        // DEBUG: Sample 1 in 1000 misses to understand collision patterns
        // const shouldLog = Math.random() < 0.001 && storedHashHigh !== 0 && storedHashHigh !== hashHigh;
        // if (shouldLog) {
        //     // Convert signed 32-bit back to unsigned for cleaner display
        //     const expectedUnsigned = (hashHigh >>> 0).toString(16).padStart(8, '0');
        //     const storedUnsigned = (storedHashHigh >>> 0).toString(16).padStart(8, '0');

        //     console.log(`🔍 TT Index Collision (different positions, same index):`);
        //     console.log(`  Index: ${index / ENTRY_SIZE}`);
        //     console.log(`  Expected hashHigh: ${hashHigh} (0x${expectedUnsigned})`);
        //     console.log(`  Stored hashHigh: ${storedHashHigh} (0x${storedUnsigned})`);
        //     console.log(`  → This is NORMAL - different positions can map to same index`);
        // }

        // Hash verification: Check both parts for complete validation
        // Empty slot: both parts are 0
        // Match: both parts match
        const isEmpty = (storedHashHigh === 0 && storedHashLow === 0);
        const isMatch = (storedHashHigh === hashHigh && storedHashLow === hashLow);

        if (isEmpty || !isMatch) {
            this.stats.misses++;
            if (!isEmpty && !isMatch && storedHashHigh !== 0) {
                this.stats.collisions++;
            }
            return null; // Empty slot or different position
        }

        // Read remaining fields (use Atomics if shared, otherwise direct access)
        const storedDepth = this.isShared
            ? Atomics.load(this.table, index + 3)
            : this.table[index + 3];
        const storedScore = this.isShared
            ? Atomics.load(this.table, index + 2)
            : this.table[index + 2];
        const storedFlag = this.isShared
            ? Atomics.load(this.table, index + 4)
            : this.table[index + 4];
        const moveEncoded = this.isShared
            ? Atomics.load(this.table, index + 5)
            : this.table[index + 5];
        const move = this.decodeMove(moveEncoded);

        // Track depth-related statistics
        if (storedDepth < depth) {
            this.stats.depthTooShallow = (this.stats.depthTooShallow || 0) + 1;
        }

        // Check if we can use the stored score
        if (storedDepth >= depth) {
            // Stored search was deep enough

            // Check flag type and bounds
            if (storedFlag === FLAG_EXACT) {
                // Exact score - always usable
                this.stats.hits++;
                this.stats.exactHits = (this.stats.exactHits || 0) + 1;
                return { score: storedScore, move };
            } else if (storedFlag === FLAG_LOWER && storedScore >= beta) {
                // Lower bound (fail-high): score >= beta, can cause beta cutoff
                this.stats.hits++;
                this.stats.lowerHits = (this.stats.lowerHits || 0) + 1;
                return { score: storedScore, move };
            } else if (storedFlag === FLAG_UPPER && storedScore <= alpha) {
                // Upper bound (fail-low): score <= alpha, can cause alpha cutoff
                this.stats.hits++;
                this.stats.upperHits = (this.stats.upperHits || 0) + 1;
                return { score: storedScore, move };
            } else {
                // Depth is OK but bounds don't allow use
                this.stats.wrongBounds = (this.stats.wrongBounds || 0) + 1;

                // Track WHY bounds failed (for debugging)
                if (storedFlag === FLAG_LOWER && storedScore < beta) {
                    this.stats.lowerFailedBeta = (this.stats.lowerFailedBeta || 0) + 1;
                } else if (storedFlag === FLAG_UPPER && storedScore > alpha) {
                    this.stats.upperFailedAlpha = (this.stats.upperFailedAlpha || 0) + 1;
                }
            }
        }

        // Can't use score, but can use move for move ordering
        this.stats.moveHints = (this.stats.moveHints || 0) + 1;
        return { move };
    }

    /**
     * Encode a move object into a 16-bit integer
     * 
     * Encoding: [from:6bits][to:6bits][type:4bits]
     * - from: 0-63 (6 bits for square)
     * - to: 0-63 (6 bits for square)
     * - type: 0-15 (4 bits for move type)
     * 
     * @param {Object|null} move - Move object or null
     * @returns {number} Encoded move (0 if null)
     */
    encodeMove(move) {
        if (!move) return 0;

        const fromSquare = move.from.row * 8 + move.from.col; // 0-63
        const toSquare = move.to.row * 8 + move.to.col;       // 0-63
        const typeCode = this.getMoveTypeCode(move.type);     // 0-15

        // Pack into 16 bits: [from:6][to:6][type:4]
        return (fromSquare << 10) | (toSquare << 4) | typeCode;
    }

    /**
     * Decode a 16-bit integer back into a move object
     * 
     * @param {number} encoded - Encoded move
     * @returns {Object|null} Move object or null
     */
    decodeMove(encoded) {
        if (encoded === 0) return null;

        const fromSquare = (encoded >> 10) & 0x3F;  // Extract bits 10-15 (6 bits)
        const toSquare = (encoded >> 4) & 0x3F;     // Extract bits 4-9 (6 bits)
        const typeCode = encoded & 0x0F;            // Extract bits 0-3 (4 bits)

        return {
            from: {
                row: Math.floor(fromSquare / 8),
                col: fromSquare % 8
            },
            to: {
                row: Math.floor(toSquare / 8),
                col: toSquare % 8
            },
            type: this.getMoveTypeFromCode(typeCode)
        };
    }

    /**
     * Convert move type string to 4-bit code
     * @param {string} type - Move type
     * @returns {number} Type code (0-4)
     */
    getMoveTypeCode(type) {
        const types = {
            'normal': 0,
            'castling': 1,
            'promotion': 2,
            'combine': 3,
            'decombine': 4
        };
        return types[type] || 0;
    }

    /**
     * Convert 4-bit code back to move type string
     * @param {number} code - Type code
     * @returns {string} Move type
     */
    getMoveTypeFromCode(code) {
        const types = ['normal', 'castling', 'promotion', 'combine', 'decombine'];
        return types[code] || 'normal';
    }

    /**
     * Get TT statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const totalProbes = this.stats.hits + this.stats.misses;
        const hitRate = totalProbes > 0 ? (this.stats.hits / totalProbes * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            totalProbes,
            hitRate: `${hitRate}%`,
            entries: this.numEntries,
            sizeBytes: this.buffer.byteLength
        };
    }

    /**
     * Reset statistics counters
     */
    resetStats() {
        this.stats = { hits: 0, misses: 0, collisions: 0, stores: 0 };
    }

    /**
     * Get the underlying SharedArrayBuffer
     * Used by WorkerManager to pass shared buffer to workers
     * @returns {SharedArrayBuffer|ArrayBuffer} The buffer
     */
    getBuffer() {
        return this.buffer;
    }

    /**
     * Check if this TT uses a shared buffer
     * @returns {boolean} True if using SharedArrayBuffer
     */
    isSharedBuffer() {
        return this.isShared;
    }
}

export default TranspositionTable;
