#!/usr/bin/env node

// This script extracts contract deployment information from Foundry artifacts
// and generates a deployments.json file for use in the web client

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface ContractData {
  abi: any[];
  addresses: Record<number, string>;
}

interface DeploymentsData {
  contracts: Record<string, ContractData>;
}

// Main execution
function main(): void {
  console.log("Generating deployments.json...");

  // Path configuration
  const projectRoot = path.resolve(__dirname, "../../..");
  const contractsDir = path.join(projectRoot, "contracts");
  const outputDir = path.join(projectRoot, "packages/web-client/src");
  const outputFile = path.join(outputDir, "deployments.json");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create deployments data structure
  const deployments: DeploymentsData = {
    contracts: {},
  };

  // List of contracts we care about - add more here as needed
  // name: The contract name in the ABI/deployments (e.g., "Ratings")
  // src: The source file name without .sol extension (e.g., "Rating")
  // deploy: The deployment script name without .s.sol extension (e.g., "DeployRating")
  const contractsToProcess = [
    { name: "Ratings", src: "Ratings", deploy: "DeployRatings" },
    // { name: "TrustGraph", src: "TrustGraph", deploy: "DeployTrustGraph" },
  ];

  // Extract ABI from each contract JSON file
  for (const contract of contractsToProcess) {
    const contractJsonPath = path.join(
      contractsDir,
      "out",
      `${contract.src}.sol`,
      `${contract.src}.json`,
    );

    if (!fs.existsSync(contractJsonPath))
      throw Error(`contract JSON file not found: ${contractJsonPath}`);

    const contractData = JSON.parse(fs.readFileSync(contractJsonPath, "utf8"));

    // Initialize contract data
    deployments.contracts[contract.name] = {
      abi: contractData.abi,
      addresses: {},
    };

    console.log(
      `  - Extracted ABI for ${contract.name} from ${contract.src}.sol`,
    );
  }

  // Extract deployment addresses
  const chainIds = [
    // 1, // Ethereum mainnet
    // 5, // Goerli testnet
    // 11155111, // Sepolia testnet
    31337, // Anvil local testnet
  ];

  // For each chain ID we care about
  for (const chainId of chainIds) {
    const runs = contractsToProcess.map((c) =>
      path.join(
        contractsDir,
        "broadcast",
        `${c.deploy}.s.sol`,
        String(chainId),
        "run-latest.json",
      ),
    );

    for (const runPath of runs) {
      if (!fs.existsSync(runPath))
        throw Error(`run file not found: ${runPath}`);

      const deploymentData = JSON.parse(fs.readFileSync(runPath, "utf8"));

      // Find contract deployment transactions
      if (!deploymentData.transactions) continue;
      for (const tx of deploymentData.transactions) {
        if (
          tx.transactionType !== "CREATE" ||
          !tx.contractName ||
          !tx.contractAddress
        )
          continue;
        const contractName = tx.contractName;

        // Find if we care about this contract
        const contractConfig = contractsToProcess.find(
          (c) => c.name === contractName,
        );
        if (contractConfig) {
          // Make sure the contract exists in our data structure
          if (!deployments.contracts[contractConfig.name])
            throw Error(
              `Contract ${contractConfig.name} not found in ABI data`,
            );

          // Add the deployment address
          deployments.contracts[contractConfig.name].addresses[chainId] =
            tx.contractAddress;
          console.log(
            `  - Added deployment for ${contractConfig.name} on chain ${chainId}: ${tx.contractAddress}`,
          );
        }
      }
    }
  }

  // Write the output file
  fs.writeFileSync(outputFile, JSON.stringify(deployments, null, 2));

  console.log(`Deployments file generated at ${outputFile}`);
}

// Execute the main function
main();
