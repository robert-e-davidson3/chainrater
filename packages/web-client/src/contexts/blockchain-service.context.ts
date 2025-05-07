import { createContext } from "@lit/context";
import { BlockchainService } from "../services/blockchain.service.js";

export const blockchainServiceContext = createContext<
  BlockchainService | undefined
>(Symbol("blockchain-service"));
