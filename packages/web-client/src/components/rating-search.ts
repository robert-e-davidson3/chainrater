import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  type SearchResult,
  BlockchainService,
  ExistingRating,
  calculateExpirationTime,
} from "../services/blockchain.service.js";
import {
  formatETH,
  formatTimeAgo,
  MissingContextError,
} from "../utils/blockchain.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";

const SEARCH_TYPES = ["all", "guide", "rate", "cleanup"];
type SearchType = (typeof SEARCH_TYPES)[number];

/**
 * Search type info component
 */
@customElement("search-type-info")
export class SearchTypeInfo extends LitElement {
  @property({ type: String }) searchType: SearchType = "all";

  static styles = css`
    :host {
      display: block;
    }

    .search-type-info {
      border-radius: 8px;
      padding: 1rem;
      background-color: #f8f9fa;
      border-left: 3px solid #3498db;
      margin-bottom: 1rem;
    }

    h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      font-size: 1rem;
      color: #333;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
    }
  `;

  render() {
    const descriptions: { [t: SearchType]: string } = {
      all: "Search across all ratings matching your query.",
      guide: "Find the highest rated items to guide your decisions.",
      rate: "Discover URIs for items you want to rate.",
      cleanup: "Find expired ratings to cleanup and earn rewards.",
    };

    return html`
      <div class="search-type-info">
        <h3>${this.getSearchTypeTitle()}</h3>
        <p>${descriptions[this.searchType]}</p>
      </div>
    `;
  }

  getSearchTypeTitle() {
    switch (this.searchType) {
      case "guide":
        return "Highest Rated Items";
      case "rate":
        return "Find URI for Rating";
      case "cleanup":
        return "Expired Ratings";
      default:
        return "All Ratings";
    }
  }
}

/**
 * Search controls component
 */
@customElement("search-controls")
export class SearchControls extends LitElement {
  @property({ type: String }) searchInput: string = "";
  @property({ type: String }) searchType: string = "all";
  @property({ type: Boolean }) isSearching: boolean = false;

  static styles = css`
    :host {
      display: block;
    }

    .search-controls {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    input[type="text"] {
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

    select {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      background-color: white;
      min-width: 180px;
    }

    button {
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;
      font-size: 1rem;
    }

    button:hover {
      background-color: #2980b9;
    }

    button:disabled {
      background-color: #95a5a6;
      cursor: not-allowed;
    }
  `;

  render() {
    return html`
      <div class="search-controls">
        <input
          type="text"
          placeholder="Search by name or keyword..."
          .value=${this.searchInput}
          @input=${this.handleInputChange}
          @keydown=${this.handleKeyDown}
        />

        <select .value=${this.searchType} @change=${this.handleTypeChange}>
          <option value="all">All Ratings</option>
          <option value="guide">Highest Rated</option>
          <option value="rate">Find URI for Rating</option>
          <option value="cleanup">Find Expired Ratings</option>
        </select>

        <button
          @click=${this.emitPerformSearchEvent}
          ?disabled=${this.isSearching}
        >
          ${this.isSearching ? "Searching..." : "Search"}
        </button>
      </div>
    `;
  }

  handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchInput = input.value;
    this.emitSearchInputChangeEvent(input.value);
  }

  handleTypeChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.searchType = select.value;
    this.emitSearchTypeChangeEvent(select.value);
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.emitPerformSearchEvent();
    }
  }

  emitPerformSearchEvent() {
    this.dispatchEvent(
      new CustomEvent("perform-search", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  emitSearchInputChangeEvent(value: string) {
    this.dispatchEvent(
      new CustomEvent("search-input-change", {
        detail: { value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  emitSearchTypeChangeEvent(value: string) {
    this.dispatchEvent(
      new CustomEvent("search-type-change", {
        detail: { value },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

/**
 * Error message component
 */
@customElement("error-display")
export class ErrorDisplay extends LitElement {
  @property({ type: String }) message: string = "";

  static styles = css`
    :host {
      display: block;
    }

    .error {
      color: #e74c3c;
      margin-top: 1rem;
      padding: 0.75rem;
      background-color: rgba(231, 76, 60, 0.1);
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `;

  render() {
    if (!this.message) {
      return html``;
    }

    return html` <div class="error"><span>⚠️</span> ${this.message}</div> `;
  }
}

/**
 * Regular search result item component
 */
@customElement("regular-result-item")
export class RegularResultItem extends LitElement {
  @property({ type: Object }) result!: SearchResult;

  static styles = css`
    :host {
      display: contents;
    }

    .uri {
      font-weight: 500;
      flex-basis: 40%;
    }

    .rating-summary {
      text-align: center;
      flex-basis: 30%;
    }

    .avg-score {
      font-weight: bold;
      font-size: 1.25rem;
      color: #f1c40f;
    }

    .rating-count {
      color: #666;
      font-size: 0.875rem;
      margin-left: 0.5rem;
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
      font-size: 0.875rem;
    }

    button:hover {
      background-color: #2980b9;
    }
  `;

  render() {
    return html`
      <div class="uri">
        ${this.result.decodedURI ||
        this.result.uriHash.substring(0, 10) + "..."}
      </div>
      <div class="rating-summary">
        <span class="avg-score">${this.result.averageScore.toFixed(1)}</span>
        <span class="rating-count">(${this.result.ratingCount} ratings)</span>
      </div>
      <button @click=${this.handleRate}>Rate This</button>
    `;
  }

  handleRate() {
    this.dispatchEvent(
      new CustomEvent("rate-item", {
        detail: {
          uri: this.result.decodedURI,
          uriHash: this.result.uriHash,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

/**
 * Cleanup result item component
 */
@customElement("cleanup-result-item")
export class CleanupResultItem extends LitElement {
  @property({ type: Object }) result!: SearchResult;

  static styles = css`
    :host {
      display: contents;
    }

    .uri {
      font-weight: 500;
      flex-basis: 40%;
    }

    .expiration {
      text-align: center;
      flex-basis: 30%;
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
      font-size: 0.875rem;
    }

    button:hover {
      background-color: #2980b9;
    }
  `;

  render() {
    return html`
      <div class="uri">
        ${this.result.decodedURI ||
        this.result.uriHash.substring(0, 10) + "..."}
      </div>
      <div class="expiration">
        Expired ${formatTimeAgo(this.result.expirationTime || new Date())}
      </div>
      <button @click=${this.handleCleanup}>
        Cleanup (${formatETH(BigInt(this.result.stake || 0))})
      </button>
    `;
  }

  handleCleanup() {
    this.dispatchEvent(
      new CustomEvent("cleanup-rating", {
        detail: { result: this.result },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

/**
 * Search results list component
 */
@customElement("search-results-list")
export class SearchResultsList extends LitElement {
  @property({ type: Array }) results: SearchResult[] = [];
  @property({ type: String }) searchType: string = "all";
  @property({ type: Boolean }) isSearching: boolean = false;
  @property({ type: String }) searchInput: string = "";

  static styles = css`
    :host {
      display: block;
      background-color: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
    }

    li:last-child {
      border-bottom: none;
    }

    .empty-results {
      color: #999;
      text-align: center;
      padding: 2rem 0;
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
    return html` ${this.renderContent()} `;
  }

  renderContent() {
    if (this.isSearching) {
      return html`<div class="loading">Searching...</div>`;
    }

    if (!this.results.length) {
      if (this.searchInput) {
        return html`<p class="empty-results">
          No results found for "${this.searchInput}"
        </p>`;
      }
      return html`<p class="empty-results">
        Enter a search term to find ratings
      </p>`;
    }

    return html`
      <ul>
        ${this.results.map(
          (result) => html`
            <li>
              ${this.searchType === "cleanup"
                ? html`
                    <cleanup-result-item
                      .result=${result}
                      @cleanup-rating=${(e: CustomEvent) =>
                        this.handleCleanupRating(e)}
                    ></cleanup-result-item>
                  `
                : html`
                    <regular-result-item
                      .result=${result}
                      @rate-item=${(e: CustomEvent) => this.handleRateItem(e)}
                    ></regular-result-item>
                  `}
            </li>
          `,
        )}
      </ul>
    `;
  }

  handleRateItem(e: CustomEvent) {
    this.dispatchEvent(
      new CustomEvent("rate-item", {
        detail: e.detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  handleCleanupRating(e: CustomEvent) {
    this.dispatchEvent(
      new CustomEvent("cleanup-rating", {
        detail: e.detail,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

/**
 * Main rating search component
 */
@customElement("rating-search")
export class RatingSearch extends LitElement {
  @property({ type: String }) searchInput = "";
  @property({ type: String }) searchType = "all";
  @property({ type: Array }) searchResults: SearchResult[] = [];

  @state() private isSearching = false;
  @state() private errorMessage = "";

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

    .search {
      display: grid;
      gap: 1.5rem;
    }

    h2 {
      margin-top: 0;
      color: #333;
    }
  `;

  render() {
    return html`
      <section class="search">
        <h2>Search Ratings</h2>

        <search-type-info .searchType=${this.searchType}></search-type-info>

        <search-controls
          .searchInput=${this.searchInput}
          .searchType=${this.searchType}
          .isSearching=${this.isSearching}
          @search-input-change=${this.handleSearchInputChange}
          @search-type-change=${this.handleSearchTypeChange}
          @perform-search=${this.performSearch}
        ></search-controls>

        <error-display .message=${this.errorMessage}></error-display>

        <search-results-list
          .results=${this.searchResults}
          .searchType=${this.searchType}
          .isSearching=${this.isSearching}
          .searchInput=${this.searchInput}
          @rate-item=${this.rateItem}
          @cleanup-rating=${this.handleCleanupRating}
        ></search-results-list>
      </section>
    `;
  }

  handleSearchInputChange(e: CustomEvent) {
    this.searchInput = e.detail.value;
  }

  handleSearchTypeChange(e: CustomEvent) {
    this.searchType = e.detail.value;
  }

  handleCleanupRating(e: CustomEvent) {
    this.cleanupRating(e.detail.result);
  }

  async performSearch() {
    if (!this.searchInput.trim() && this.searchType !== "cleanup") {
      this.errorMessage = "Please enter a search term";
      return;
    }

    this.isSearching = true;
    this.errorMessage = "";

    try {
      if (!this.blockchainService.ready && this.searchType !== "all") {
        throw new Error("Please connect your wallet first");
      }

      // Convert search input to actual search results from blockchain
      let results: SearchResult[] = [];

      // For "all" or "rate" searches, we search by the URI
      if (
        this.searchType === "all" ||
        this.searchType === "rate" ||
        this.searchType === "guide"
      ) {
        try {
          // Get ratings for the specified URI
          const ratings = this.blockchainService.ratings.getRatings({
            uri: this.searchInput,
            deleted: false,
          });

          if (ratings.length > 0) {
            // Calculate average score
            const totalScore = ratings.reduce(
              (sum, rating) => (rating.deleted ? sum : sum + rating.score),
              0,
            );
            const averageScore = totalScore / ratings.length;

            // Create a search result
            results.push({
              uriHash: ratings[0].uriHash,
              decodedURI: this.searchInput,
              averageScore,
              ratingCount: ratings.length,
              topRatings: ratings.slice(0, 3), // Take top 3 ratings
            });
          }
        } catch (error) {
          console.warn("Error fetching URI ratings:", error);
        }
      }

      // For "cleanup" searches, we look for expired ratings
      if (this.searchType === "cleanup") {
        try {
          // Get all expired ratings that haven't been deleted
          const expiredRatings = this.blockchainService.ratings.getRatings({
            expired: true,
            deleted: false,
          }) as ExistingRating[];

          // Convert each expired rating to a search result
          for (const rating of expiredRatings) {
            // Calculate expiration time
            const stakePerSecond =
              this.blockchainService.ratings.stakePerSecond;
            const uri = this.blockchainService.ratings.getUriFromHash(
              rating.uriHash,
            );
            const expirationTime = calculateExpirationTime(
              rating.posted,
              rating.stake,
              stakePerSecond,
            );

            results.push({
              uriHash: rating.uriHash,
              decodedURI: uri,
              averageScore: rating.score,
              ratingCount: 1,
              stake: rating.stake.toString(),
              expirationTime: expirationTime,
              isExpired: true,
              rater: rating.rater,
            });
          }
        } catch (error) {
          console.warn("Error fetching expired ratings:", error);
        }
      }

      // Filter and sort results based on search type
      this.processResults(results);
    } catch (error: any) {
      console.error("Search error:", error);
      this.errorMessage =
        error.message ?? "Failed to search. Please try again.";
      this.searchResults = [];
    } finally {
      this.isSearching = false;
    }
  }

  processResults(results: SearchResult[]) {
    const searchLower = this.searchInput.toLowerCase();

    // Filter and sort based on search type
    switch (this.searchType) {
      case "cleanup":
        // Only show expired ratings
        this.searchResults = results.filter((result) => result.isExpired);
        break;

      case "guide":
        // Sort by highest average score
        this.searchResults = results
          .filter((result) => !result.isExpired)
          .sort((a, b) => b.averageScore - a.averageScore);
        break;

      case "rate":
        // For finding URIs to rate, show matching URIs
        this.searchResults = results
          .filter((result) =>
            result.decodedURI?.toLowerCase().includes(searchLower),
          )
          .slice(0, 3); // Limit to first few matches
        break;

      default: // 'all'
        // Show all results that match the search term
        this.searchResults = results.filter((result) =>
          result.decodedURI?.toLowerCase().includes(searchLower),
        );
        break;
    }
  }

  rateItem(e: CustomEvent) {
    // Dispatch event to switch to rate tab with this URI
    this.dispatchEvent(
      new CustomEvent("rate-item", {
        detail: e.detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  async cleanupRating(result: SearchResult) {
    if (!this.blockchainService.ready) {
      this.errorMessage = "Please connect your wallet first";
      return;
    }

    // Find the rater address from the top ratings (it should be included in the result)
    const raterAddress = result.rater;

    if (!raterAddress) {
      this.errorMessage = "Could not determine the rater address";
      return;
    }

    if (
      !confirm(
        `Clean up this expired rating and claim ${formatETH(BigInt(result.stake || "0"))}?`,
      )
    ) {
      return;
    }

    try {
      // Use the URI from decodedURI or get it from the hash
      const uri =
        result.decodedURI ||
        this.blockchainService.ratings.getUriFromHash(result.uriHash);

      const rater = result.rater;
      if (!uri || !rater) {
        throw new Error("Must specify both URI and rater address");
      }

      // Assuming removeRating can be used to clean up expired ratings
      await this.blockchainService.ratings.removeRating(uri, rater);

      // Remove from list after successful cleanup
      this.searchResults = this.searchResults.filter(
        (r) => r.uriHash !== result.uriHash || r.rater !== raterAddress,
      );

      // Notify parent components
      this.dispatchEvent(
        new CustomEvent("rating-cleaned", {
          detail: { result },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error: any) {
      console.error("Failed to cleanup rating:", error);
      this.errorMessage = `Transaction failed: ${error.message || "Unknown error"}`;
    }
  }
}
