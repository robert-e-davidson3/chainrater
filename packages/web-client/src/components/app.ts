import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { provide } from "@lit/context";
import "./header-nav.js";
import "./dashboard.js";
import "./user-ratings.js";
import "./rating-form.js";
import "./about-page.js";
import "./people-page.js";
import "./uris-page.js";
import "./ratings-page.js";
import {
  BlockchainService,
  type Rating,
} from "../services/blockchain.service.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import { Address } from "viem";

@customElement("chain-rater")
export class ChainRater extends LitElement {
  @provide({ context: blockchainServiceContext })
  blockchainService: BlockchainService = new BlockchainService();

  @property({ type: Boolean }) isConnected = false;
  @property({ type: String }) account = "";

  @state() private tabState: TabState = { type: "dashboard" };

  get activeTab(): string {
    return this.tabState.type;
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
      background-color: #f5f5f5;
      color: #333;
    }

    main {
      padding: 2rem 1rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
  `;

  render() {
    return html`
      <header-nav
        .activeTab=${this.activeTab}
        .isConnected=${this.isConnected}
        .accountAddress=${this.account}
        @tab-changed=${this.handleTabChange}
        @wallet-connected=${this.handleWalletConnected}
        @wallet-disconnected=${this.handleWalletDisconnected}
      ></header-nav>

      <main>
        <div
          class="container"
          @view-uri=${this.handleViewURI}
          @view-account=${this.handleViewAccount}
          @rate-item=${this.handleRateItem}
        >
          ${this.renderActiveTab()}
        </div>
      </main>
    `;
  }

  renderActiveTab() {
    switch (this.tabState.type) {
      case "dashboard":
        return html`<app-dashboard></app-dashboard>`;

      case "people":
        return html`<people-page
          .selectedAccount=${this.tabState.selectedAccount}
        ></people-page>`;

      case "uris":
        return html`<uris-page
          .selectedUriHash=${this.tabState.uriHash}
          .selectedUri=${this.tabState.uri}
        ></uris-page>`;

      case "ratings":
        return html`<ratings-page></ratings-page>`;

      case "about":
        return html`<about-page></about-page>`;

      // Keep these for reference, but they're no longer accessible from the UI
      case "myratings":
        return html`<user-ratings
          .account=${this.tabState.account}
        ></user-ratings>`;

      case "rate":
        return html`
          <rating-form
            .isEditing=${!!this.tabState.ratingToEdit}
            .existingRating=${this.tabState.ratingToEdit}
            .uriInput=${this.tabState.prefilledURI ?? ""}
          ></rating-form>
        `;

      default:
        return html`<div>Unknown tab</div>`;
    }
  }

  handleTabChange(e: CustomEvent) {
    const tab = e.detail.tab;

    switch (tab) {
      case "dashboard":
        this.tabState = { type: "dashboard" };
        break;
      case "people":
        this.tabState = { type: "people" };
        break;
      case "uris":
        this.tabState = { type: "uris" };
        break;
      case "ratings":
        this.tabState = { type: "ratings" };
        break;
      case "about":
        this.tabState = { type: "about" };
        break;
      case "myratings":
        this.tabState = { type: "myratings", account: this.account as Address };
        break;
      case "rate":
        this.tabState = { type: "rate" };
        break;
      default:
        this.tabState = { type: "dashboard" };
    }
  }

  handleWalletConnected(e: CustomEvent) {
    this.isConnected = true;
    this.account = e.detail.account;
  }

  handleWalletDisconnected() {
    this.isConnected = false;
    this.account = "";
  }

  handleViewURI(e: CustomEvent) {
    const { uri, uriHash } = e.detail;
    this.tabState = {
      type: "uris",
      uri,
      uriHash,
    };
  }

  handleViewAccount(e: CustomEvent) {
    const { account } = e.detail;
    this.tabState = {
      type: "people",
      selectedAccount: account as Address,
    };
  }

  handleRateItem() {
    this.tabState = {
      type: "rate",
    };
  }
}

type TabState =
  | { type: "dashboard" }
  | { type: "people"; selectedAccount?: Address }
  | { type: "uris"; uri?: string; uriHash?: string }
  | { type: "ratings" }
  | { type: "about" }
  | { type: "myratings"; account?: Address }
  | { type: "rate"; ratingToEdit?: Rating; prefilledURI?: string };
