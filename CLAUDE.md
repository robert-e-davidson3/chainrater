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
- Avoid try-catch blocks that simply re-throw wrapped errors because:
  - Stack traces already show error origin
  - Wrapping adds little value
  - Makes code harder to reason about
  - Adds unnecessary verbosity

## UI/UX Restructuring Plan
The high-level goal is to allow users to explore the contract state in general. This is in contrast to how it works now, where they can only really explore the contract state as it relates to themselves.

### Sub-goals
1. Get rid of the existing tabs except for Dashboard. Those UI elements will be used later but not at top-level. (DONE)
2. Add these tabs: "People", "URIs", "Ratings", "About". (DONE)
3. The "People" tab will be a searchable/filterable list of accounts. Each account will show its number of ratings and other interesting stats. If the list is unfiltered then the current user's account is always at top. Each account will lead to another page, which is basically what the "My Ratings" page is now, only for arbitrary users. (DONE)
4. The "URIs" tab will be searchable/filterable list of URIs. Each URI will show its average rating and other interesting stats. If the list is unfiltered then the current user's rated URIs are shown. Each URI will lead to another page. (DONE)
5. That URI-specific page has the URI's general information at top, followed by the user's rating (or a button to add a rating - it expands into a form), followed by the rest of the ratings. (DONE)
6. The "Ratings" tab will be searchable/filtering list of Ratings. Each Rating will show its URI, stars, expiry, and any other facts. If the list is unfiltered then just show the user's ratings. (DONE)
7. The "About" tab will have information about me, the github link, etc. It will be a simple LitElement that merely emits static html. (DONE)

### Important Notes
- Do not implement pagination - it is for later
- The tabs will always be at the top, so users can always go to top-level tabs
- This app uses "URIs" that are NOT "URLs" - valid formats include "restaurant://", "website://", etc.
- The details of each Rating will include the account that made the rating
- This process will involve refinement as development progresses

## Future Considerations
- **Indexing Service**: Current implementation queries blockchain events directly, which works for development but doesn't scale. A dedicated indexing service (like The Graph) will be needed for production to efficiently query historical data.
- **URI Hash Storage Strategy**: The current system uses keccak256 hashes of URIs stored on-chain. A more robust approach would involve IPFS for content addressing, particularly for structured metadata about ratings.
- **Trust Graph**: Work has started but is shelved because it's out of scope for an MVP. But it does need to exist eventually for the product to make sense.
- **Working Dashboard**: The dashboard now pulls data from the blockchain and displays ratings with different sorting methods.
- **Search**: Search does not work at all right now.
- **Simulation**: Simulate txs to give user feedback and to reduce the chance of bad txs getting sent.
- **Staking Input Tweaks**: Instead of entering in a number to stake, users should enter in a time for the review to be up. AND it should start at the minimum (aka 1 week). The user should see both how long the review will last AND how much weight it will have. IF necessary then use steps of 16 wei (or whatever in the contract) to ensure the stake is valid.

## Common Gotchas & Troubleshooting
- **Event Querying**: Use `publicClient.getContractEvents()` instead of `getContract(...).getEvents()` which doesn't return a list of events as expected.
- **Wallet Nonce Issues**: Accounts used by the PopulateWithTestData script will have transaction history unknown to MetaMask/Brave Wallet. This causes nonce mismatches when the wallet tries to use these accounts (it starts at too low a nonce). Use fresh accounts in the wallet that weren't used by the script.
- **Contract Interaction Failures**: If contract interactions fail silently, check that the ABI matches the deployed contract exactly.
