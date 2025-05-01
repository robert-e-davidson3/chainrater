import { LitElement, html, css } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  BlockchainService,
  type Rating,
} from "../services/blockchain.service.js";
import {
  formatETH,
  shortenAddress,
  MissingContextError,
} from "../utils/blockchain.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import { Address } from "viem";
import { ListenerManager } from "../utils/listener.utils.js";
import "./user-ratings.js";
import "./stake-time-display.js";

interface AccountSummary {
  address: Address;
  ratingCount: number;
  totalStake: bigint;
  averageScore: number;
  isCurrentUser: boolean;
}

@customElement("people-page")
export class PeoplePage extends LitElement {
  @state() private accounts: AccountSummary[] = [];
  @state() private searchInput = "";
  @state() private loading = true;

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

    // Filter accounts based on search input
    const filteredAccounts = this.searchInput
      ? this.accounts.filter((account) =>
          account.address
            .toLowerCase()
            .includes(this.searchInput.toLowerCase()),
        )
      : this.accounts;

    const rows = filteredAccounts.map(
      (account) => html`
        <tr
          class="account-row ${account.isCurrentUser ? "current-user" : ""}"
          @click=${() => this.viewAccount(account.address)}
        >
          <td class="account-address">${shortenAddress(account.address)}</td>
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
    return html`
      <div>
        <button class="back-button" @click=${this.backToList}>
          ← Back to People
        </button>

        <user-ratings .account=${this.selectedAccount}></user-ratings>
      </div>
    `;
  }

  private handleSearchInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchInput = input.value;
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
    const accountSummaries: AccountSummary[] = [];

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

      accountSummaries.push({
        address,
        ratingCount: validRatings.length,
        totalStake,
        averageScore,
        isCurrentUser,
      });
    });

    // Sort: current user at top, then by rating count
    this.accounts = accountSummaries.sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      return b.ratingCount - a.ratingCount;
    });
  }
}
