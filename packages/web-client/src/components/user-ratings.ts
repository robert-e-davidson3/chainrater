import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  type Rating,
  BlockchainService,
  ExistingRating,
} from "../services/blockchain.service.js";
import { formatETH, formatTimeRemaining } from "../utils/blockchain.utils.js";

/**
 * Rating stars component
 */
@customElement("rating-stars")
export class RatingStars extends LitElement {
  @property({ type: Number }) score: number = 0;

  static styles = css`
    :host {
      color: #f1c40f;
      font-size: 1.25rem;
    }
  `;

  render() {
    return html`${this.renderStars()}`;
  }

  renderStars() {
    return "★".repeat(this.score) + "☆".repeat(5 - this.score);
  }
}

/**
 * Total stake card component
 */
@customElement("total-stake-card")
export class TotalStakeCard extends LitElement {
  @property({ type: Object }) totalStake: bigint = BigInt(0);

  static styles = css`
    :host {
      display: block;
      background-color: #fff;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    h2 {
      margin-top: 0;
      color: #333;
    }

    .stake-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #3498db;
      margin: 1rem 0;
    }
  `;

  render() {
    return html`
      <h2>Your Total Stake</h2>
      <div class="stake-value">${formatETH(this.totalStake)}</div>
    `;
  }
}

/**
 * Trust insights component
 */
@customElement("trust-insights")
export class TrustInsights extends LitElement {
  static styles = css`
    :host {
      display: block;
      background-color: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    h3 {
      margin-top: 0;
      color: #333;
    }
  `;

  render() {
    return html`
      <h3>Trust Network</h3>
      <p>Trust graph features coming soon!</p>
    `;
  }
}

/**
 * Rating item component
 */
@customElement("rating-item")
export class RatingItem extends LitElement {
  @property({ type: Object }) rating!: ExistingRating;
  @property({ type: String }) uri!: string;
  @property({ type: Date }) expirationTime!: Date;

  static styles = css`
    :host {
      display: block;
    }

    li {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      display: grid;
      grid-template-columns: 3fr 1fr 1fr 1fr 1fr;
      gap: 1rem;
      align-items: center;
    }

    li:last-child {
      border-bottom: none;
    }

    .uri {
      font-weight: 500;
    }

    .stake,
    .expiration {
      text-align: center;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    button {
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;
    }

    button:hover {
      background-color: #2980b9;
    }

    button.secondary {
      background-color: #e74c3c;
    }

    button.secondary:hover {
      background-color: #c0392b;
    }

    .expiring-critical {
      background-color: rgba(231, 76, 60, 0.1);
    }

    .expiring-soon {
      background-color: rgba(241, 196, 15, 0.1);
    }

    .expiring-warning {
      background-color: rgba(243, 156, 18, 0.05);
    }
  `;

  render() {
    return html`
      <li class="${this.getExpirationClass()}">
        <div class="uri">
          ${this.uri || this.rating.uriHash.substring(0, 10) + "..."}
        </div>
        <div class="rating-stars">
          <rating-stars .score=${this.rating.score}></rating-stars>
        </div>
        <div class="stake">${formatETH(this.rating.stake)}</div>
        <div class="expiration">
          ${formatTimeRemaining(this.expirationTime)}
        </div>
        <div class="actions">
          <button @click=${this.handleEdit}>Edit</button>
          <button class="secondary" @click=${this.handleRemove}>Remove</button>
        </div>
      </li>
    `;
  }

  handleEdit() {
    this.dispatchEvent(
      new CustomEvent("edit-rating", {
        detail: { rating: this.rating },
        bubbles: true,
        composed: true,
      }),
    );
  }

  handleRemove() {
    this.dispatchEvent(
      new CustomEvent("remove-rating", {
        detail: { rating: this.rating },
        bubbles: true,
        composed: true,
      }),
    );
  }

  getExpirationClass() {
    const now = Date.now();
    const expTime = this.expirationTime.getTime();
    const timeLeft = expTime - now;

    if (timeLeft < 86400000) {
      // Less than 1 day
      return "expiring-critical";
    } else if (timeLeft < 604800000) {
      // Less than 1 week
      return "expiring-soon";
    } else if (timeLeft < 2592000000) {
      // Less than 1 month
      return "expiring-warning";
    }
    return "";
  }
}

/**
 * Ratings list component
 */
@customElement("ratings-list")
export class RatingsList extends LitElement {
  @property({ type: Array }) ratings: Rating[] = [];

  static styles = css`
    :host {
      display: block;
      background-color: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    h3 {
      margin-top: 0;
      color: #333;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .empty-list {
      color: #999;
      text-align: center;
      padding: 2rem 0;
    }

    /* Column headers */
    .list-header {
      display: grid;
      grid-template-columns: 3fr 1fr 1fr 1fr 1fr;
      gap: 1rem;
      padding: 0.5rem 1rem;
      font-weight: bold;
      border-bottom: 2px solid #eee;
      color: #666;
    }

    .list-header div:not(:first-child) {
      text-align: center;
    }

    .list-header div:last-child {
      text-align: right;
    }
  `;

  render() {
    return html`
      <h3>Your Ratings</h3>
      ${this.renderList()}
    `;
  }

  renderList() {
    if (!this.ratings || this.ratings.length === 0) {
      return html`<p class="empty-list">You haven't rated any items yet</p>`;
    }

    return html`
      <div class="list-header">
        <div>Item</div>
        <div>Rating</div>
        <div>Stake</div>
        <div>Expires In</div>
        <div>Actions</div>
      </div>
      <ul>
        ${this.ratings.map(
          (rating) => html`
            <rating-item
              .rating=${rating}
              @edit-rating=${(e: CustomEvent) => this.handleEditRating(e)}
              @remove-rating=${(e: CustomEvent) => this.handleRemoveRating(e)}
            ></rating-item>
          `,
        )}
      </ul>
    `;
  }

  handleEditRating(e: CustomEvent) {
    // Forward the event to the parent
    this.dispatchEvent(
      new CustomEvent("edit-rating", {
        detail: e.detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  handleRemoveRating(e: CustomEvent) {
    // Forward the event to the parent
    this.dispatchEvent(
      new CustomEvent("remove-rating", {
        detail: e.detail,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

/**
 * Main user ratings component
 */
@customElement("user-ratings")
export class UserRatings extends LitElement {
  // TODO not only get userRatings from blockchainService but also listen for events
  //      filter events, so not every change to ratings causes a re-render
  //      for changes like "is expired", handle that in the LitElement for that rating
  //      for other changes to existing ratings, emit an event from here. let the ratings listen
  @property({ type: Array }) userRatings: Rating[] = [];
  @property({ type: Object }) totalStake = BigInt(0);
  @property({ type: Boolean }) loading = true;
  @property({ type: Object }) blockchainService: BlockchainService =
    BlockchainService.getInstance();

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .user-ratings {
      display: grid;
      gap: 2rem;
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
      return html` <div class="loading">Loading your ratings data...</div> `;

    return html`
      <section class="user-ratings">
        <total-stake-card .totalStake=${this.totalStake}></total-stake-card>
        <ratings-list
          .ratings=${this.userRatings}
          @edit-rating=${this.editRating}
          @remove-rating=${this.removeRating}
        ></ratings-list>
        <trust-insights></trust-insights>
      </section>
    `;
  }

  editRating(e: CustomEvent) {
    const { rating } = e.detail;
    // Dispatch event to open rating form in edit mode
    this.dispatchEvent(
      new CustomEvent("edit-rating", {
        detail: { rating },
        bubbles: true,
        composed: true,
      }),
    );
  }

  async removeRating(e: CustomEvent) {
    const { rating } = e.detail;

    if (
      !confirm(
        `Are you sure you want to remove your rating for ${rating.decodedURI || rating.uriHash}? You will get back ${formatETH(rating.stake)}.`,
      )
    ) {
      return;
    }

    try {
      await this.blockchainService.removeRating(
        rating.decodedURI || rating.uriHash,
      );
      this.dispatchEvent(
        new CustomEvent("rating-removed", {
          detail: { rating },
          bubbles: true,
          composed: true,
        }),
      );

      // Remove from local list
      this.userRatings = this.userRatings.filter(
        (r) => r.uriHash !== rating.uriHash || r.rater !== rating.rater,
      );

      // Update total stake
      this.totalStake -= rating.stake;
    } catch (error) {
      console.error("Failed to remove rating:", error);
      alert("Failed to remove rating. Please try again.");
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadUserRatings();
  }

  async loadUserRatings() {
    this.loading = true;

    if (!this.blockchainService.isConnected()) {
      this.loading = false;
      return;
    }

    try {
      // Get the user's address
      const rater = this.blockchainService.address;
      if (!rater) {
        this.loading = false;
        return;
      }

      // Fetch real data from the blockchain
      this.userRatings = await this.blockchainService.getRatings({
        rater,
      });

      // Calculate total stake
      this.totalStake = this.userRatings.reduce(
        (total, rating) => (rating.deleted ? total : total + rating.stake),
        BigInt(0),
      );

      this.loading = false;
    } catch (error) {
      console.error("Error loading user ratings:", error);
      this.loading = false;

      // If there's an error, show an empty list
      this.userRatings = [];
      this.totalStake = BigInt(0);
    }
  }
}
