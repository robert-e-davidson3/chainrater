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
- Contract typescript types derived from deployments.json

## Web Client Components
- Uses LitElement for web components
- Do not use querySelector for component communication
- Instead communicate between components via:
  - Re-rendering of sub-components
  - Emitting events (which can allow changes to the original LitElement)
  - Passing callbacks
- Dashboard component displays aggregate rating data by URI, with different sorting methods:
  - "Highest rated" section sorts by average score
  - "Most controversial" section sorts by variance/standard deviation

## Blockchain Interaction
- Web client uses viem library for blockchain interaction
- BlockchainService (singleton) in `/packages/web-client/src/services/blockchain.service.ts` manages:
  - Wallet connection (MetaMask)
  - Chain/account state
  - Contract reads/writes
  - Event subscriptions
- Components using BlockchainService should:
  - Listen to "connected" and "disconnected" events to update UI based on web3 connection state
  - May check BlockchainService.ready but should also listen for connection events
- Contract.Ratings.Ratings class maintains a mirror of smart contract state:
  - Enables synchronous reads from mirrored state
  - Provides methods to read and write to the smart contract
- User ratings fetched via blockchain events
- Contract parameters (addresses, ABIs) loaded from generated deployments.json

## Error Handling
- Preference for custom error classes when throwing errors
- Never use try-catch blocks that simply re-throw wrapped errors.

## Future Considerations
- **Indexing Service**: Current implementation queries blockchain events directly, which works for development but doesn't scale. A dedicated indexing service (like The Graph) will be needed for production to efficiently query historical data.
- **Pagination**: Out of scope for MVP but needed for scaling.
- **Account Naming**: Use smart contract for giving names to accounts. Maybe ENS, maybe a custom contract that also uses timing-from-staking.

## Common Gotchas & Troubleshooting
- **Event Querying**: Use `publicClient.getContractEvents()` instead of `getContract(...).getEvents()` which doesn't return a list of events as expected.
- **Wallet Nonce Issues**: Accounts used by the PopulateWithTestData script will have transaction history unknown to MetaMask/Brave Wallet. This causes nonce mismatches when the wallet tries to use these accounts (it starts at too low a nonce). Use fresh accounts in the wallet that weren't used by the script.
- **Contract Interaction Failures**: If contract interactions fail silently, check that the ABI matches the deployed contract exactly.
- **URI vs URL**: ChainRater users rate pseudo-URIs (Uniform Resource Identifiers) not URLs. I-vs-L.

# Ideas

## Limit cleanup to involved accounts

Multiply how much is staked by how many days it was staked, for each user.
Limt how much you can clean up from other accounts based on this.
So the people who use the app can get paid but bots need to invest more than is
worthwhile for them. Hard to find the right ratio but maybe it exists.

Like... the time value of money means that staking can be net-negative... but if you like
the app anyway then for you it's net-positive. So, set the stake requirement for cleanup
such that in say 99% of cases disinterested third parties have no reason to get involved.
