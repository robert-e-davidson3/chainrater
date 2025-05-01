import { LitElement, html, css } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  type Rating,
  BlockchainService,
  Contract,
  ExistingRating,
} from "../services/blockchain.service.js";
import {
  formatETH,
  formatTimeRemaining,
  MissingContextError,
} from "../utils/blockchain.utils.js";
import { Address } from "viem";
import { ListenerManager } from "../utils/listener.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import "./stake-time-display.js";

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
  @property({ type: BigInt }) totalStake: bigint = BigInt(0);
  @property({ type: Boolean }) isCurrentUser: boolean = false;

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
      display: flex;
      justify-content: center;
    }
  `;

  render() {
    return html`
      <h2>${this.isCurrentUser ? 'Your' : 'Total'} Stake</h2>
      <div class="stake-value">
        <stake-time-display 
          class="inherit-color"
          .stake=${this.totalStake}
          .aggregateMode=${true}
          .showDetails=${true}
        ></stake-time-display>
      </div>
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
  @property({ type: Boolean }) isCurrentUser: boolean = false;

  static styles = css`
    :host {
      display: block;
    }

    li {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      display: grid;
      gap: 1rem;
      align-items: center;
    }

    li.with-actions {
      grid-template-columns: 3fr 1fr 1fr 1fr 1fr;
    }

    li.no-actions {
      grid-template-columns: 3fr 1fr 1fr 1fr;
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

  private updateTimerId: number | null = null;

  firstUpdated() {
    // Set up a timer to update expiration visualization
    this.updateTimerId = window.setInterval(() => {
      this.requestUpdate();
    }, 60000); // Update every minute
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.updateTimerId !== null) {
      clearInterval(this.updateTimerId);
      this.updateTimerId = null;
    }
  }

  render() {
    const listClass = `${this.getExpirationClass()} ${this.isCurrentUser ? 'with-actions' : 'no-actions'}`;
    const actions = this.isCurrentUser ? html`
      <div class="actions">
        <button @click=${this.handleEdit}>Edit</button>
        <button class="secondary" @click=${this.handleRemove}>Remove</button>
      </div>
    ` : null;

    return html`
      <li class="${listClass}">
        <div class="uri">
          ${this.uri || this.rating.uriHash.substring(0, 10) + "..."}
        </div>
        <div class="rating-stars">
          <rating-stars .score=${this.rating.score}></rating-stars>
        </div>
        <div class="stake">
          <stake-time-display 
            .stake=${this.rating.stake}
            .aggregateMode=${true}
            .showDetails=${true}
          ></stake-time-display>
        </div>
        <div class="expiration">
          ${formatTimeRemaining(this.expirationTime)}
        </div>
        ${actions}
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
  @consume({ context: blockchainServiceContext })
  _blockchainService?: BlockchainService;

  get blockchainService() {
    if (!this._blockchainService)
      throw new MissingContextError("blockchainServiceContext");
    return this._blockchainService;
  }

  @property({ type: Array }) ratings: ExistingRating[] = [];
  @property({ type: Boolean }) isCurrentUser: boolean = false;

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

  private listeners = new ListenerManager();

  connectedCallback() {
    super.connectedCallback();
    this.listeners.add(
      this.blockchainService,
      ["connected", "disconnected"],
      () => this.requestUpdate(),
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.listeners.clear();
  }

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

    if (!this.blockchainService.ready)
      return html`<p class="empty-list">Loading...</p>`;
    const stakePerSecond = this.blockchainService.ratings.stakePerSecond;

    const items = this.ratings.map((rating) => {
      const { uriHash, stake, posted } = rating;
      const uri = this.blockchainService.ratings.getUriFromHash(uriHash);
      const expirationTime = new Date(
        Number(1000n * (posted + stake / stakePerSecond)),
      );
      return html`
        <rating-item
          .rating=${rating}
          .uri=${uri}
          .expirationTime=${expirationTime}
          .isCurrentUser=${this.isCurrentUser}
          @edit-rating=${(e: CustomEvent) => this.handleEditRating(e)}
          @remove-rating=${(e: CustomEvent) => this.handleRemoveRating(e)}
        ></rating-item>
      `;
    });

    return html`
      <div class="list-header">
        <div>Item</div>
        <div>Rating</div>
        <div>Stake</div>
        <div>Expires In</div>
        <div>Actions</div>
      </div>
      <ul>
        ${items}
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
 * Displays any user's ratings and total stake.
 */
@customElement("user-ratings")
export class UserRatings extends LitElement {
  @property({ type: String }) account: string = "";
  @state() userRatings: ExistingRating[] = [];
  @state() totalStake = 0n;
  @state() loading = true;

  @consume({ context: blockchainServiceContext })
  _blockchainService?: BlockchainService;

  get blockchainService() {
    if (!this._blockchainService)
      throw new MissingContextError("blockchainServiceContext");
    return this._blockchainService;
  }

  private listeners = new ListenerManager();

  connectedCallback() {
    super.connectedCallback();

    this.listeners.add(this.blockchainService, "connected", () =>
      this.loadUserRatings(),
    );
    this.listeners.add(this.blockchainService, "disconnected", () =>
      this.clearUserRatings(),
    );

    this.listeners.add(
      this.blockchainService.ratings,
      [
        Contract.Ratings.RatingSubmittedEventName,
        Contract.Ratings.RatingRemovedEventName,
      ],
      (
        ratings: (
          | Contract.Ratings.RatingSubmittedEvent
          | Contract.Ratings.RatingRemovedEvent
        )[],
      ) => {
        if (
          ratings.some(({ rater }) => {
            return rater === this.account;
          })
        )
          this.loadUserRatings();
      },
    );

    this.loadUserRatings();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.listeners.clear();
  }

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
      return html` <div class="loading">Loading ratings data...</div> `;

    const isCurrentUser = this.account === this.blockchainService.account;

    return html`
      <section class="user-ratings">
        <total-stake-card 
          .totalStake=${this.totalStake}
          .isCurrentUser=${isCurrentUser}
        ></total-stake-card>
        <ratings-list
          .ratings=${this.userRatings}
          .isCurrentUser=${isCurrentUser}
          @edit-rating=${this.editRating}
          @remove-rating=${this.removeRating}
        ></ratings-list>
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
    try {
      const uri = this.blockchainService.ratings.getUriFromHash(rating.uriHash);

      if (
        !confirm(
          `Are you sure you want to remove your rating for ${uri}? You will get back ${formatETH(rating.stake)}.`,
        )
      ) {
        return;
      }

      await this.blockchainService.ratings.removeRating(uri, rating.rater);
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

  clearUserRatings() {
    this.userRatings = [];
    this.totalStake = 0n;
    this.loading = false;
  }

  async loadUserRatings() {
    this.loading = true;

    try {
      const ratings = this.blockchainService.ratings.getRatings({
        rater: this.account as Address,
        deleted: false,
      });

      this.totalStake = ratings.reduce(
        (total, rating) => total + rating.stake,
        0n,
      );
      this.userRatings = ratings;
    } catch (error) {
      this.clearUserRatings();
      throw new Error(`Failed to load user ratings: ${error}`);
    } finally {
      this.loading = false;
    }
  }
}
