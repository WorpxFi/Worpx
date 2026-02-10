# Contributing to Worpx Protocol

Thank you for your interest in contributing to Worpx Protocol. This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Branch Strategy](#branch-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Skill Development](#skill-development)
- [Documentation](#documentation)
- [Security](#security)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a feature branch from `main`
4. Make your changes
5. Submit a pull request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/worpx-protocol.git
cd worpx-protocol

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Run the test suite
npm test

# Start development server
npm run dev
```

### Prerequisites

- Node.js 18+ or Bun 1.0+
- TypeScript 5.0+
- Git 2.30+

## Branch Strategy

| Branch | Purpose |
|:-------|:--------|
| `main` | Production-ready code. Protected. |
| `develop` | Integration branch for features |
| `feature/*` | New features (e.g., `feature/payment-channels`) |
| `fix/*` | Bug fixes (e.g., `fix/settlement-timeout`) |
| `docs/*` | Documentation changes |
| `skill/*` | New skill packages (e.g., `skill/analytics-v2`) |

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|:-----|:------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, semicolons, etc.) |
| `refactor` | Code refactoring |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `build` | Build system or dependencies |
| `ci` | CI/CD configuration |
| `chore` | Maintenance tasks |
| `skill` | New or updated skill package |

### Scopes

- `core` &mdash; Core protocol logic
- `sdk` &mdash; TypeScript SDK
- `api` &mdash; REST API layer
- `skills` &mdash; Skill framework
- `settlement` &mdash; Settlement engine
- `wallet` &mdash; Wallet management
- `router` &mdash; Transaction router

### Examples

```
feat(sdk): add multi-chain wallet initialization
fix(settlement): resolve timeout on Polygon transactions
docs(api): update authentication endpoint examples
skill(trading): add limit order support
perf(router): optimize transaction batching for L2 chains
```

## Pull Request Process

1. **Update documentation** for any changed functionality
2. **Add tests** for new features or bug fixes
3. **Ensure CI passes** &mdash; all checks must be green
4. **Request review** from at least one maintainer
5. **Squash commits** before merging when appropriate

### PR Title Format

Follow the same convention as commits:

```
feat(sdk): add payment channel support for Solana
```

### PR Description Template

Your PR description should include:
- **What** &mdash; Brief description of changes
- **Why** &mdash; Motivation and context
- **How** &mdash; Implementation approach
- **Testing** &mdash; How the changes were tested
- **Breaking Changes** &mdash; Any breaking changes (if applicable)

## Coding Standards

### TypeScript

- Strict mode enabled (`strict: true`)
- No `any` types unless absolutely necessary (document why)
- Use interfaces for public APIs, types for internal use
- Explicit return types on exported functions
- Use `readonly` where mutation is not intended

### Style

- 2-space indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line structures
- Max line length: 100 characters

### File Organization

```typescript
// 1. External imports
import { ethers } from 'ethers';

// 2. Internal imports
import { TransactionRouter } from '../core/router';
import type { AgentConfig } from '../types/agent';

// 3. Constants
const DEFAULT_TIMEOUT = 30_000;

// 4. Types/Interfaces
interface ExecutionResult {
  hash: string;
  status: 'confirmed' | 'pending' | 'failed';
}

// 5. Implementation
export class Agent {
  // ...
}
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "TransactionRouter"
```

### Test Structure

```
tests/
├── unit/           # Isolated unit tests
├── integration/    # Cross-module tests
├── e2e/            # End-to-end tests
└── fixtures/       # Shared test data
```

### Writing Tests

- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies (blockchain, APIs)
- Test edge cases and error paths

## Skill Development

See the [Skills Development Guide](docs/SKILLS.md) for detailed instructions on building custom skills.

### Quick Overview

```typescript
import { Skill, SkillContext, SkillResult } from '@worpx/skills-core';

export class MyCustomSkill extends Skill {
  name = 'my-custom-skill';
  version = '1.0.0';
  description = 'Brief description of what this skill does';

  async execute(ctx: SkillContext): Promise<SkillResult> {
    // Skill logic here
    return { success: true, data: {} };
  }
}
```

### Skill PR Checklist

- [ ] Skill includes comprehensive JSDoc comments
- [ ] Unit tests cover primary execution paths
- [ ] Integration test validates on-chain behavior (if applicable)
- [ ] README.md included in skill package directory
- [ ] Version follows semver
- [ ] No hardcoded chain IDs or addresses

## Documentation

- Use JSDoc for all exported functions, classes, and interfaces
- Update relevant docs in `docs/` for any API changes
- Include code examples for new features
- Keep the README.md synchronized with major changes

## Security

If you discover a security vulnerability, **do not** open a public issue. Instead, follow the process described in [SECURITY.md](SECURITY.md).

---

Thank you for contributing to Worpx Protocol.
