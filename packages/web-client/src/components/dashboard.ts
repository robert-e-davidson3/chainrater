import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  BlockchainService,
  type Rating,
} from "../services/blockchain.service.js";
import { formatETH } from "../utils/blockchain.utils.js";

@customElement("app-dashboard")
export class Dashboard extends LitElement {
  @property({ type: Object }) tvl = BigInt(0);
  @property({ type: Array }) topStakedURIs = [];
  @property({ type: Array }) topRatedURIs = [];
  @property({ type: Array }) topVarianceURIs = [];
  @property({ type: Boolean }) loading = true;

  private blockchainService = BlockchainService.getInstance();

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

  renderURIList(items, valueType) {
    if (!items || items.length === 0) {
      return html`<p class="empty-list">No data available</p>`;
    }

    return html`
      <ul>
        ${items.map(
          (item) => html`
            <li>
              <a href="#" @click=${() => this.viewItem(item.uri, item.uriHash)}>
                ${item.decodedURI || item.uriHash.substring(0, 10) + "..."}
              </a>
              <span class="item-value">
                ${this.formatValue(item, valueType)}
              </span>
            </li>
          `,
        )}
      </ul>
    `;
  }

  formatValue(item, valueType) {
    switch (valueType) {
      case "stake":
        return formatETH(item.totalStake);
      case "score":
        return `${item.averageScore.toFixed(1)} ★`;
      case "variance":
        return `${item.variance.toFixed(2)}`;
      default:
        return "";
    }
  }

  viewItem(uri, uriHash) {
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
    this.loadDashboardData();
  }

  async loadDashboardData() {
    this.loading = true;

    try {
      // Get all active ratings from the blockchain
      if (!this.blockchainService.isConnected()) {
        await this.blockchainService.connect().catch(() => {
          // Silently fail, as this component should work even without connection
          console.warn("Failed to connect blockchain service for dashboard");
        });
      }

      // If connection failed, fallback to mock data
      if (!this.blockchainService.isConnected()) {
        console.log("Using fallback mock data for dashboard");
        this.loadMockData();
        return;
      }

      // Get all ratings (not deleted)
      const allRatings = await this.blockchainService.getRatings({
        deleted: false,
      });

      if (allRatings.length === 0) {
        this.loadMockData();
        return;
      }

      // Calculate TVL (total value locked)
      this.tvl = allRatings.reduce(
        (sum, rating) => sum + rating.stake,
        BigInt(0),
      );

      // Group ratings by URI hash
      const ratingsByURI = new Map<string, Rating[]>();

      for (const rating of allRatings) {
        if (!ratingsByURI.has(rating.uriHash)) {
          ratingsByURI.set(rating.uriHash, []);
        }
        ratingsByURI.get(rating.uriHash)?.push(rating);
      }

      // Process data for top lists
      const uriStats: Map<
        string,
        {
          uriHash: string;
          decodedURI?: string;
          totalStake: bigint;
          averageScore: number;
          ratingCount: number;
          variance: number;
          ratings: Rating[];
        }
      > = new Map();

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
        .map((stats) => ({
          uriHash: stats.uriHash,
          decodedURI: stats.decodedURI,
          totalStake: stats.totalStake,
        }));

      // Sort for top rated URIs
      this.topRatedURIs = Array.from(uriStats.values())
        .filter((stats) => stats.ratingCount >= 2) // Require at least 2 ratings
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5)
        .map((stats) => ({
          uriHash: stats.uriHash,
          decodedURI: stats.decodedURI,
          averageScore: stats.averageScore,
          ratingCount: stats.ratingCount,
        }));

      // Sort for most controversial (highest variance)
      this.topVarianceURIs = Array.from(uriStats.values())
        .filter((stats) => stats.ratingCount >= 3) // Require at least 3 ratings for meaningful variance
        .sort((a, b) => b.variance - a.variance)
        .slice(0, 5)
        .map((stats) => ({
          uriHash: stats.uriHash,
          decodedURI: stats.decodedURI,
          variance: stats.variance,
          ratingCount: stats.ratingCount,
        }));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Fallback to mock data if something goes wrong
      this.loadMockData();
    } finally {
      this.loading = false;
    }
  }

  // Fallback method to load mock data when blockchain data is unavailable
  loadMockData() {
    this.tvl = BigInt(5000000000000000000n); // 5 ETH

    this.topStakedURIs = [
      {
        uriHash:
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        decodedURI: "restaurant://Goy's Vegan Hamburgers",
        totalStake: BigInt(1000000000000000000n), // 1 ETH
      },
      {
        uriHash:
          "0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef",
        decodedURI: "business://Ethereum Foundation",
        totalStake: BigInt(800000000000000000n), // 0.8 ETH
      },
      {
        uriHash:
          "0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef",
        decodedURI: "product://Tesla Model 3",
        totalStake: BigInt(600000000000000000n), // 0.6 ETH
      },
      {
        uriHash:
          "0x4567890123abcdef4567890123abcdef4567890123abcdef4567890123abcdef",
        decodedURI: "consumable://Jack Daniel's Whiskey",
        totalStake: BigInt(400000000000000000n), // 0.4 ETH
      },
      {
        uriHash:
          "0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef",
        decodedURI: "app://Discord",
        totalStake: BigInt(200000000000000000n), // 0.2 ETH
      },
    ];

    this.topRatedURIs = [
      {
        uriHash:
          "0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef",
        decodedURI: "product://Tesla Model 3",
        averageScore: 4.8,
        ratingCount: 12,
      },
      {
        uriHash:
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        decodedURI: "restaurant://Goy's Vegan Hamburgers",
        averageScore: 4.6,
        ratingCount: 8,
      },
      {
        uriHash:
          "0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef",
        decodedURI: "app://Discord",
        averageScore: 4.5,
        ratingCount: 15,
      },
      {
        uriHash:
          "0x6789012345abcdef6789012345abcdef6789012345abcdef6789012345abcdef",
        decodedURI: "movie://The Matrix",
        averageScore: 4.4,
        ratingCount: 10,
      },
      {
        uriHash:
          "0x7890123456abcdef7890123456abcdef7890123456abcdef7890123456abcdef",
        decodedURI: "music://Beethoven's 9th Symphony",
        averageScore: 4.3,
        ratingCount: 7,
      },
    ];

    this.topVarianceURIs = [
      {
        uriHash:
          "0x8901234567abcdef8901234567abcdef8901234567abcdef8901234567abcdef",
        decodedURI: "movie://Star Wars: The Last Jedi",
        variance: 1.8,
        ratingCount: 20,
      },
      {
        uriHash:
          "0x9012345678abcdef9012345678abcdef9012345678abcdef9012345678abcdef",
        decodedURI: "game://Cyberpunk 2077",
        variance: 1.5,
        ratingCount: 18,
      },
      {
        uriHash:
          "0x4567890123abcdef4567890123abcdef4567890123abcdef4567890123abcdef",
        decodedURI: "consumable://Jack Daniel's Whiskey",
        variance: 1.3,
        ratingCount: 25,
      },
      {
        uriHash:
          "0xa123456789abcdefa123456789abcdefa123456789abcdefa123456789abcdef",
        decodedURI: "book://The Bible",
        variance: 1.2,
        ratingCount: 30,
      },
      {
        uriHash:
          "0xb234567890abcdefb234567890abcdefb234567890abcdefb234567890abcdef",
        decodedURI: "person://Kanye West",
        variance: 1.1,
        ratingCount: 15,
      },
    ];

    this.loading = false;
  }
}
