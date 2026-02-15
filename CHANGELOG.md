# Changelog

All notable changes to Worpx Protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Agent lifecycle manager with state machine transitions
- Agent-to-agent encrypted messaging channel
- Multi-agent collaboration sessions
- Agent heartbeat monitor for liveness detection
- Cross-chain agent registry synchronizer
- Platform connector registry for multi-platform onboarding
- Agent capability declaration and matching engine
- Payment channel health monitoring with alerts

### Added
- Agent-to-agent payment channel protocol
- Cross-platform skill execution runtime
- Multi-chain transaction router with MEV protection
- TypeScript SDK (`@worpx/sdk`) with full type coverage
- Skills framework (`@worpx/skills-core`) with sandboxed execution
- REST API with Bearer token authentication
- CLI tool (`@worpx/cli`) for local development
- Built-in trading skill with limit orders, DCA, and stop-loss
- Built-in payment skill for agent-to-agent USDC transfers
- Built-in DeFi skill for protocol interactions
- Built-in analytics skill for market data aggregation
- Wallet abstraction layer supporting EVM and SVM chains
- Transaction simulation before on-chain submission
- Comprehensive test suite (unit, integration, e2e)
- GitHub Actions CI/CD pipeline
- Documentation site scaffold

### Security
- Secure enclave key management
- Per-agent rate limiting and spending caps
- Skill sandboxing with permission scoping
- MEV protection via Flashbots integration
- API key scoping and automatic rotation

## [0.1.0] - 2025-02-10

### Added
- Initial protocol specification
- Core architecture design
- Repository structure and build system
- Development environment configuration
- Contributing guidelines and code of conduct

---

[Unreleased]: https://github.com/WorpxDeveloper/worpx-protocol/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/WorpxDeveloper/worpx-protocol/releases/tag/v0.1.0
