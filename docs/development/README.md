# Development Documentation

This directory contains guides and resources for developers contributing to the Chess Piece Combination Game.

## Available Documentation

- **[Developer Guide](./developer-guide.md)** - Setup, workflow, and contribution guidelines

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Code editor (VS Code recommended)
- Firebase account (for multiplayer features)

### Setup Steps

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd my-tailwind-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Firebase** (for multiplayer)

   - Follow `FIREBASE_SETUP.md` in project root
   - Create `.env` file with TURN server credentials

4. **Run development server**

   ```bash
   npm run dev
   ```

5. **Open browser**
   - Navigate to `http://localhost:5173`

## Development Workflow

### Before Making Changes

1. Read relevant documentation
2. Check [Known Issues](../07-ISSUES-AND-BUGS.md)
3. Review [System Architecture](../architecture/system-architecture.md)
4. Understand the affected components

### Making Changes

1. Create feature branch from `engine`
2. Follow existing code patterns
3. Maintain immutability for game state
4. Write comments for complex logic
5. Test thoroughly before committing

### Testing Changes

- **Manual Testing**: Test in browser
- **AI Testing**: Run `node src/ai/test-ai.js`
- **Multiplayer Testing**: Test with two browser windows
- **Cross-browser**: Test in Chrome, Firefox, Safari

### Committing

1. Write clear commit messages
2. Use conventional commit format (optional)
3. Keep commits focused and atomic
4. Reference issues if applicable

## Project Structure

```
my-tailwind-app/
├── src/
│   ├── components/       # React UI components
│   ├── utils/            # Game logic (pure functions)
│   ├── ai/               # AI engine
│   ├── services/         # External services
│   ├── hooks/            # Custom hooks
│   └── App.jsx           # Main app component
├── docs/                 # Documentation (you are here)
├── public/               # Static assets
└── [config files]        # Vite, Tailwind, ESLint
```

## Key Conventions

### Code Style

- **JavaScript**: ES6+ features
- **React**: Functional components with hooks
- **Formatting**: Prettier (auto-format on save)
- **Linting**: ESLint rules enforced

### Naming

- **Components**: PascalCase (`ChessBoard.jsx`)
- **Functions**: camelCase (`calculateLegalMoves`)
- **Constants**: UPPER_SNAKE_CASE (`AI_DIFFICULTY`)
- **Files**: Match primary export name

### State Management

- App.jsx owns game state
- Pass state via props (controlled components)
- Update state via callbacks
- Never mutate state directly
- Use helper functions from `gameState.js`

### Git Branches

- `main`: Stable releases
- `engine`: Active development
- `feature/*`: New features
- `fix/*`: Bug fixes

## Testing Guidelines

### Manual Testing Checklist

- [ ] Basic piece movement works
- [ ] Combination/de-combination works
- [ ] Undo/redo functions correctly
- [ ] Timer counts down properly
- [ ] Board flips on turn change
- [ ] AI makes reasonable moves
- [ ] Multiplayer connects successfully
- [ ] Game ends correctly (checkmate/time)

### AI Testing

```bash
# Run test suite
node src/ai/test-ai.js

# Test transposition table
node src/ai/test-tt.js
```

### Multiplayer Testing

1. Open two browser windows
2. Create room in first window
3. Join room in second window
4. Make moves in both windows
5. Test reconnection by refreshing
6. Verify state synchronization

## Common Tasks

### Adding a New Feature

1. Plan architecture and integration points
2. Create feature documentation
3. Implement in isolated branch
4. Test thoroughly
5. Update relevant docs
6. Create pull request

### Fixing a Bug

1. Reproduce the bug consistently
2. Identify root cause
3. Create fix with minimal changes
4. Verify fix doesn't break other features
5. Update [Known Issues](../07-ISSUES-AND-BUGS.md) if resolved

### Improving Performance

1. Profile to identify bottleneck
2. Research optimization techniques
3. Implement and benchmark
4. Document performance improvements
5. Update relevant documentation

### Updating Documentation

1. Keep docs in sync with code
2. Use clear, concise language
3. Include code examples
4. Add links to related docs
5. Update index files

## Resources

### Internal Documentation

- [System Architecture](../architecture/system-architecture.md)
- [Core Systems](../03-CORE-SYSTEMS.md)
- [Game Mechanics](../04-GAME-MECHANICS.md)
- [AI Documentation](../ai/README.md)
- [WebRTC Documentation](../webrtc/README.md)

### External Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Firebase Documentation](https://firebase.google.com/docs)

## Getting Help

- Check existing documentation first
- Review [Known Issues](../07-ISSUES-AND-BUGS.md)
- Search closed issues/PRs
- Ask in project discussions
- Contact maintainers

## Contributing Areas

### High Priority

- Bug fixes ([Known Issues](../07-ISSUES-AND-BUGS.md))
- Performance improvements
- Test coverage
- Documentation updates

### Medium Priority

- New features ([Improvements](../08-IMPROVEMENTS.md))
- UI/UX enhancements
- AI improvements
- Multiplayer features

### Low Priority

- Code refactoring
- Optimization experiments
- Advanced features
- Research projects

## Code Review Guidelines

### Reviewing PRs

- Check code follows conventions
- Verify game logic is correct
- Test changes locally
- Check for breaking changes
- Ensure docs are updated

### Submitting PRs

- Provide clear description
- List changes made
- Include testing steps
- Reference related issues
- Update documentation

## Version Control

### Semantic Versioning (Planned)

- **Major**: Breaking changes
- **Minor**: New features
- **Patch**: Bug fixes

### Current Version

- Version: 0.0.0 (Pre-release development)

## Deployment (Future)

- Production builds: `npm run build`
- Preview builds: `npm run preview`
- Static hosting: Vercel/Netlify/GitHub Pages
- Environment variables via `.env.production`

---

[← Back to Documentation Index](../00-INDEX.md)
