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

## Local Blockchain Development
- Start Anvil (local blockchain): `anvil`
- Deploy contracts: `forge script script/DeployRatings.s.sol:DeployRatings --rpc-url http://localhost:8545 --broadcast -vvv`
- Add test data: `forge script script/PopulateWithTestData.s.sol:PopulateWithTestData --rpc-url http://localhost:8545 --broadcast -vvv`
- Set contract addresses as environment variables before running test data script:
  ```bash
  export RATINGS_ADDRESS=0x...
  ```

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
- Monorepo with workspaces for typescript packages
- Contracts in contracts/src with tests in parallel directory
- Contract typescript types derived from deployments.json.

## Blockchain Interaction
- Web client uses viem library for blockchain interaction
- BlockchainService (singleton) in `/packages/web-client/src/services/blockchain.service.ts` manages:
  - Wallet connection (MetaMask)
  - Chain/account state
  - Contract reads/writes
  - Event subscriptions
- User ratings fetched via blockchain events
- Contract parameters (addresses, ABIs) loaded from generated deployments.json

## Future Considerations
- **Indexing Service**: Current implementation queries blockchain events directly, which works for development but doesn't scale. A dedicated indexing service (like The Graph) will be needed for production to efficiently query historical data.
- **URI Hash Storage Strategy**: The current system uses keccak256 hashes of URIs stored on-chain. A more robust approach would involve IPFS for content addressing, particularly for structured metadata about ratings.

## Common Gotchas & Troubleshooting
- **Event Querying**: Use `publicClient.getContractEvents()` instead of `getContract(...).getEvents()` which doesn't return a list of events as expected.
- **Wallet Nonce Issues**: Accounts used by the PopulateWithTestData script will have transaction history unknown to MetaMask/Brave Wallet. This causes nonce mismatches when the wallet tries to use these accounts (it starts at too low a nonce). Use fresh accounts in the wallet that weren't used by the script.
- **Contract Interaction Failures**: If contract interactions fail silently, check that the ABI matches the deployed contract exactly.
