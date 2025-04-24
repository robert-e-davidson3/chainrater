import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  BlockchainService,
  type ExistingRating,
} from "../services/blockchain.service.js";
import { formatETH, shortenAddress } from "../utils/blockchain.utils.js";

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
}

@customElement("app-dashboard")
export class Dashboard extends LitElement {
  @property({ type: Object }) tvl = BigInt(0);
  @property({ type: Array }) topStakedURIs: StakedURIItem[] = [];
  @property({ type: Array }) topRatedURIs: RatedURIItem[] = [];
  @property({ type: Array }) topVarianceURIs: VarianceURIItem[] = [];
  @property({ type: Boolean }) loading = true;

  private blockchainService = BlockchainService.getInstance();
  private unsubscribeRatings: (() => void) | null = null;

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
    if (this.loading) {
      return html` <div class="loading">Loading dashboard data...</div> `;
    }

    return html`
      <section class="dashboard">
        <div class="stats-card">
          <h2>Total Value Locked</h2>
          <div class="tvl-value">${formatETH(this.tvl)}</div>
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

    const elements = items.map((item) => {
      const uri = this.blockchainService.URIFromHash(item.uriHash);
      const label = uri ?? shortenAddress(item.uriHash);
      const value = this.formatValue(item, valueType);
      return html`
        <li>
          <a href="#" @click=${() => this.viewItem(uri ?? "", item.uriHash)}>
            ${label}
          </a>
          <span class="item-value"> ${value} </span>
        </li>
      `;
    });
    return html`
      <ul>
        ${elements}
      </ul>
    `;
  }

  formatValue(
    item: StakedURIItem | RatedURIItem | VarianceURIItem,
    valueType: "stake" | "score" | "variance",
  ): string {
    switch (valueType) {
      case "stake":
        return formatETH((item as StakedURIItem).totalStake);
      case "score":
        return `${(item as RatedURIItem).averageScore.toFixed(1)} ★`;
      case "variance":
        return `${(item as VarianceURIItem).variance.toFixed(2)}`;
      default:
        return "";
    }
  }

  viewItem(uri: string, uriHash: string) {
    // Dispatch event to switch to rate tab with this URI
    this.dispatchEvent(
      new CustomEvent("view-uri", {
        detail: { uri, uriHash },
        bubbles: true,
        composed: true,
      }),
    );
  }

  connectedCallback() {
    super.connectedCallback();
    // Subscribe to rating changes
    this.unsubscribeRatings = this.blockchainService.onRatingsChanged(() => {
      this.loadDashboardData();
    });
    this.loadDashboardData();
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up subscription
    if (this.unsubscribeRatings) {
      this.unsubscribeRatings();
      this.unsubscribeRatings = null;
    }
  }

  async loadDashboardData() {
    this.loading = true;

    try {
      if (!this.blockchainService.isConnected())
        await this.blockchainService.connect();

      const allRatings = (await this.blockchainService.getRatings({
        deleted: false,
      })) as ExistingRating[];

      this.tvl = allRatings.reduce(
        (sum, rating) => sum + rating.stake,
        BigInt(0),
      );

      // Group ratings by URI hash
      const ratingsByURI = new Map<string, ExistingRating[]>();

      for (const rating of allRatings) {
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

        // Calculate variance
        const squaredDiffs = ratings.reduce(
          (sum, r) => sum + Math.pow(r.score - averageScore, 2),
          0,
        );
        const variance =
          ratingCount > 1 ? Math.sqrt(squaredDiffs / (ratingCount - 1)) : 0;

        uriStats.set(uriHash, {
          uriHash,
          decodedURI: ratings[0].decodedURI,
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
          }),
        );
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      this.loading = false;
    }
  }
}
