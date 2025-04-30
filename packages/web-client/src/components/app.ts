import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { provide } from "@lit/context";
import "./header-nav.js";
import "./dashboard.js";
import "./user-ratings.js";
import "./rating-form.js";
import "./about-page.js";
import {
  BlockchainService,
  type Rating,
} from "../services/blockchain.service.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";

@customElement("chain-rater")
export class ChainRater extends LitElement {
  @provide({ context: blockchainServiceContext })
  blockchainService: BlockchainService = new BlockchainService();

  @property({ type: String })
  activeTab = "dashboard";
  @property({ type: Boolean }) isConnected = false;
  @property({ type: String }) account = "";

  @state() private ratingToEdit: Rating | null = null;
  @state() private prefilledURI = "";

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
        <div class="container">${this.renderActiveTab()}</div>
      </main>
    `;
  }

  renderActiveTab() {
    switch (this.activeTab) {
      case "dashboard":
        return html`<app-dashboard></app-dashboard>`;

      case "people":
        return html`<div>People tab coming soon</div>`;

      case "uris":
        return html`<div>URIs tab coming soon</div>`;

      case "ratings":
        return html`<div>Ratings tab coming soon</div>`;

      case "about":
        return html`<about-page></about-page>`;

      // Keep these for reference, but they're no longer accessible from the UI
      case "myratings":
        return html` <user-ratings .account=${this.account}></user-ratings> `;

      case "rate":
        return html`
          <rating-form
            .isEditing=${!!this.ratingToEdit}
            .existingRating=${this.ratingToEdit}
            .uriInput=${this.prefilledURI}
          ></rating-form>
        `;

      default:
        return html`<div>Unknown tab</div>`;
    }
  }

  handleTabChange(e: CustomEvent) {
    this.activeTab = e.detail.tab;

    // Reset editing state when switching away from rate tab
    if (this.activeTab !== "rate") {
      this.ratingToEdit = null;
      this.prefilledURI = "";
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
}
