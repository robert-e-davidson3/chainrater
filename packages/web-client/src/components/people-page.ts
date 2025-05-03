import { LitElement, html, css } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  BlockchainService,
  type Rating,
} from "../services/blockchain.service.js";
import { formatETH, MissingContextError } from "../utils/blockchain.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import { Address } from "viem";
import { ListenerManager } from "../utils/listener.utils.js";
import "./user-ratings.js";
import "./stake-time-display.js";
import "./address-display.js";

interface AccountSummary {
  address: Address;
  ratingCount: number;
  totalStake: bigint;
  averageScore: number;
  isCurrentUser: boolean;
  ratings: {
    uri: string;
    uriHash: string;
    expirationTime: Date;
    isExpired: boolean;
  }[];
}

@customElement("people-page")
export class PeoplePage extends LitElement {
  @state() private accounts: AccountSummary[] = [];
  @state() private searchInput = "";
  @state() private loading = true;
  @state() private sortBy: 'ratings' | 'stake' = 'ratings';
  @state() private sortDirection: 'asc' | 'desc' = 'desc';
  @state() private expiryFilter: 'all' | 'expired' | 'active' = 'all';
  @state() private uriFilter = "";

  @property({ type: String }) selectedAccount: Address | null = null;

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

    .people-container {
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

    .accounts-list {
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

    .account-row {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .account-row:hover {
      background-color: #f9f9f9;
    }

    .account-row.current-user {
      background-color: rgba(52, 152, 219, 0.1);
    }

    .account-address {
      font-family: monospace;
      color: #3498db;
      position: relative;
      cursor: pointer;
    }

    .account-address:hover::after {
      content: attr(data-full-address);
      position: absolute;
      top: 100%;
      left: 0;
      background-color: #333;
      color: white;
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 0.5rem;
      white-space: nowrap;
      font-size: 0.8rem;
      z-index: 10;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }

    .empty-list {
      color: #999;
      text-align: center;
      padding: 2rem 0;
    }

    .back-button {
      margin-bottom: 1rem;
    }

    .account-header {
      background-color: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }

    .account-header h2 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: #333;
    }

    .account-info {
      font-size: 1.2rem;
      color: #3498db;
    }

    .account-info address-display {
      font-size: 1.2rem;
    }

    /* Star rating display */
    .avg-score {
      color: #f1c40f;
      font-weight: bold;
    }
    
    .filter-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 0.5rem;
    }
    
    .expiry-filter, .owner-filter, .sort-filter, .uri-filter {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    
    .uri-input {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      min-width: 200px;
    }
    
    .filter-label {
      font-weight: 500;
      color: #666;
      margin-right: 0.5rem;
      display: flex;
      align-items: center;
    }
    
    .direction-button {
      width: 32px;
      height: 32px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: bold;
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-right: 0.5rem;
    }
    
    .direction-button:hover {
      background-color: #2980b9;
    }
    
    .sort-options, .filter-options {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
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
  `;

  connectedCallback() {
    super.connectedCallback();

    this.listeners.add(this.blockchainService, "connected", () => {
      this.loadAccounts();
    });

    this.listeners.add(this.blockchainService, "disconnected", () => {
      this.unloadAccounts();
    });

    this.loadAccounts();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.listeners.clear();
  }

  render() {
    if (this.selectedAccount) return this.renderAccountDetail();

    const accountsList = this.renderAccountsList();

    return html`
      <section class="people-container">
        <h2>People</h2>

        <div class="search-container">
          <input
            type="text"
            placeholder="Search by address..."
            .value=${this.searchInput}
            @input=${this.handleSearchInputChange}
          />
        </div>
        
        <div class="filter-controls">
          <div class="sort-filter">
            <span class="filter-label">Sort:</span>
            <button 
              class="direction-button"
              @click=${this.toggleSortDirection}
              title="${this.sortDirection === 'desc' ? 'Descending' : 'Ascending'}"
            >
              ${this.sortDirection === 'desc' ? '↓' : '↑'}
            </button>
            <div class="sort-options">
              <button 
                class="sort-button ${this.sortBy === 'ratings' ? 'active' : ''}"
                @click=${() => this.setSortBy('ratings')}
              >
                ${this.sortDirection === 'desc' ? 'Most Ratings' : 'Fewest Ratings'}
              </button>
              <button 
                class="sort-button ${this.sortBy === 'stake' ? 'active' : ''}"
                @click=${() => this.setSortBy('stake')}
              >
                ${this.sortDirection === 'desc' ? 'Highest Stake' : 'Lowest Stake'}
              </button>
            </div>
          </div>
          
          <div class="filter-row">
            <div class="expiry-filter">
              <span class="filter-label">Status:</span>
              <div class="filter-options">
                <button 
                  class="filter-button ${this.expiryFilter === 'all' ? 'active' : ''}"
                  data-filter="all"
                  @click=${() => this.setExpiryFilter('all')}
                >
                  All Status
                </button>
                <button 
                  class="filter-button ${this.expiryFilter === 'active' ? 'active' : ''}"
                  data-filter="active"
                  @click=${() => this.setExpiryFilter('active')}
                >
                  With Active
                </button>
                <button 
                  class="filter-button ${this.expiryFilter === 'expired' ? 'active' : ''}"
                  data-filter="expired"
                  @click=${() => this.setExpiryFilter('expired')}
                >
                  With Expired
                </button>
              </div>
            </div>
            
            <div class="uri-filter">
              <span class="filter-label">URI:</span>
              <input
                type="text"
                placeholder="Filter by URI..."
                .value=${this.uriFilter}
                @input=${this.handleUriFilterChange}
                class="uri-input"
              />
            </div>
          </div>
        </div>

        ${this.loading
          ? html`<div class="loading">Loading accounts data...</div>`
          : accountsList}
      </section>
    `;
  }

  private renderAccountsList() {
    if (this.accounts.length === 0) {
      return html`
        <div class="accounts-list">
          <p class="empty-list">No accounts found</p>
        </div>
      `;
    }

    // Get filtered accounts based on search input, expiry filter, and URI filter
    const filteredAccounts = this.getFilteredAccounts();

    // Sort the filtered accounts
    const sortedAccounts = this.sortAccounts(filteredAccounts);
    
    const rows = sortedAccounts.map(
      (account) => html`
        <tr
          class="account-row ${account.isCurrentUser ? "current-user" : ""}"
          @click=${() => this.viewAccount(account.address)}
        >
          <td class="account-address">
            <address-display .address=${account.address}></address-display>
          </td>
          <td>${account.ratingCount}</td>
          <td>
            <span class="avg-score">${account.averageScore.toFixed(1)} ★</span>
          </td>
          <td>
            <stake-time-display
              .stake=${account.totalStake}
              .aggregateMode=${true}
              .showDetails=${true}
            ></stake-time-display>
          </td>
        </tr>
      `,
    );

    return html`
      <div class="accounts-list">
        <table>
          <thead>
            <tr>
              <th>Address</th>
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

  private renderAccountDetail() {
    const isCurrentUser =
      this.selectedAccount?.toLowerCase() ===
      this.blockchainService.account?.toLowerCase();

    return html`
      <div>
        <button class="back-button" @click=${this.backToList}>
          ← Back to People
        </button>

        <div class="account-header">
          <h2>${isCurrentUser ? "Your Account" : "Account Details"}</h2>
          <div class="account-info">
            <address-display
              .address=${this.selectedAccount || ""}
              .truncate=${false}
              .visualize=${true}
            ></address-display>
          </div>
        </div>

        <user-ratings .account=${this.selectedAccount}></user-ratings>
      </div>
    `;
  }

  private handleSearchInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchInput = input.value;
  }
  
  private handleUriFilterChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.uriFilter = input.value;
    this.requestUpdate();
  }
  
  private getFilteredAccounts(): AccountSummary[] {
    let filteredAccounts = this.accounts;
    
    // Apply address search filter
    if (this.searchInput) {
      filteredAccounts = filteredAccounts.filter(account => 
        account.address.toLowerCase().includes(this.searchInput.toLowerCase())
      );
    }
    
    // Apply URI filter
    if (this.uriFilter) {
      const uriLower = this.uriFilter.toLowerCase();
      filteredAccounts = filteredAccounts.filter(account => 
        account.ratings.some(rating => 
          rating.uri.toLowerCase().includes(uriLower)
        )
      );
    }
    
    // Apply expiry filter
    if (this.expiryFilter !== 'all') {
      filteredAccounts = filteredAccounts.filter(account => {
        const hasMatchingRatings = account.ratings.some(rating => 
          this.expiryFilter === 'expired' ? rating.isExpired : !rating.isExpired
        );
        return hasMatchingRatings;
      });
    }
    
    return filteredAccounts;
  }
  
  private sortAccounts(accounts: AccountSummary[]): AccountSummary[] {
    if (!accounts.length) return accounts;
    
    // Create a new array to hold the sorted accounts
    let sortedAccounts = [...accounts];
    
    // Define the comparison function based on sortBy and sortDirection
    let compare: (a: AccountSummary, b: AccountSummary) => number;
    
    switch (this.sortBy) {
      case 'ratings':
        // Sort by number of ratings
        compare = (a, b) => a.ratingCount - b.ratingCount;
        break;
        
      case 'stake':
        // Sort by total stake amount
        compare = (a, b) => {
          // Convert BigInt to string for comparison since we just need relative order
          return a.totalStake > b.totalStake ? 1 : a.totalStake < b.totalStake ? -1 : 0;
        };
        break;
        
      default:
        // Default to ratings count
        compare = (a, b) => a.ratingCount - b.ratingCount;
    }
    
    // Apply sort and handle direction
    return sortedAccounts.sort((a, b) => {
      // If ascending, use the comparison function as-is
      // If descending, negate the result to reverse the order
      return this.sortDirection === 'asc' ? compare(a, b) : -compare(a, b);
    });
  }
  
  private setSortBy(sortType: 'ratings' | 'stake') {
    this.sortBy = sortType;
    this.requestUpdate();
  }
  
  private toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';
    this.requestUpdate();
  }
  
  private setExpiryFilter(filter: 'all' | 'expired' | 'active') {
    this.expiryFilter = filter;
    this.requestUpdate();
  }

  private viewAccount(address: Address) {
    this.dispatchEvent(
      new CustomEvent("view-account", {
        detail: { account: address },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private backToList() {
    this.dispatchEvent(
      new CustomEvent("view-account", {
        detail: { account: null },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async loadAccounts() {
    this.loading = true;

    try {
      const raters = this.blockchainService.ratings.getRaters();
      this.processRaters(raters);
    } finally {
      this.loading = false;
    }
  }

  private unloadAccounts() {
    this.accounts = [];
    this.loading = false;
  }

  private processRaters(raters: Map<Address, Rating[]>) {
    const currentUserAddress = this.blockchainService.account?.toLowerCase();
    const stakePerSecond = this.blockchainService.ratings.stakePerSecond;
    const accountSummaries: AccountSummary[] = [];
    const now = Date.now();

    raters.forEach((ratings, address) => {
      const validRatings = ratings.filter((r) => !r.deleted);

      const totalStake = validRatings.reduce(
        (sum, rating) => sum + (rating as any).stake,
        0n,
      );

      const totalScore = validRatings.reduce(
        (sum, rating) => sum + (rating as any).score,
        0,
      );

      const averageScore =
        validRatings.length > 0 ? totalScore / validRatings.length : 0;

      const isCurrentUser = currentUserAddress === address.toLowerCase();
      
      // Process ratings to get URI and expiration info
      const processedRatings = validRatings.map(rating => {
        const { uriHash, stake, posted } = rating as any;
        const uri = this.blockchainService.ratings.getUriFromHash(uriHash);
        const expirationTime = new Date(
          Number(1000n * (posted + stake / stakePerSecond))
        );
        const isExpired = expirationTime.getTime() <= now;
        
        return {
          uri,
          uriHash,
          expirationTime,
          isExpired
        };
      });

      accountSummaries.push({
        address,
        ratingCount: validRatings.length,
        totalStake,
        averageScore,
        isCurrentUser,
        ratings: processedRatings
      });
    });

    // Use our sortAccounts method to sort initially
    this.accounts = this.sortAccounts(accountSummaries);
  }
}
