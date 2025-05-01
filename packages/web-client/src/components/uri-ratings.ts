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
  shortenAddress,
} from "../utils/blockchain.utils.js";
import { Address } from "viem";
import { ListenerManager } from "../utils/listener.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import "./stake-time-display.js";
import { ratingItemStyles, ratingStarsStyles } from "./rating-styles.js";

/**
 * URI Ratings component
 * Displays all ratings for a specific URI.
 */
@customElement("uri-ratings")
export class UriRatings extends LitElement {
  @property({ type: String }) uriHash: string = "";
  @state() ratings: ExistingRating[] = [];
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
      this.loadRatings(),
    );
    this.listeners.add(this.blockchainService, "disconnected", () =>
      this.clearRatings(),
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
          ratings.some(({ uriHash }) => {
            return uriHash === this.uriHash;
          })
        )
          this.loadRatings();
      },
    );

    this.loadRatings();
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

    .uri-ratings {
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

    .ratings-list {
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
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 1rem;
      padding: 0.5rem 1rem;
      font-weight: bold;
      border-bottom: 2px solid #eee;
      color: #666;
    }

    .list-header div:not(:first-child) {
      text-align: center;
    }

    /* Rating item styles */
    li {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 1rem;
      align-items: center;
    }

    li:last-child {
      border-bottom: none;
    }

    .rater {
      font-family: monospace;
      font-weight: 500;
    }

    .rating-stars,
    .stake,
    .expiration {
      text-align: center;
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

    /* Star rating display */
    .stars {
      color: #f1c40f;
      font-size: 1.25rem;
    }
  `;

  render() {
    if (this.loading)
      return html` <div class="loading">Loading ratings data...</div> `;

    return html`
      <section class="uri-ratings">
        ${this.renderRatingsList()}
      </section>
    `;
  }

  renderRatingsList() {
    if (!this.ratings || this.ratings.length === 0) {
      return html`
        <div class="ratings-list">
          <h3>Ratings</h3>
          <p class="empty-list">No ratings found for this URI</p>
        </div>
      `;
    }

    if (!this.blockchainService.ready)
      return html`<div class="ratings-list"><p class="empty-list">Loading...</p></div>`;
    
    const stakePerSecond = this.blockchainService.ratings.stakePerSecond;
    const currentUser = this.blockchainService.account?.toLowerCase();

    const items = this.ratings.map((rating) => {
      const { stake, posted, score, rater } = rating;
      const expirationTime = new Date(
        Number(1000n * (posted + stake / stakePerSecond)),
      );
      
      // Determine expiration class
      const now = Date.now();
      const expTime = expirationTime.getTime();
      const timeLeft = expTime - now;
      
      let expirationClass = "";
      if (timeLeft < 86400000) {
        // Less than 1 day
        expirationClass = "expiring-critical";
      } else if (timeLeft < 604800000) {
        // Less than 1 week
        expirationClass = "expiring-soon";
      } else if (timeLeft < 2592000000) {
        // Less than 1 month
        expirationClass = "expiring-warning";
      }
      
      const isCurrentUser = currentUser === rater.toLowerCase();
      const raterDisplay = isCurrentUser 
        ? `${shortenAddress(rater)} (You)`
        : shortenAddress(rater);

      return html`
        <li class="${expirationClass}">
          <div class="rater">${raterDisplay}</div>
          <div class="rating-stars">
            <span class="stars">${"★".repeat(score)}${"☆".repeat(5 - score)}</span>
          </div>
          <div class="stake">
            <stake-time-display 
              .stake=${stake}
              .aggregateMode=${true}
              .showDetails=${true}
            ></stake-time-display>
          </div>
          <div class="expiration">
            ${formatTimeRemaining(expirationTime)}
          </div>
        </li>
      `;
    });

    return html`
      <div class="ratings-list">
        <h3>Ratings (${this.ratings.length})</h3>
        <div class="list-header">
          <div>Rater</div>
          <div>Rating</div>
          <div>Stake</div>
          <div>Expires In</div>
        </div>
        <ul>
          ${items}
        </ul>
      </div>
    `;
  }

  clearRatings() {
    this.ratings = [];
    this.totalStake = 0n;
    this.loading = false;
  }

  async loadRatings() {
    if (!this.uriHash) {
      this.clearRatings();
      return;
    }
    
    this.loading = true;

    try {
      const ratings = this.blockchainService.ratings.getRatings({
        uriHash: this.uriHash,
        deleted: false,
      });

      this.totalStake = ratings.reduce(
        (total, rating) => total + rating.stake,
        0n,
      );
      
      // Sort by stake (highest first)
      this.ratings = ratings.sort((a, b) => 
        b.stake > a.stake ? 1 : b.stake < a.stake ? -1 : 0
      );
    } finally {
      this.loading = false;
    }
  }
}