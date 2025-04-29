import { createContext } from "@lit/context";
import { BlockchainService } from "../services/blockchain.service.js";

export const blockchainServiceContext = createContext<BlockchainService>(
  Symbol("blockchain-service"),
);
