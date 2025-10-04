import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  BlockchainService,
  type ExistingRating,
} from "../services/blockchain.service.js";
import { formatETH, MissingContextError } from "../utils/blockchain.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import { ListenerManager } from "../utils/listener.utils.js";
import "./stake-time-display.js";
import "./uri-display.js";

//
// Note that the dashboard does NOT update in real time. Reload to get the latest.
//

@customElement("app-dashboard")
export class Dashboard extends LitElement {
  @state() tvl = 0n;
  @state() topStakedURIs: StakedURIItem[] = [];
  @state() topRatedURIs: RatedURIItem[] = [];
  @state() topVarianceURIs: VarianceURIItem[] = [];
  @state() loading = true;

  @consume({ context: blockchainServiceContext })
  _blockchainService?: BlockchainService;

  get blockchainService() {
    if (!this._blockchainService)
      throw new MissingContextError("blockchainServiceContext");
    return this._blockchainService;
  }

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard {
      display: grid;
      gap: 2rem;
    }

    .stats-card {
      background-color: #fff;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .tvl-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #3498db;
      margin: 1rem 0;
      display: flex;
      justify-content: center;
    }

    .top-lists {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .list-card {
      background-color: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    h2,
    h3 {
      margin-top: 0;
      color: #333;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      padding: 0.75rem 0;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    li:last-child {
      border-bottom: none;
    }

    a {
      color: #3498db;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .item-value {
      font-weight: bold;
    }

    .empty-list {
      color: #999;
      text-align: center;
      padding: 1rem 0;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
      color: #999;
    }
  `;

  render() {
    if (this.loading)
      return html` <div class="loading">Loading dashboard data...</div> `;

    return html`
      <section class="dashboard">
        <div class="stats-card">
          <h2>Total Time Locked</h2>
          <div class="tvl-value">
            <stake-time-display
              class="inherit-color"
              .stake=${this.tvl}
              .aggregateMode=${true}
              .showDetails=${true}
            ></stake-time-display>
          </div>
        </div>

        <div class="top-lists">
          <div class="list-card">
            <h3>Most Staked Items</h3>
            ${this.renderURIList(this.topStakedURIs, "stake")}
          </div>

          <div class="list-card">
            <h3>Highest Rated Items</h3>
            ${this.renderURIList(this.topRatedURIs, "score")}
          </div>

          <div class="list-card">
            <h3>Most Controversial Items</h3>
            ${this.renderURIList(this.topVarianceURIs, "variance")}
          </div>
        </div>
      </section>
    `;
  }

  renderURIList(
    items: (StakedURIItem | RatedURIItem | VarianceURIItem)[],
    valueType: "stake" | "score" | "variance",
  ) {
    if (!items || items.length === 0) {
      return html`<p class="empty-list">No data available</p>`;
    }

    const elements = items
      .map((item) => {
        let uri: string;
        try {
          uri = this.blockchainService.ratings.getUriFromHash(item.uriHash);
        } catch (error) {
          console.warn(
            `Skipping dashboard item with hash ${item.uriHash}: URI not found`,
            error,
          );
          return null;
        }

        let valueDisplay;
        if (valueType === "stake") {
          const stakedItem = item as StakedURIItem;
          valueDisplay = html`
            <stake-time-display
              .stake=${stakedItem.totalStake}
              .aggregateMode=${true}
              .showDetails=${true}
            ></stake-time-display>
          `;
        } else {
          const value = this.formatValue(item, valueType);
          valueDisplay = html`<span class="item-value">${value}</span>`;
        }

        return html`
          <li>
            <a @click=${() => this.viewItem(uri ?? "", item.uriHash)}>
              <uri-display .uri=${uri}></uri-display>
            </a>
            ${valueDisplay}
          </li>
        `;
      })
      .filter((element) => element !== null);

    return html`
      <ul>
        ${elements}
      </ul>
    `;
  }

  formatValue(
    item: StakedURIItem | RatedURIItem | VarianceURIItem,
    valueType: "stake" | "score" | "variance",
  ): string | HTMLElement {
    switch (valueType) {
      case "stake": {
        const stakedItem = item as StakedURIItem;
        // For now, return the formatted ETH value as a string
        // We'll render the stake-time-display component separately
        return formatETH(stakedItem.totalStake);
      }
      case "score":
        return `${(item as RatedURIItem).averageScore.toFixed(1)} ★`;
      case "variance":
        // Display as stars like average score, but still sort by variance
        return `${(item as VarianceURIItem).averageScore.toFixed(1)} ★`;
      default:
        return "";
    }
  }

  viewItem(uri: string, uriHash: string) {
    this.dispatchEvent(
      new CustomEvent("view-uri", {
        detail: { uri, uriHash },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private listeners = new ListenerManager();

  connectedCallback() {
    super.connectedCallback();
    if (this.blockchainService.ready) this.loadDashboardData();

    this.listeners.add(this.blockchainService, "connected", () =>
      this.loadDashboardData(),
    );
    this.listeners.add(this.blockchainService, "disconnected", () =>
      this.unloadDashboardData(),
    );
    this.listeners.add(
      this.blockchainService.ratings,
      "historicalEventsLoaded",
      () => this.loadDashboardData(),
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.listeners.clear();
    this.unloadDashboardData();
  }

  unloadDashboardData() {
    this.tvl = 0n;
    this.topStakedURIs = [];
    this.topRatedURIs = [];
    this.topVarianceURIs = [];
    this.loading = false;
  }

  async loadDashboardData() {
    this.loading = true;

    try {
      const ratings = this.blockchainService.ratings.getRatings({
        deleted: false,
      });

      this.tvl = ratings.reduce((sum, rating) => sum + rating.stake, 0n);

      // Group ratings by URI hash
      const ratingsByURI = new Map<string, ExistingRating[]>();

      for (const rating of ratings) {
        if (!ratingsByURI.has(rating.uriHash)) {
          ratingsByURI.set(rating.uriHash, []);
        }
        ratingsByURI.get(rating.uriHash)?.push(rating);
      }

      // Process data for top lists
      interface URIStats {
        uriHash: string;
        decodedURI?: string;
        totalStake: bigint;
        averageScore: number;
        ratingCount: number;
        variance: number;
        ratings: ExistingRating[];
      }

      const uriStats: Map<string, URIStats> = new Map();

      // Calculate stats for each URI
      for (const [uriHash, ratings] of ratingsByURI.entries()) {
        if (ratings.length === 0) continue;

        const totalStake = ratings.reduce((sum, r) => sum + r.stake, BigInt(0));
        const ratingCount = ratings.length;

        // Calculate average score
        const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
        const averageScore = totalScore / ratingCount;

        // Calculate variance (standard deviation)
        // This uses the sample standard deviation formula:
        // 1. Calculate the mean (averageScore)
        // 2. For each data point, find squared difference from mean
        // 3. Sum these squared differences
        // 4. Divide by (n-1) for the sample variance
        // 5. Take the square root to get standard deviation
        const squaredDiffs = ratings.reduce(
          (sum, r) => sum + Math.pow(r.score - averageScore, 2),
          0,
        );
        const variance =
          ratingCount > 1 ? Math.sqrt(squaredDiffs / (ratingCount - 1)) : 0;

        let decodedURI: string;
        try {
          decodedURI = this.blockchainService.ratings.getUriFromHash(uriHash);
        } catch (error) {
          console.warn(
            `Skipping dashboard stats for hash ${uriHash}: URI not found`,
            error,
          );
          continue;
        }

        uriStats.set(uriHash, {
          uriHash,
          decodedURI,
          totalStake,
          averageScore,
          ratingCount,
          variance,
          ratings,
        });
      }

      // Sort for top staked URIs
      this.topStakedURIs = Array.from(uriStats.values())
        .sort((a, b) => (b.totalStake > a.totalStake ? 1 : -1))
        .slice(0, 5)
        .map(
          (stats): StakedURIItem => ({
            uriHash: stats.uriHash,
            decodedURI: stats.decodedURI,
            totalStake: stats.totalStake,
          }),
        );

      // Sort for top rated URIs
      this.topRatedURIs = Array.from(uriStats.values())
        .filter((stats) => stats.ratingCount >= 2) // Require at least 2 ratings
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5)
        .map(
          (stats): RatedURIItem => ({
            uriHash: stats.uriHash,
            decodedURI: stats.decodedURI,
            averageScore: stats.averageScore,
            ratingCount: stats.ratingCount,
          }),
        );

      // Sort for most controversial (highest variance)
      this.topVarianceURIs = Array.from(uriStats.values())
        .filter((stats) => stats.ratingCount >= 3) // Require at least 3 ratings for meaningful variance
        .sort((a, b) => b.variance - a.variance)
        .slice(0, 5)
        .map(
          (stats): VarianceURIItem => ({
            uriHash: stats.uriHash,
            decodedURI: stats.decodedURI,
            variance: stats.variance,
            ratingCount: stats.ratingCount,
            averageScore: stats.averageScore,
          }),
        );
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      this.loading = false;
    }
  }
}

interface StakedURIItem {
  uriHash: string;
  decodedURI?: string;
  totalStake: bigint;
}

interface RatedURIItem {
  uriHash: string;
  decodedURI?: string;
  averageScore: number;
  ratingCount: number;
}

interface VarianceURIItem {
  uriHash: string;
  decodedURI?: string;
  variance: number;
  ratingCount: number;
  averageScore: number;
}
