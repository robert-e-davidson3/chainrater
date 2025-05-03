import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  BlockchainService,
  type ExistingRating,
} from "../services/blockchain.service.js";
import {
  formatTimeRemaining,
  MissingContextError,
  shortenAddress,
} from "../utils/blockchain.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import { ListenerManager } from "../utils/listener.utils.js";
import { URIValidator } from "../utils/uri.utils.js";
import "./stake-time-display.js";
import "./address-display.js";

interface RatingItem extends ExistingRating {
  uri: string;
  expirationTime: Date;
  isCurrentUser: boolean;
}

@customElement("ratings-page")
export class RatingsPage extends LitElement {
  @state() private ratings: RatingItem[] = [];
  @state() private searchInput = "";
  @state() private loading = true;
  @state() private sortBy: 'recent' | 'stake' | 'score' = 'recent';
  @state() private expiryFilter: 'all' | 'expired' | 'active' = 'all';

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

    .ratings-container {
      display: grid;
      gap: 2rem;
    }

    .search-container {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      align-items: center;
    }
    
    .create-rating-button {
      background-color: #2ecc71;
      white-space: nowrap;
      min-width: 120px;
    }
    
    .create-rating-button:hover {
      background-color: #27ae60;
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

    .ratings-list {
      background-color: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    h2, h3 {
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
      cursor: pointer;
      user-select: none;
    }

    th:hover {
      color: #3498db;
    }

    th.active {
      color: #3498db;
    }

    th.active::after {
      content: " ↓";
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid #eee;
    }

    tr:last-child td {
      border-bottom: none;
    }

    .rating-row {
      transition: background-color 0.2s;
    }

    .rating-row:hover {
      background-color: #f9f9f9;
    }

    .rating-row.current-user {
      background-color: rgba(52, 152, 219, 0.1);
    }

    .uri-item, .rater-address {
      font-family: monospace;
      color: #3498db;
    }

    .uri-item a, .rater-address a {
      color: #3498db;
      text-decoration: none;
    }

    .uri-item a:hover, .rater-address a:hover {
      text-decoration: underline;
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

    /* Star rating display */
    .rating-score {
      color: #f1c40f;
      font-weight: bold;
    }

    .filter-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .sort-options, .filter-options {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    
    .filter-label {
      font-weight: 500;
      color: #666;
      margin-right: 0.5rem;
      display: flex;
      align-items: center;
    }
    
    .expiry-filter {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .sort-button, .filter-button {
      background-color: #f5f5f5;
      color: #666;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 0.5rem 1rem;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9rem;
    }

    .sort-button.active, .filter-button.active {
      background-color: #3498db;
      color: white;
      border-color: #3498db;
    }
    
    .filter-button.active[data-filter="expired"] {
      background-color: #e74c3c;
      border-color: #e74c3c;
    }
    
    .filter-button.active[data-filter="active"] {
      background-color: #2ecc71;
      border-color: #2ecc71;
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

  connectedCallback() {
    super.connectedCallback();
    
    this.listeners.add(this.blockchainService, "connected", () => {
      this.loadRatings();
    });
    
    this.listeners.add(this.blockchainService, "disconnected", () => {
      this.unloadRatings();
    });
    
    this.loadRatings();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.listeners.clear();
  }

  render() {
    const ratingsList = this.renderRatingsList();
    
    return html`
      <section class="ratings-container">
        <h2>Ratings</h2>
        
        <div class="search-container">
          <input
            type="text"
            placeholder="Search by URI or rater address..."
            .value=${this.searchInput}
            @input=${this.handleSearchInputChange}
          />
          <button 
            class="create-rating-button"
            @click=${this.handleCreateRating}
          >
            Create Rating
          </button>
        </div>

        <div class="filter-controls">
          <div class="sort-options">
            <button 
              class="sort-button ${this.sortBy === 'recent' ? 'active' : ''}"
              @click=${() => this.setSortBy('recent')}
            >
              Most Recent
            </button>
            <button 
              class="sort-button ${this.sortBy === 'stake' ? 'active' : ''}"
              @click=${() => this.setSortBy('stake')}
            >
              Highest Stake
            </button>
            <button 
              class="sort-button ${this.sortBy === 'score' ? 'active' : ''}"
              @click=${() => this.setSortBy('score')}
            >
              Top Scores
            </button>
          </div>
          
          <div class="expiry-filter">
            <span class="filter-label">Show:</span>
            <div class="filter-options">
              <button 
                class="filter-button ${this.expiryFilter === 'all' ? 'active' : ''}"
                data-filter="all"
                @click=${() => this.setExpiryFilter('all')}
              >
                All Ratings
              </button>
              <button 
                class="filter-button ${this.expiryFilter === 'active' ? 'active' : ''}"
                data-filter="active"
                @click=${() => this.setExpiryFilter('active')}
              >
                Active Only
              </button>
              <button 
                class="filter-button ${this.expiryFilter === 'expired' ? 'active' : ''}"
                data-filter="expired"
                @click=${() => this.setExpiryFilter('expired')}
              >
                Expired Only
              </button>
            </div>
          </div>
        </div>

        ${this.loading
          ? html`<div class="loading">Loading ratings data...</div>`
          : ratingsList}
      </section>
    `;
  }

  private renderRatingsList() {
    if (this.ratings.length === 0) {
      return html`
        <div class="ratings-list">
          <p class="empty-list">No ratings found</p>
        </div>
      `;
    }

    // Get filtered ratings based on search input and expiry filter
    const filteredRatings = this.getFilteredRatings();

    const rows = filteredRatings.map(rating => {
      const expirationClass = this.getExpirationClass(rating.expirationTime);
      
      const uriDisplay = rating.uri 
        ? html`
            <span class="uri-schema">${URIValidator.getSchema(rating.uri)}://</span>
            ${URIValidator.getDisplayName(rating.uri)}
          `
        : rating.uriHash.substring(0, 10) + "...";

      return html`
        <tr class="rating-row ${rating.isCurrentUser ? 'current-user' : ''} ${expirationClass}">
          <td class="uri-item">
            <a href="#" @click=${(e: Event) => this.handleUriClick(e, rating.uriHash, rating.uri)}>
              ${uriDisplay}
            </a>
          </td>
          <td class="rater-address">
              <address-display 
                .address=${rating.rater} 
                .displayName=${rating.isCurrentUser ? 'You' : ''}
              ></address-display>
          </td>
          <td>
            <span class="rating-score">${rating.score} ★</span>
          </td>
          <td>
            <stake-time-display 
              .stake=${rating.stake}
              .aggregateMode=${true}
              .showDetails=${true}
            ></stake-time-display>
          </td>
          <td>${formatTimeRemaining(rating.expirationTime)}</td>
        </tr>
      `;
    });

    return html`
      <div class="ratings-list">
        <table>
          <thead>
            <tr>
              <th @click=${() => this.handleSortClick('uri')}>URI</th>
              <th @click=${() => this.handleSortClick('rater')}>Rater</th>
              <th @click=${() => this.handleSortClick('score')}>Score</th>
              <th @click=${() => this.handleSortClick('stake')}>Stake</th>
              <th @click=${() => this.handleSortClick('expiration')}>Expires In</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  private handleSearchInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchInput = input.value;
  }

  private handleSortClick(column: string) {
    // For now, we'll just use the preset sort options
    // This could be expanded to sort by specific columns if needed
  }

  private setSortBy(sortType: 'recent' | 'stake' | 'score') {
    this.sortBy = sortType;
    this.sortRatings();
  }
  
  private setExpiryFilter(filter: 'all' | 'expired' | 'active') {
    this.expiryFilter = filter;
    this.requestUpdate();
  }

  private handleUriClick(e: Event, uriHash: string, uri: string) {
    e.preventDefault();
    
    // Dispatch view-uri event to navigate to URI details
    this.dispatchEvent(
      new CustomEvent("view-uri", {
        detail: { uri, uriHash },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleRaterClick(e: Event, raterAddress: string) {
    e.preventDefault();
    
    // Dispatch event to navigate to rater details
    this.dispatchEvent(
      new CustomEvent("view-account", {
        detail: { account: raterAddress },
        bubbles: true,
        composed: true,
      }),
    );
  }
  
  private handleCreateRating() {
    // Dispatch event to navigate to the rating form
    this.dispatchEvent(
      new CustomEvent("rate-item", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private getExpirationClass(expirationTime: Date): string {
    const now = Date.now();
    const expTime = expirationTime.getTime();
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
  
  private getFilteredRatings(): RatingItem[] {
    let filteredRatings = this.ratings;
    
    // Apply search filter
    if (this.searchInput) {
      filteredRatings = filteredRatings.filter(rating => 
        rating.uri.toLowerCase().includes(this.searchInput.toLowerCase()) ||
        rating.rater.toLowerCase().includes(this.searchInput.toLowerCase())
      );
    }
    
    // Apply expiry filter
    if (this.expiryFilter !== 'all') {
      const now = Date.now();
      filteredRatings = filteredRatings.filter(rating => {
        const isExpired = rating.expirationTime.getTime() <= now;
        return this.expiryFilter === 'expired' ? isExpired : !isExpired;
      });
    }
    
    return filteredRatings;
  }

  private async loadRatings() {
    this.loading = true;

    try {
      const ratings = this.blockchainService.ratings.getRatings({
        deleted: false,
      });
      
      this.processRatings(ratings);
    } finally {
      this.loading = false;
    }
  }

  private unloadRatings() {
    this.ratings = [];
    this.loading = false;
  }
  
  private sortRatings() {
    if (!this.ratings.length) return;
    
    switch (this.sortBy) {
      case 'recent':
        // Sort by posted time (most recent first)
        this.ratings = [...this.ratings].sort((a, b) => 
          Number(b.posted) - Number(a.posted)
        );
        break;
        
      case 'stake':
        // Sort by stake amount (highest first)
        this.ratings = [...this.ratings].sort((a, b) => 
          b.stake > a.stake ? 1 : b.stake < a.stake ? -1 : 0
        );
        break;
        
      case 'score':
        // Sort by score (highest first)
        this.ratings = [...this.ratings].sort((a, b) => 
          b.score - a.score
        );
        break;
    }
    
    // Always keep current user's ratings at the top within each sort group
    this.ratings = [...this.ratings].sort((a, b) => {
      if (a.isCurrentUser && !b.isCurrentUser) return -1;
      if (!a.isCurrentUser && b.isCurrentUser) return 1;
      return 0;
    });
  }

  private processRatings(ratings: ExistingRating[]) {
    const currentUserAddress = this.blockchainService.account?.toLowerCase();
    const stakePerSecond = this.blockchainService.ratings.stakePerSecond;
    
    const processedRatings: RatingItem[] = ratings.map(rating => {
      const uri = this.blockchainService.ratings.getUriFromHash(rating.uriHash);
      const expirationTime = new Date(
        Number(1000n * (rating.posted + rating.stake / stakePerSecond))
      );
      const isCurrentUser = !!currentUserAddress && 
        rating.rater.toLowerCase() === currentUserAddress;
        
      return {
        ...rating,
        uri,
        expirationTime,
        isCurrentUser
      };
    });
    
    this.ratings = processedRatings;
    this.sortRatings();
  }
}