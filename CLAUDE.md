# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands
- Build all: `npm run build`
- Build contracts: `forge build --root contracts` or `npm run build:contracts`
- Run all contract tests: `forge test --root contracts` or `npm run test:contracts`
- Run specific contract test: `forge test --root contracts --match-test testFunctionName`
- Generate contract types: `npm run generate-types`
- Start web client: `npm run dev:web-client`
- Start API server: `npm run dev:api-server`

## Code Style

### TypeScript
- ES Modules with NodeNext resolution
- ES2022 target with strict type checking
- Force consistent casing in filenames

### Solidity
- Version: 0.8.21
- Format: 100 char line length, 4 space indentation, bracket spacing
- Events: PascalCase (e.g., RatingSubmitted)
- Functions: camelCase (e.g., submitRating)
- Error handling: require statements with descriptive messages
- Tests: Foundry Test.sol framework with setUp function and assertions

### Project Structure
- Monorepo with workspaces for packages and shared code
- Contracts in contracts/src with tests in parallel directory
- Type generation from contract ABIs to TypeScript