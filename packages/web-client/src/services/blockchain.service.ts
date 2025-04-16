import { ethers } from 'ethers';
import { hashURI } from '../utils/blockchain.utils';
import type { Rating } from '../types/rating.types';

// ABI for the Ratings contract
const RatingsABI = [
  "event RatingSubmitted(bytes32 indexed uri, address indexed rater, uint8 score, uint64 stake)",
  "event RatingRemoved(bytes32 indexed uri, address indexed rater, uint8 score, uint64 stake)",
  "event RatingCleanedUp(bytes32 indexed uri, address indexed rater, uint8 score, uint64 stake)",
  "function submitRating(bytes32 uri, uint8 score) external payable",
  "function removeRating(bytes32 uri) external",
  "function cleanupRating(bytes32 uri, address rater) external",
  "function getRating(bytes32 uri, address rater) external view returns (tuple(uint8 score, uint64 posted, uint64 stake))",
  "function STAKE_PER_SECOND() external view returns (uint64)",
  "function MIN_STAKE() external view returns (uint64)"
];

export class BlockchainService {
  // Singleton instance
  private static instance: BlockchainService;
  
  provider: ethers.providers.Web3Provider | null = null;
  signer: ethers.Signer | null = null;
  contract: ethers.Contract | null = null;
  chainId: number | null = null;
  account: string | null = null;
  
  // Contract addresses per network
  contractAddresses: { [chainId: number]: string } = {
    1: '', // Mainnet - to be filled
    5: '', // Goerli - to be filled
    11155111: '', // Sepolia - to be filled
    1337: '0x5FbDB2315678afecb367f032d93F642f64180aa3' // Local network
  };
  
  private constructor() {}
  
  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }
  
  // Connection methods
  async connect(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask or compatible wallet is required');
    }
    
    // Connect to provider and get signer
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await this.provider.send('eth_requestAccounts', []);
    this.account = accounts[0];
    
    this.signer = this.provider.getSigner();
    
    // Get chain ID
    const network = await this.provider.getNetwork();
    this.chainId = network.chainId;
    
    // Get contract for the current network
    const contractAddress = this.contractAddresses[this.chainId];
    if (!contractAddress) {
      throw new Error(`ChainRater is not deployed on network ${this.chainId}`);
    }
    
    this.contract = new ethers.Contract(
      contractAddress,
      RatingsABI,
      this.signer
    );
    
    return this.account;
  }
  
  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.account = null;
    this.chainId = null;
  }
  
  isConnected(): boolean {
    return !!this.account && !!this.contract;
  }
  
  // Rating methods
  async submitRating(uri: string, score: number, stake: bigint): Promise<any> {
    if (!this.contract || !this.signer) throw new Error('Not connected');
    
    const uriHash = hashURI(uri);
    const tx = await this.contract.submitRating(uriHash, score, {
      value: stake.toString()
    });
    return await tx.wait();
  }
  
  async removeRating(uri: string): Promise<any> {
    if (!this.contract || !this.signer) throw new Error('Not connected');
    
    const uriHash = hashURI(uri);
    const tx = await this.contract.removeRating(uriHash);
    return await tx.wait();
  }
  
  async cleanupRating(uri: string, rater: string): Promise<any> {
    if (!this.contract || !this.signer) throw new Error('Not connected');
    
    const uriHash = hashURI(uri);
    const tx = await this.contract.cleanupRating(uriHash, rater);
    return await tx.wait();
  }
  
  async getRating(uri: string, rater: string): Promise<Rating | null> {
    if (!this.contract) throw new Error('Not connected');
    
    const uriHash = hashURI(uri);
    try {
      const rating = await this.contract.getRating(uriHash, rater);
      
      if (rating.stake.toNumber() === 0) {
        return null; // No rating found
      }
      
      const stakePerSecond = await this.contract.STAKE_PER_SECOND();
      const actualStake = rating.stake.mul(stakePerSecond);
      
      return {
        uriHash,
        decodedURI: uri,
        score: rating.score,
        posted: rating.posted.toNumber(),
        stake: actualStake,
        rater,
        expirationTime: new Date((rating.posted.toNumber() + rating.stake.toNumber()) * 1000)
      };
    } catch (error) {
      console.error('Error getting rating:', error);
      return null;
    }
  }
  
  async getMinimumStake(): Promise<bigint> {
    if (!this.contract) throw new Error('Not connected');
    const minStake = await this.contract.MIN_STAKE();
    return BigInt(minStake.toString());
  }
  
  async getStakePerSecond(): Promise<bigint> {
    if (!this.contract) throw new Error('Not connected');
    const stakePerSecond = await this.contract.STAKE_PER_SECOND();
    return BigInt(stakePerSecond.toString());
  }
  
  // Event listeners and query methods would be implemented here
  // These would be used to get data for the dashboard, search, etc.
  async getUserRatings(address: string): Promise<Rating[]> {
    // This is a placeholder implementation
    // In a real implementation, you would query events or use an indexer
    return [];
  }
  
  async getTopRatedURIs(): Promise<any[]> {
    // This is a placeholder implementation
    // In a real implementation, you would query events or use an indexer
    return [];
  }
}