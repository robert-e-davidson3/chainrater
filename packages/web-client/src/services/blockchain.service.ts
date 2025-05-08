import {
  createWalletClient,
  createPublicClient,
  http,
  custom,
  getContract,
  type WalletClient,
  type PublicClient,
  type Address,
  GetContractReturnType,
  WatchContractEventOnLogsFn,
  Hex,
  EIP1193Provider,
  ProviderRpcError,
  ProviderConnectInfo,
} from "viem";
import { mainnet, sepolia, foundry, polygon } from "viem/chains";
import { hashURI } from "../utils/blockchain.utils.js";
import "viem/window";
import EventEmitter from "events";

// This file is generated from the Foundry artifacts.
import deployments from "../../src/deployments.js";

export class BlockchainService extends EventEmitter {
  private client: Clients | null = null;

  private _state: BlockchainServiceState = "disconnected";
  get state(): BlockchainServiceState {
    return this._state;
  }
  private set state(newState: BlockchainServiceState) {
    this.emit("stateChanged", { old: this._state, new: newState });
    this._state = newState;
  }
  get ready(): boolean {
    return this.state === "readonly" || this.state === "writeable";
  }

  private _chainId: ChainId | null = null;
  get chainId(): ChainId | null {
    return this._chainId;
  }
  set chainId(chainId: ChainId) {
    this.reconnect(chainId);
  }

  private contracts?: {
    ratings: Contract.Ratings.Ratings;
  };

  private _account?: Address;
  get account(): Address | undefined {
    return this._account;
  }
  private set account(account: Address | undefined) {
    if (account) console.log("Account changed:", account);
    else console.log("Account cleared");

    this._account = account;
    if (this.contracts) this.contracts.ratings.account = account;

    this.emit("accountChanged", account);
  }

  get ratings(): Contract.Ratings.Ratings {
    if (!this.contracts) throw new NotConnectedError();
    return this.contracts.ratings;
  }

  // Sets all state dependent on connection.
  async connect(chainId?: number) {
    this.state = "connecting";

    const ethereum = getEthereum();

    if (ethereum) {
      ethereum.on("connect", (info: ProviderConnectInfo) => {
        const chainId = parseInt(info.chainId, 16);
        this.reconnect(chainId);
      });
      ethereum.on("chainChanged", (chainIdHex: string) => {
        const chainId = parseInt(chainIdHex, 16);
        this.reconnect(chainId);
      });
      ethereum.on("disconnect", (error: ProviderRpcError) => {
        console.warn(String(error));
        this.disconnect();
      });
      ethereum.on("accountsChanged", (accounts: Address[]) => {
        this.account = accounts[0];
      });
    }

    if (chainId) this._chainId = validChainIdOrThrow(chainId);
    else if (ethereum) this._chainId = await this.getChainId(ethereum);
    else this._chainId = polygon.id; // Default to Polygon

    const chain = getChainFromId(this._chainId);

    console.info(`Connecting to chain ${chain.name} (${this._chainId})`);

    this.client = buildClients(chain, ethereum);

    if (this.client.wallet) {
      if (this.client.wallet.account) {
        this._account = this.client.wallet.account.address;
      } else {
        const addresses = await this.client.wallet.requestAddresses();
        this._account = addresses[0];
      }
    }

    this.contracts = {
      ratings: await Contract.Ratings.Ratings.create(
        this._chainId,
        this.client,
        this._account,
      ),
    };

    this.state = this.client.wallet ? "writeable" : "readonly";
    this.emit("connected", this._chainId);
  }

  // Unsets all state dependent on connection.
  disconnect() {
    console.log("Disconnecting from chain");
    this.state = "disconnected";
    this.contracts?.ratings.clear();
    this._chainId = null;
    this.client = null;
    this.emit("disconnected");
  }

  async reconnect(chainId?: number) {
    this.disconnect();
    await this.connect(chainId);
  }

  private async getChainId(
    ethereum: NonNullable<typeof window.ethereum>,
  ): Promise<ChainId> {
    const chainId = await ethereum
      .request({ method: "eth_chainId" })
      .then((chainIdHex) => parseInt(chainIdHex as string, 16));
    if (!isChainId(chainId)) throw new BadChainError(chainId);
    return chainId;
  }
}

export type BlockchainServiceState =
  | "disconnected"
  | "readonly"
  | "writeable"
  | "connecting";

// Smart contract wrappers.
// Each designed to mimic the on-chain state of the contract,
// as well as provide methods to interact with it.
export namespace Contract {
  export namespace Ratings {
    export class Ratings extends EventEmitter {
      constructor(chainId: ChainId, clients: Clients, account?: Address);
      constructor(contract: Contract, clients: Clients, account?: Address);
      constructor(
        chainIdOrContract: ChainId | Contract,
        clients: Clients,
        account?: Address,
      ) {
        super();

        this.clients = clients;
        this.account = account;

        if (typeof chainIdOrContract === "number") {
          const chainId = chainIdOrContract as ChainId;
          this.contract = getContract({
            address: addressOrThrow(
              deployments.contracts.Ratings.addresses,
              chainId,
            ),
            abi,
            client: clients.wallet ?? clients.public,
          });
        } else {
          this.contract = chainIdOrContract;
        }
      }

      private contract: Contract;
      private clients: Clients;
      public account?: Address;

      private state: {
        minStake?: bigint;
        stakePerSecond?: bigint;
        hashToURI: Map<string, string>;
        // URI hash -> rater address -> Rating
        ratings: Map<string, Map<Address, InternalRating>>;
      } = { hashToURI: new Map(), ratings: new Map() };
      private watchers = new Set<() => void>();

      get minStake(): bigint {
        if (this.state.minStake === undefined)
          throw new NotInitializedError("Ratings.minStake not initialized");
        return this.state.minStake;
      }

      get stakePerSecond(): bigint {
        if (this.state.stakePerSecond === undefined)
          throw new NotInitializedError(
            "Ratings.stakePerSecond not initialized",
          );
        return this.state.stakePerSecond;
      }

      getUriFromHash(hash: string): string {
        const uri = this.state.hashToURI.get(hash);
        if (!uri) throw new NotFoundError(`URI not found for hash: ${hash}`);
        return uri;
      }

      // Specifically gets ratings that are already cached (in the Ratings.state).
      // To get a single rating directly from the blockchain, use `getRating`.
      // Returns a single rating (or null) if `rater` and `uriHash`/`uri` are provided.
      getRatings(
        _: {
          deleted: true;
          rater: Address;
          expired: boolean;
        } & ({ uri: string } | { uriHash: string }),
      ): DeletedRating | null;
      getRatings(
        _: {
          deleted: false;
          rater: Address;
          expired?: boolean;
        } & ({ uri: string } | { uriHash: string }),
      ): ExistingRating | null;
      getRatings(
        _: {
          deleted: undefined;
          rater: Address;
          expired?: boolean;
        } & ({ uri: string } | { uriHash: string }),
      ): Rating | null;
      getRatings(
        _: {
          deleted: true;
          rater?: Address;
          expired?: boolean;
        } & ({ uri?: string } | { uriHash?: string }),
      ): DeletedRating[];
      getRatings(
        _: {
          deleted: false;
          rater?: Address;
          expired?: boolean;
        } & ({ uri?: string } | { uriHash?: string }),
      ): ExistingRating[];
      getRatings(
        _: {
          deleted?: boolean;
          rater?: Address;
          expired?: boolean;
        } & ({ uri?: string } | { uriHash?: string }),
      ): Rating[];
      getRatings({
        uriHash,
        uri,
        rater,
        expired,
        deleted,
      }: {
        uriHash?: string;
        uri?: string;
        rater?: Address;
        expired?: boolean;
        deleted?: boolean;
      }): Rating | null | Rating[] {
        if (expired !== undefined && deleted !== false)
          throw new Error("Cannot filter by expired if deleted != false");

        if (uri !== undefined && uriHash === undefined) uriHash = hashURI(uri);

        if (uriHash) uriHash = uriHash.toLowerCase();
        if (rater) rater = rater.toLowerCase() as Address;

        let ratings: Rating[] = [];
        let justOne = false;
        if (uriHash && rater) {
          // Get a single rating
          const rating = this.state.ratings.get(uriHash)?.get(rater);
          if (!rating) return null;
          ratings.push({ ...rating, uriHash, rater });
          justOne = true;
        } else if (uriHash) {
          // Get all ratings for a specific URI hash
          const raterMap = this.state.ratings.get(uriHash);
          if (raterMap)
            ratings = Array.from(raterMap.entries()).map(([rater, rating]) => ({
              ...rating,
              rater,
              uriHash,
            }));
        } else if (rater) {
          // Get all ratings for a specific rater
          this.state.ratings.forEach((raterMap, uriHash) => {
            const rating = raterMap.get(rater);
            if (rating) ratings.push({ ...rating, rater, uriHash });
          });
        } else {
          // Get all ratings
          this.state.ratings.forEach((raterMap, uriHash) => {
            ratings.push(
              ...Array.from(raterMap.entries()).map(([rater, rating]) => ({
                ...rating,
                rater,
                uriHash,
              })),
            );
          });
        }

        // Filter out deleted or existing ratings, depending
        if (deleted !== undefined)
          ratings = ratings.filter((rating) => rating.deleted === deleted);

        // Filter out expired or unexpired ratings, depending
        if (expired !== undefined) {
          const stakePerSecond = this.stakePerSecond;
          if (stakePerSecond === undefined)
            throw Error("stakePerSecond not set");
          const now = new Date(); // TODO must be same tz etc as blockchain
          ratings = ratings.filter((rating) => {
            const { posted, stake } = rating as ExistingRating;
            const expirationTime = calculateExpirationTime(
              posted,
              stake,
              stakePerSecond,
            );
            return expired ? expirationTime < now : expirationTime >= now;
          });
        }

        if (justOne) return ratings.length > 0 ? ratings[0] : null;
        return ratings;
      }

      /**
       * Get a map of all unique raters to their ratings
       * @returns Map where keys are rater addresses and values are arrays of ratings
       */
      getRaters(): Map<Address, Rating[]> {
        // Build a map of rater address to array of their ratings
        const raterMap = new Map<Address, Rating[]>();

        // Process all ratings and group by rater address
        this.state.ratings.forEach((raterToRating, uriHash) => {
          raterToRating.forEach((rating, rater) => {
            const raterLower = rater.toLowerCase() as Address;

            if (!raterMap.has(raterLower)) {
              raterMap.set(raterLower, []);
            }

            raterMap.get(raterLower)?.push({
              ...rating,
              rater: raterLower,
              uriHash,
            });
          });
        });

        return raterMap;
      }

      async submitRating(uri: string, score: number, stake: bigint) {
        if (!this.account) throw new MissingAccountError();

        const args = [uri, score] as const;
        const opts = {
          value: stake,
          account: this.account,
          chain: this.clients.public.chain,
        } as const;

        await this.contract.simulate.submitRating(args, opts).catch((error) => {
          throw new SimulationError(error);
        });
        const txHash = await this.contract.write.submitRating(args, opts);
        await this.clients.public.waitForTransactionReceipt({ hash: txHash });
      }

      async removeRating(uri: string, rater: Address) {
        if (!this.account) throw new MissingAccountError();
        const uriHash = hashURI(uri);

        const args = [uriHash, rater] as const;
        const opts = {
          account: this.account,
          chain: this.clients.public.chain,
        } as const;

        await this.contract.simulate.removeRating(args, opts).catch((error) => {
          throw new SimulationError(error);
        });
        await this.contract.write.removeRating(args, opts);
      }

      // Gets a rating from the blockchain.
      async getRating(
        uri: string,
        rater: Address,
      ): Promise<ExistingRating | null> {
        const uriHash = hashURI(uri);
        const { posted, score, stake } = await this.contract.read.getRating([
          uriHash,
          rater,
        ]);
        if (stake === 0n) return null;
        return {
          uriHash,
          rater,
          posted,
          score,
          stake,
          latestBlockNumber: BigInt(0),
          deleted: false,
        } as ExistingRating;
      }

      private _ready = false;
      get ready(): boolean {
        return this._ready;
      }

      static async create(
        chainId: ChainId,
        clients: Clients,
        account?: Address,
      ): Promise<Ratings> {
        const ratings = new Ratings(chainId, clients, account);
        await ratings.init();
        return ratings;
      }

      // Get contract state and set up listeners for changes.
      async init() {
        if (this._ready) throw new AlreadyInitializedError();
        await Promise.all([
          this.initConstants(),
          this.initUriRevealedEvent(),
          this.initRatingSubmittedEvent(),
          this.initRatingRemovedEvent(),
        ]);
        this._ready = true;
        this.emit("initialized");
      }

      private async initConstants() {
        this.state.minStake = (await this.contract.read.MIN_STAKE()) as bigint;
        this.state.stakePerSecond =
          (await this.contract.read.STAKE_PER_SECOND()) as bigint;
      }

      private async initUriRevealedEvent() {
        const onLogs: WatchContractEventOnLogsFn<ABI, "UriRevealed", true> = (
          logs,
        ) => {
          for (const log of logs) {
            const { uriHash, uri } = log.args;
            this.state.hashToURI.set(uriHash, uri);
          }
          if (logs.length > 0) this.emit("uriRevealed", logs);
        };

        this.watchers.add(
          this.clients.public.watchContractEvent({
            abi,
            address: this.contract.address,
            eventName: "UriRevealed",
            args: {},
            strict: true,
            onLogs,
          }),
        );
        await this.clients.public
          .getContractEvents({
            abi,
            address: this.contract.address,
            fromBlock: "earliest",
            toBlock: "latest",
            eventName: "UriRevealed",
            strict: true,
          })
          .then(onLogs);
      }

      private async initRatingSubmittedEvent() {
        const onLogs: WatchContractEventOnLogsFn<
          ABI,
          "RatingSubmitted",
          true
        > = (logs) => {
          const changed = [];
          for (const log of logs) {
            const { uri: uriHash, score, stake, posted } = log.args;
            const rater = log.args.rater.toLowerCase() as Address;
            const { blockNumber: latestBlockNumber } = log;

            if (!this.state.ratings.has(uriHash))
              this.state.ratings.set(uriHash, new Map());
            const rating = this.state.ratings.get(uriHash)?.get(rater);
            if (rating && rating.latestBlockNumber >= latestBlockNumber)
              continue; // Ignore old ratings
            changed.push({
              uriHash,
              rater,
              score,
              stake,
              posted,
            });
            this.state.ratings?.get(uriHash)?.set(rater, {
              score,
              posted,
              stake,
              latestBlockNumber,
              deleted: false,
            });
          }
          if (changed.length > 0) this.emitRatingSubmitted(changed);
        };

        this.watchers.add(
          this.clients.public.watchContractEvent({
            abi,
            address: this.contract.address,
            eventName: "RatingSubmitted",
            args: {},
            strict: true,
            onLogs,
          }),
        );
        await this.clients.public
          .getContractEvents({
            abi,
            address: this.contract.address,
            fromBlock: "earliest",
            toBlock: "latest",
            eventName: "RatingSubmitted",
            strict: true,
          })
          .then(onLogs);
      }

      private async initRatingRemovedEvent() {
        const onLogs: WatchContractEventOnLogsFn<ABI, "RatingRemoved", true> = (
          logs,
        ) => {
          const changed = [];
          for (const log of logs) {
            const uriHash = log.args.uri;
            const rater = log.args.rater.toLowerCase() as Address;
            const { blockNumber: latestBlockNumber } = log;

            if (!this.state.ratings.has(uriHash))
              this.state.ratings.set(uriHash, new Map());
            const rating = this.state.ratings.get(uriHash)?.get(rater);
            if (rating && rating.latestBlockNumber >= latestBlockNumber)
              continue; // Ignore older events
            changed.push({ uriHash, rater });
            this.state.ratings?.get(uriHash)?.set(rater, {
              latestBlockNumber,
              deleted: true,
            });
          }
          if (changed.length > 0) this.emitRatingRemoved(changed);
        };

        this.watchers.add(
          this.clients.public.watchContractEvent({
            abi,
            address: this.contract.address,
            eventName: "RatingRemoved",
            args: {},
            strict: true,
            onLogs,
          }),
        );
        await this.clients.public
          .getContractEvents({
            abi,
            address: this.contract.address,
            fromBlock: "earliest",
            toBlock: "latest",
            eventName: "RatingRemoved",
            strict: true,
          })
          .then(onLogs);
      }

      clear() {
        this.state = { hashToURI: new Map(), ratings: new Map() };
        this.watchers.forEach((w) => w()); // Stop all watchers
        this.watchers = new Set();
        this.emit("cleared");
      }

      private emitRatingSubmitted(ratings: RatingSubmittedEvent[]) {
        this.emit(RatingSubmittedEventName, ratings);
      }

      private emitRatingRemoved(ratings: RatingRemovedEvent[]) {
        this.emit(RatingRemovedEventName, ratings);
      }
    }

    const abi = deployments.contracts.Ratings.abi;
    type ABI = typeof abi;

    export type Contract = GetContractReturnType<
      typeof deployments.contracts.Ratings.abi,
      WalletClient
    >;

    type InternalRating =
      | Omit<ExistingRating, "uriHash" | "rater">
      | Omit<DeletedRating, "uriHash" | "rater">;

    export const RatingSubmittedEventName = "ratingSubmitted" as const;
    export type RatingSubmittedEvent = {
      uriHash: Hex;
      rater: Address;
      score: number;
      stake: bigint;
      posted: bigint;
    };

    export const RatingRemovedEventName = "ratingRemoved" as const;
    export type RatingRemovedEvent = {
      uriHash: Hex;
      rater: Address;
    };
  }
}

function addressOrThrow(addresses: any, id: number): Address {
  if (!isChainId(id)) throw new BadChainError(id);

  if (typeof addresses !== "object") throw new InvalidDeploymentsFileError();

  const addrs = addresses as { [k: string]: Address };
  const address = addrs[String(id)];

  if (!address) throw new BadChainError(id);

  if (typeof address !== "string" || !address.startsWith("0x"))
    throw new InvalidDeploymentsFileError();

  return address;
}

export function calculateExpirationTime(
  posted: bigint,
  stake: bigint,
  stakePerSecond: bigint,
): Date {
  const expirationTimeInSeconds =
    Number(posted) + Number(stake) / Number(stakePerSecond);
  return new Date(expirationTimeInSeconds * 1000);
}

export type Rating = ExistingRating | DeletedRating;

export interface ExistingRating {
  uriHash: string;
  score: number;
  posted: bigint;
  stake: bigint; // NOTE: this is raw aka it's not adjusted by stakePerSecond
  rater: Address;
  latestBlockNumber: bigint;
  deleted: false;
}

export interface DeletedRating {
  uriHash: string;
  rater: Address;
  latestBlockNumber: bigint;
  deleted: true;
}

export interface SearchResult {
  uriHash: string;
  decodedURI?: string;
  averageScore: number;
  ratingCount: number;
  topRatings?: Rating[];
  isExpired?: boolean;
  stake?: string;
  expirationTime?: Date;
  rater?: Address;
}

export interface RatingLog {
  uriHash: string;
  rater: Address;
  score: number;
  stake: bigint;
  blockNumber: bigint;
  add: boolean; // true if Rating(Re)Submitted, false otherwise
}

// Supported chains
const CHAINS = [mainnet, sepolia, foundry, polygon] as const;
type Chain = (typeof CHAINS)[number];
type ChainId = (typeof CHAINS)[number]["id"];
const CHAIN_IDS: ChainId[] = CHAINS.map((c) => c.id);

function getChainFromId(chainId: ChainId): Chain {
  const chain = CHAINS.find((c) => c.id === chainId);
  if (!chain) throw new BadChainError(chainId);
  return chain;
}

function isChainId(x: number): x is ChainId {
  return CHAIN_IDS.some((id) => id === x);
}

function validChainIdOrThrow(x: number): ChainId {
  if (!isChainId(x)) throw new BadChainError(x);
  return x;
}

// Returns the Ethereum provider from the window object.
// (Used to alternatively provide the brave wallet, but that didn't work out.)
function getEthereum(): Ethereum {
  return window.ethereum ?? null;
}

type Ethereum = EIP1193Provider | null;

function buildClients(chain: Chain, ethereum: Ethereum): Clients {
  return ethereum
    ? {
        wallet: createWalletClient({ chain, transport: custom(ethereum) }),
        public: createPublicClient({ chain, transport: http() }),
      }
    : {
        public: createPublicClient({ chain, transport: http() }),
      };
}

type Clients = {
  public: PublicClient;
  wallet?: WalletClient;
};

export class BadChainError extends Error {
  constructor(readonly chainId: number) {
    super(`Unsupported chain. ID=${chainId}`);
    this.name = "BadChainError";
  }
}

export class MissingWeb3Error extends Error {
  constructor() {
    super("MetaMask or compatible wallet is required");
    this.name = "MissingWeb3Error";
  }
}

export class MissingAccountError extends Error {
  constructor() {
    super("Missing account");
    this.name = "MissingAccountError";
  }
}

export class NotConnectedError extends Error {
  constructor() {
    super("Not connected");
    this.name = "NotConnectedError";
  }
}

export class NotInitializedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotInitializedError";
  }
}

export class AlreadyInitializedError extends Error {
  constructor() {
    super("Already initialized");
    this.name = "AlreadyInitializedError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class SimulationError extends Error {
  constructor(innerError: Error) {
    super(`Simulation failed: ${innerError.message}`);
    this.name = "SimulationError";
  }
}

export class InvalidDeploymentsFileError extends Error {
  constructor(message: string = "Invalid deployments file format") {
    super(message);
    this.name = "InvalidDeploymentsFileError";
  }
}
