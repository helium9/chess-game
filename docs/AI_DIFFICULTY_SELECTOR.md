# AI Difficulty Selector - Implementation Summary

## Overview
Added a UI control for selecting AI difficulty level (Easy/Medium/Hard) with visual feedback and proper state management.

## Changes Made

### 1. App.jsx - State Management

**Changed from `useRef` to `useState`:**
```javascript
// Before:
const aiDifficulty = useRef(AI_DIFFICULTY.MEDIUM); // Hardcoded

// After:
const [aiDifficulty, setAiDifficulty] = useState('MEDIUM'); // 'EASY', 'MEDIUM', or 'HARD'
```

**Why:** 
- `useRef` doesn't trigger re-renders when changed
- UI selector needs to display current value
- Need React state to sync UI with game logic

**Updated AI move calculation:**
```javascript
const bestMove = await findBestMoveParallel(
    currentGameState,
    AI_DIFFICULTY[aiDifficulty].depth  // ← Access via string key
);
```

**Passed to Navbar:**
```jsx
<Navbar
    webRTC={webRTC}
    gameState={gameState}
    onStartEngineGame={startEngineGame}
    aiDifficulty={aiDifficulty}           // ← Current difficulty (string)
    onDifficultyChange={setAiDifficulty}  // ← Setter function
/>
```

### 2. Navbar.jsx - UI Component

**Added difficulty selector dropdown:**

```jsx
<div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5 w-full sm:w-auto">
    <span className="text-xs font-medium text-gray-300 whitespace-nowrap">AI Level:</span>
    <select
        value={aiDifficulty}
        onChange={(e) => onDifficultyChange(e.target.value)}
        className="bg-slate-600 text-white text-xs lg:text-sm px-2 py-1 rounded border border-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
        disabled={gameMode === 'vsEngine'} // ← Disable during active game
    >
        <option value="EASY">🟢 Easy (depth 3)</option>
        <option value="MEDIUM">🟡 Medium (depth 4)</option>
        <option value="HARD">🔴 Hard (depth 6)</option>
    </select>
</div>
```

**Features:**
- ✅ Visual difficulty indicators (🟢🟡🔴)
- ✅ Shows search depth for each level
- ✅ Disabled during active AI game (prevents changing mid-game)
- ✅ Responsive design (adapts to mobile/desktop)
- ✅ Styled to match existing Navbar theme

**Placement:** 
- Positioned before "Play vs AI" button
- Always visible when not connected to multiplayer
- Part of the engine controls group

### 3. AI Difficulty Levels (constants.js)

Current configuration:

| Level | Depth | Search Time (approx) | Description |
|-------|-------|---------------------|-------------|
| **Easy** | 3 ply | ~0.5-2s | Quick moves, beginner-friendly |
| **Medium** | 4 ply | ~2-5s | Balanced, moderate challenge |
| **Hard** | 6 ply | ~8-15s | Deep search, very strong |

## User Experience Flow

### 1. Before Game Starts
```
┌─────────────────────────────────────┐
│  AI Level: [🟡 Medium (depth 4) ▼] │  ← User can select
│  [🤖 Play vs AI]                    │
└─────────────────────────────────────┘
```

User can freely change difficulty level.

### 2. During AI Game
```
┌─────────────────────────────────────┐
│  AI Level: [🟡 Medium (depth 4) ▼] │  ← DISABLED (greyed out)
│  [Disconnect] [🔄 Reset]            │
└─────────────────────────────────────┘
```

Dropdown is disabled to prevent confusion (changing mid-game wouldn't affect current AI moves).

### 3. After Game Ends
```
┌─────────────────────────────────────┐
│  AI Level: [🔴 Hard (depth 6) ▼]   │  ← User can select again
│  [🤖 Play vs AI]                    │
└─────────────────────────────────────┘
```

User can adjust difficulty and start a new game.

## Technical Details

### State Flow
```
User selects difficulty in dropdown
         ↓
onChange fires → setAiDifficulty('HARD')
         ↓
aiDifficulty state updates → 'HARD'
         ↓
UI re-renders showing new selection
         ↓
When AI move starts:
    AI_DIFFICULTY['HARD'].depth → 6
         ↓
    findBestMoveParallel(gameState, 6)
         ↓
    AI searches at depth 6
```

### Why Disable During Game?

**Problem:** If user changes difficulty mid-game:
- Current AI move is already calculating at old depth
- New moves would use new depth
- Inconsistent AI strength within same game
- Confusing user experience

**Solution:** Disable selector when `gameMode === 'vsEngine'`

**Alternative considered:** Allow change but show warning
- **Rejected:** More complex, still confusing
- **Current approach:** Simple, clear, prevents issues

## Styling

The selector uses consistent design language:

- **Background:** `slate-700/50` (semi-transparent slate)
- **Select box:** `slate-600` (darker slate)
- **Border:** `slate-500` (medium slate)
- **Focus state:** Purple border (matches app theme)
- **Text:** Gray/white for readability
- **Disabled state:** Automatic graying via `disabled` attribute

## Responsive Design

- **Mobile:** Full width (`w-full sm:w-auto`)
- **Desktop:** Auto width, inline with other controls
- **Font size:** Smaller on mobile (`text-xs lg:text-sm`)

## Future Enhancements

### Possible Improvements:

1. **Custom Difficulty**
   - Allow user to manually set depth (3-8)
   - Advanced users could fine-tune strength

2. **Time-Based Difficulty**
   - Instead of depth, limit by time (5s, 10s, 30s)
   - More predictable move times

3. **Adaptive Difficulty**
   - AI adjusts based on player performance
   - Easier if player losing, harder if winning

4. **Difficulty Presets with Personalities**
   ```
   🤖 Friendly (depth 3, random moves)
   🎯 Balanced (depth 4)
   ♟️ Master (depth 6)
   🏆 Grandmaster (depth 8, opening book)
   ```

5. **Save User Preference**
   - Remember selected difficulty in localStorage
   - Restore on page reload

## Testing Checklist

✅ **Functional:**
- [ ] Dropdown displays all three difficulty levels
- [ ] Selecting each level updates state correctly
- [ ] AI uses correct depth for each difficulty
- [ ] Selector disabled during active game
- [ ] Selector enabled after game ends

✅ **Visual:**
- [ ] Dropdown matches Navbar styling
- [ ] Emoji indicators display correctly
- [ ] Depth numbers are readable
- [ ] Disabled state is visually clear
- [ ] Responsive on mobile devices

✅ **Performance:**
- [ ] Easy (depth 3): Moves in <2s
- [ ] Medium (depth 4): Moves in 2-5s
- [ ] Hard (depth 6): Moves in 8-15s
- [ ] No lag when changing selection

## Integration Notes

### For Future Developers:

**To add a new difficulty level:**

1. Update `src/ai/constants.js`:
   ```javascript
   export const AI_DIFFICULTY = {
       EASY: { depth: 3, name: 'Easy' },
       MEDIUM: { depth: 4, name: 'Medium' },
       HARD: { depth: 6, name: 'Hard' },
       EXPERT: { depth: 8, name: 'Expert' }  // ← Add here
   };
   ```

2. Update `src/components/ui/Navbar.jsx`:
   ```jsx
   <option value="EXPERT">⚫ Expert (depth 8)</option>
   ```

3. Update `src/App.jsx` initial state (optional):
   ```javascript
   const [aiDifficulty, setAiDifficulty] = useState('EXPERT');
   ```

**To change default difficulty:**

Change initial state in App.jsx:
```javascript
const [aiDifficulty, setAiDifficulty] = useState('EASY');  // Default to Easy
```

**To access current difficulty:**
```javascript
// In App.jsx:
const currentDepth = AI_DIFFICULTY[aiDifficulty].depth;
const currentName = AI_DIFFICULTY[aiDifficulty].name;
```

## Summary

This implementation provides a clean, intuitive way for users to select AI difficulty level with proper state management, visual feedback, and integration with the existing game architecture. The dropdown is strategically placed, appropriately disabled during gameplay, and styled consistently with the application's design system.
