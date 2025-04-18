declare module "../../src/deployments.json" {
  interface ContractData {
    abi: any[];
    addresses: Record<number, string>;
  }

  interface DeploymentsData {
    contracts: Record<string, ContractData>;
  }

  const deployments: DeploymentsData;
  export default deployments;
}
