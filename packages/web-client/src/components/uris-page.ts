import { LitElement, html, css, nothing } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  BlockchainService,
  type ExistingRating,
} from "../services/blockchain.service.js";
import { hashURI, MissingContextError } from "../utils/blockchain.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import { URIValidator } from "../utils/uri.utils.js";
import { ListenerManager } from "../utils/listener.utils.js";
import "./uri-ratings.js";
import "./stake-time-display.js";
import "./rating-form.js";

interface URIItem {
  uriHash: string;
  uri: string;
  ratingCount: number;
  totalStake: bigint;
  averageScore: number;
  variance: number;
  hasCurrentUserRated: boolean;
}

@customElement("uris-page")
export class UrisPage extends LitElement {
  @state() private uris: URIItem[] = [];
  @state() private searchInput = "";
  @state() private loading = true;
  @state() private showRatingForm = false;

  @property({ type: String }) selectedUriHash: string | null = null;
  @property({ type: String }) selectedUri: string | null = null;

  @consume({ context: blockchainServiceContext })
  _blockchainService?: BlockchainService;

  get blockchainService() {
    if (!this._blockchainService)
      throw new MissingContextError("blockchainServiceContext");
    return this._blockchainService;
  }

  private listeners = new ListenerManager();

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .uris-container {
      display: grid;
      gap: 2rem;
    }

    .search-container {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    input {
      flex-grow: 1;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    input:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }

    button {
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;
    }

    button:hover {
      background-color: #2980b9;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
      color: #999;
    }

    .uris-list {
      background-color: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    h2 {
      margin-top: 0;
      margin-bottom: 1.5rem;
      color: #333;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 0.75rem 1rem;
      border-bottom: 2px solid #eee;
      color: #666;
      font-weight: 600;
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid #eee;
    }

    tr:last-child td {
      border-bottom: none;
    }

    .uri-row {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .uri-row:hover {
      background-color: #f9f9f9;
    }

    .uri-row.current-user-rated {
      background-color: rgba(52, 152, 219, 0.1);
    }

    .uri-item {
      font-family: sans-serif;
      color: #3498db;
    }

    .uri-schema {
      color: #999;
      font-size: 0.9rem;
      margin-right: 0.5rem;
    }

    .empty-list {
      color: #999;
      text-align: center;
      padding: 2rem 0;
    }

    .back-button {
      margin-bottom: 1rem;
    }

    /* Star rating display */
    .avg-score {
      color: #f1c40f;
      font-weight: bold;
    }

    .uri-detail {
      background-color: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 1.5rem;
    }

    .uri-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .uri-detail-actions {
      display: flex;
      gap: 0.5rem;
    }

    .ratings-container {
      margin-top: 2rem;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    this.listeners.add(this.blockchainService, "connected", () => {
      this.loadURIs();
    });

    this.listeners.add(this.blockchainService, "disconnected", () => {
      this.unloadURIs();
    });

    this.loadURIs();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.listeners.clear();
  }

  render() {
    if (this.selectedUriHash && this.selectedUri) {
      return this.renderURIDetail();
    }

    const urisList = this.renderURIsList();
    const rateSearchButton = URIValidator.validate(this.searchInput)
      ? html`<button @click=${() => this.rateSearchUri()}>
          Rate This Item
        </button>`
      : nothing;

    return html`
      <section class="uris-container">
        <h2>URIs</h2>

        <div class="search-container">
          <input
            type="text"
            placeholder="Search by URI..."
            .value=${this.searchInput}
            @input=${this.handleSearchInputChange}
          />
          ${rateSearchButton}
        </div>

        ${this.loading
          ? html`<div class="loading">Loading URIs data...</div>`
          : urisList}
      </section>
    `;
  }

  private renderURIsList() {
    if (this.uris.length === 0) {
      return html`
        <div class="uris-list">
          <p class="empty-list">No URIs found</p>
        </div>
      `;
    }

    // Filter URIs based on search input
    const filteredURIs = this.searchInput
      ? this.uris.filter((item) =>
          item.uri.toLowerCase().includes(this.searchInput.toLowerCase()),
        )
      : this.uris;

    const rows = filteredURIs.map(
      (item) => html`
        <tr
          class="uri-row ${item.hasCurrentUserRated
            ? "current-user-rated"
            : ""}"
          @click=${() => this.viewURI(item.uriHash, item.uri)}
        >
          <td class="uri-item">
            <span class="uri-schema"
              >${URIValidator.getSchema(item.uri)}://</span
            >
            ${URIValidator.getDisplayName(item.uri)}
          </td>
          <td>${item.ratingCount}</td>
          <td>
            <span class="avg-score">${item.averageScore.toFixed(1)} ★</span>
          </td>
          <td>
            <stake-time-display
              .stake=${item.totalStake}
              .aggregateMode=${true}
              .showDetails=${true}
            ></stake-time-display>
          </td>
        </tr>
      `,
    );

    return html`
      <div class="uris-list">
        <table>
          <thead>
            <tr>
              <th>URI</th>
              <th>Ratings</th>
              <th>Avg Score</th>
              <th>Total Stake</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderURIDetail() {
    if (!this.selectedUriHash || !this.selectedUri) return null;

    if (this.showRatingForm) {
      return html`
        <div>
          <button
            class="back-button"
            @click=${() => (this.showRatingForm = false)}
          >
            ← Back to URI Details
          </button>

          <rating-form .uriInput=${this.selectedUri}></rating-form>
        </div>
      `;
    }

    const uriItem = this.uris.find((u) => u.uriHash === this.selectedUriHash);

    return html`
      <div>
        <button class="back-button" @click=${this.backToList}>
          ← Back to URIs
        </button>

        <div class="uri-detail">
          <div class="uri-detail-header">
            <h2>
              <span class="uri-schema"
                >${URIValidator.getSchema(this.selectedUri)}://</span
              >
              ${URIValidator.getDisplayName(this.selectedUri)}
            </h2>

            <div class="uri-detail-actions">
              <button @click=${this.rateURI}>Rate This Item</button>
            </div>
          </div>

          <div class="uri-stats">
            <p>
              <strong>Average Rating:</strong>
              <span class="avg-score"
                >${uriItem?.averageScore.toFixed(1) ?? 0} ★</span
              >
              from ${uriItem?.ratingCount ?? 0} ratings
            </p>
            <p>
              <strong>Total Stake:</strong>
              <stake-time-display
                .stake=${uriItem?.totalStake ?? 0n}
                .aggregateMode=${true}
                .showDetails=${true}
              ></stake-time-display>
            </p>
            ${uriItem?.variance
              ? html`
                  <p>
                    <strong>Variance:</strong> ${uriItem.variance.toFixed(2)}
                  </p>
                `
              : null}
          </div>
        </div>

        <div class="ratings-container">
          <uri-ratings .uriHash=${this.selectedUriHash}></uri-ratings>
        </div>
      </div>
    `;
  }

  private handleSearchInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchInput = input.value;
  }

  private viewURI(uriHash: string, uri: string) {
    this.selectedUriHash = uriHash;
    this.selectedUri = uri;
    this.showRatingForm = false;

    // Dispatch event to update URL or history if needed
    this.dispatchEvent(
      new CustomEvent("view-uri", {
        detail: { uri, uriHash },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private rateURI() {
    this.showRatingForm = true;
  }

  private rateSearchUri() {
    // Format the URI to ensure proper case for schema
    const formattedUri = URIValidator.formatURI(this.searchInput);

    // Calculate the URI hash
    const uriHash = hashURI(formattedUri);

    // Set as selected URI and show the rating form
    this.selectedUri = formattedUri;
    this.selectedUriHash = uriHash;
    this.showRatingForm = true;
  }

  private backToList() {
    this.selectedUriHash = null;
    this.selectedUri = null;
    this.showRatingForm = false;
  }

  private async loadURIs() {
    this.loading = true;

    try {
      const ratings = this.blockchainService.ratings.getRatings({
        deleted: false,
      });

      this.processURIs(ratings);
    } finally {
      this.loading = false;
    }
  }

  private unloadURIs() {
    this.uris = [];
    this.loading = false;
  }

  private processURIs(ratings: ExistingRating[]) {
    // Group ratings by URI hash
    const ratingsByURI = new Map<string, ExistingRating[]>();

    for (const rating of ratings) {
      if (!ratingsByURI.has(rating.uriHash)) {
        ratingsByURI.set(rating.uriHash, []);
      }
      ratingsByURI.get(rating.uriHash)?.push(rating);
    }

    const currentUserAddress = this.blockchainService.account?.toLowerCase();
    const uriItems: URIItem[] = [];

    // Calculate stats for each URI
    for (const [uriHash, uriRatings] of ratingsByURI.entries()) {
      if (uriRatings.length === 0) continue;

      const uri = this.blockchainService.ratings.getUriFromHash(uriHash);
      const totalStake = uriRatings.reduce(
        (sum, r) => sum + r.stake,
        BigInt(0),
      );
      const ratingCount = uriRatings.length;

      // Calculate average score
      const totalScore = uriRatings.reduce((sum, r) => sum + r.score, 0);
      const averageScore = totalScore / ratingCount;

      // Calculate variance
      const squaredDiffs = uriRatings.reduce(
        (sum, r) => sum + Math.pow(r.score - averageScore, 2),
        0,
      );
      const variance =
        ratingCount > 1 ? Math.sqrt(squaredDiffs / (ratingCount - 1)) : 0;

      // Check if current user has rated this URI
      const hasCurrentUserRated =
        !!currentUserAddress &&
        uriRatings.some((r) => r.rater.toLowerCase() === currentUserAddress);

      uriItems.push({
        uriHash,
        uri,
        ratingCount,
        totalStake,
        averageScore,
        variance,
        hasCurrentUserRated,
      });
    }

    // Sort: items rated by current user at top, then by rating count
    this.uris = uriItems.sort((a, b) => {
      if (a.hasCurrentUserRated && !b.hasCurrentUserRated) return -1;
      if (!a.hasCurrentUserRated && b.hasCurrentUserRated) return 1;
      return b.ratingCount - a.ratingCount;
    });
  }
}
