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

  constructor() {
    super();
    this.initFromUrl();
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("popstate", this.handlePopState.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.handlePopState.bind(this));
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

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
      color: #999;
    }
  `;

  render() {
    const main = this.blockchainService.ready
      ? html`
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
        `
      : html`<div class="loading">Please connect wallet</div>`;

    return html`
      <header-nav
        .activeTab=${this.activeTab}
        .isConnected=${this.isConnected}
        .accountAddress=${this.account}
        @tab-changed=${this.handleTabChange}
        @wallet-connected=${this.handleWalletConnected}
        @wallet-disconnected=${this.handleWalletDisconnected}
      ></header-nav>
      ${main}
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
    let newState: TabState;

    switch (tab) {
      case "dashboard":
        newState = { type: "dashboard" };
        break;
      case "people":
        newState = { type: "people" };
        break;
      case "uris":
        newState = { type: "uris" };
        break;
      case "ratings":
        newState = { type: "ratings" };
        break;
      case "about":
        newState = { type: "about" };
        break;
      case "myratings":
        newState = { type: "myratings", account: this.account as Address };
        break;
      case "rate":
        newState = { type: "rate" };
        break;
      default:
        newState = { type: "dashboard" };
    }

    this.updateTabState(newState);
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
    this.updateTabState({
      type: "uris",
      uri,
      uriHash,
    });
  }

  handleViewAccount(e: CustomEvent) {
    const { account } = e.detail;
    this.updateTabState({
      type: "people",
      selectedAccount: account as Address,
    });
  }

  handleRateItem() {
    this.updateTabState({
      type: "rate",
    });
  }

  /**
   * Updates tab state and pushes to browser history
   */
  private updateTabState(newState: TabState) {
    this.tabState = newState;
    const url = this.createUrlFromState(newState);
    window.history.pushState({ tabState: newState }, "", url);
  }

  /**
   * Handles browser back/forward navigation
   */
  private handlePopState(event: PopStateEvent) {
    if (event.state?.tabState) {
      // Restore state from history
      this.tabState = event.state.tabState;
    } else {
      // Default to dashboard if no state in history
      this.tabState = { type: "dashboard" };
    }
  }

  /**
   * Initializes app state from URL on first load
   */
  private initFromUrl() {
    // Get current pathname
    const path = window.location.pathname;

    // Try to parse state from URL
    const initialState = this.parseStateFromUrl(path);

    if (initialState) {
      // Set initial state without pushing to history
      this.tabState = initialState;

      // Replace current history entry with proper state object
      window.history.replaceState(
        { tabState: initialState },
        "",
        this.createUrlFromState(initialState),
      );
    } else {
      // If URL doesn't match any known pattern, push dashboard state
      window.history.replaceState(
        { tabState: this.tabState },
        "",
        this.createUrlFromState(this.tabState),
      );
    }
  }

  /**
   * Gets the base path for the application
   * Supports deployment in subdirectories
   */
  private getBasePath(): string {
    // This could be expanded to check for a BASE_PATH env variable or config
    // For now, just use root path
    return "";
  }

  /**
   * Creates a URL string from a tab state
   */
  private createUrlFromState(state: TabState): string {
    const basePath = this.getBasePath();

    switch (state.type) {
      case "dashboard":
        return `${basePath}/`;

      case "people":
        return state.selectedAccount
          ? `${basePath}/people/${encodeURIComponent(state.selectedAccount)}`
          : `${basePath}/people`;

      case "uris":
        return state.uriHash
          ? `${basePath}/uris/${encodeURIComponent(state.uriHash)}`
          : `${basePath}/uris`;

      case "ratings":
        return `${basePath}/ratings`;

      case "about":
        return `${basePath}/about`;

      case "rate":
        return `${basePath}/rate`;

      case "myratings":
        return `${basePath}/myratings`;

      default:
        return `${basePath}/`;
    }
  }

  /**
   * Parses a URL path into a tab state
   */
  private parseStateFromUrl(path: string): TabState | null {
    const basePath = this.getBasePath();

    // Remove base path if present
    let pathWithoutBase = path;
    if (basePath && path.startsWith(basePath)) {
      pathWithoutBase = path.slice(basePath.length);
    }

    // Remove trailing slash if present
    const normalizedPath =
      pathWithoutBase.endsWith("/") && pathWithoutBase !== "/"
        ? pathWithoutBase.slice(0, -1)
        : pathWithoutBase;

    // Split path into segments
    const segments = normalizedPath.split("/").filter(Boolean);

    // Root path maps to dashboard
    if (normalizedPath === "/" || segments.length === 0) {
      return { type: "dashboard" };
    }

    // First segment determines tab type
    const [tabType, param] = segments;

    switch (tabType) {
      case "dashboard":
        return { type: "dashboard" };

      case "people":
        return param
          ? {
              type: "people",
              selectedAccount: decodeURIComponent(param) as Address,
            }
          : { type: "people" };

      case "uris":
        if (param) {
          // When we have a uriHash param, we need to try to find the URI
          // This is a simplified approach - in a real implementation, you might
          // want to look up the URI from the uriHash by querying your data
          const decodedHash = decodeURIComponent(param);
          return {
            type: "uris",
            uriHash: decodedHash,
            // URI will be null initially, the component will need to look it up
          };
        }
        return { type: "uris" };

      case "ratings":
        return { type: "ratings" };

      case "about":
        return { type: "about" };

      case "rate":
        return { type: "rate" };

      case "myratings":
        return { type: "myratings", account: this.account as Address };

      default:
        // No matching route found
        return null;
    }
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
