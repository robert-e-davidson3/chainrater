# ChainRater

## Development Setup

### Prerequisites
- Node.js v20+
- Foundry (via Nix Flake)

### Setup
1. Install dependencies:
```bash
npm install
```

## Local Development Workflow

### Smart Contract Development
0. Install foundry. If using nix with flake:
```bash
nix develop
```

1. Start a local blockchain with Anvil:
```bash
anvil
```

2. Build the contracts:
```bash
npm run build:contracts
```

3. Run contract tests:
```bash
npm run test:contracts
```

4. Go to `contracts/` directory.

5. Set `PRIVATE_KEY` in `contracts/.env` to one of the Anvil private keys.
See `contracts/.env.example` for an example.

6. Deploy contracts to local blockchain:
```bash
forge script --rpc-url local --broadcast script/DeployRatings.s.sol
```

8. Take note of the deployed contract address from the output.
It will look like `Rating contract deploy4ed at:  0xthisisthecontractaddress`.

9. Populate with test data:
```bash
RATINGS_ADDRESS=0x<deployed_contract_address> forge script --rpc-url local --broadcast script/PopulateWithTestData.s.sol
```

### Web Client Development
1. Build web client, including populating `deployments.json`:
```bash
npm run build:web-client
```

2. Start the web client development server:
```bash
npm run dev:web-client
```

3. The previous command should have opens the webpage in your browser but if not, go to http://localhost:3000

4. Connect MetaMask to the local blockchain:
   - Network Name: Anvil Testnet (local)
   - RPC URL: http://localhost:8545
   - Chain ID: 31337 (0x7a69)
   - Currency Symbol: fakeETH
   - Currency Decimals: 18

5. Import a test account into MetaMask using the private key displayed by Anvil
   - Note: For testing, use an account that wasn't used by the PopulateWithTestData script to avoid nonce issues. Accounts (5) and higher are safe to use.
