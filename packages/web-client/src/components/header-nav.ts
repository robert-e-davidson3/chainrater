import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  BadChainError,
  BlockchainService,
  InvalidDeploymentsFileError,
  MissingWeb3Error,
} from "../services/blockchain.service.js";
import { MissingContextError } from "../utils/blockchain.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";

import "./address-display.js";
import { ListenerManager } from "../utils/listener.utils.js";

@customElement("header-nav")
export class HeaderNav extends LitElement {
  @consume({ context: blockchainServiceContext })
  _blockchainService?: BlockchainService;

  get blockchainService() {
    if (!this._blockchainService)
      throw new MissingContextError("blockchainServiceContext");
    return this._blockchainService;
  }

  @property({ type: String }) activeTab = "dashboard";
  @property({ type: String }) accountAddress = "";
  @state() private isMobileMenuOpen = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background-color: #ffffff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      position: relative;
    }

    .branding {
      font-size: 1.5rem;
      font-weight: bold;
      color: #3498db;
      z-index: 2;
    }

    .product-name {
      cursor: pointer;
      text-decoration: none;
      color: inherit;
    }

    nav {
      display: flex;
      gap: 1.5rem;
    }

    nav a {
      text-decoration: none;
      color: #333;
      cursor: pointer;
      position: relative;
      padding: 0.5rem 0;
      font-weight: 500;
    }

    nav a.active {
      color: #3498db;
    }

    nav a.active::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background-color: #3498db;
    }

    nav a.disabled {
      color: #95a5a6;
      cursor: not-allowed;
      opacity: 0.7;
    }

    nav a.disabled::after {
      background-color: #95a5a6;
    }

    .wallet {
      display: flex;
      align-items: center;
      gap: 1rem;
      z-index: 2;
    }

    .address {
      font-family: monospace;
      background-color: #f5f5f5;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      position: relative;
      cursor: pointer;
    }

    .address:hover::after {
      content: attr(data-full-address);
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
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

    button {
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    button:hover {
      background-color: #2980b9;
    }

    button:disabled {
      background-color: #95a5a6;
      cursor: not-allowed;
    }

    /* Hamburger menu button */
    .hamburger {
      display: none;
      flex-direction: column;
      justify-content: space-between;
      width: 30px;
      height: 21px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      z-index: 10;
    }

    .hamburger span {
      display: block;
      width: 30px;
      height: 3px;
      background-color: #333;
      border-radius: 3px;
      transition: all 0.3s ease;
    }

    /* Mobile menu */
    .mobile-menu {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: white;
      padding: 5rem 2rem 2rem;
      z-index: 1;
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    }

    .mobile-menu.open {
      transform: translateX(0);
    }

    .mobile-menu nav {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .mobile-menu nav a {
      font-size: 1.2rem;
      padding: 0.5rem 0;
    }

    .mobile-menu .wallet {
      flex-direction: column;
      align-items: flex-start;
    }

    .mobile-menu .wallet button {
      margin-top: 1rem;
      width: 100%;
    }

    /* Hamburger open state */
    .hamburger.open span:first-child {
      transform: rotate(45deg) translate(6px, 6px);
    }

    .hamburger.open span:nth-child(2) {
      opacity: 0;
    }

    .hamburger.open span:last-child {
      transform: rotate(-45deg) translate(6px, -6px);
    }

    /* Media queries for responsive design */
    /* When user is connected, we need to switch to hamburger mode earlier */
    :host([isconnected]) {
      @media (max-width: 950px) {
        header nav,
        header .wallet {
          display: none;
        }

        .hamburger {
          display: flex;
        }

        .mobile-menu {
          display: block;
        }

        header {
          padding: 1rem;
        }
      }
    }

    /* Standard breakpoint for disconnected state */
    @media (max-width: 750px) {
      header nav,
      header .wallet {
        display: none;
      }

      .hamburger {
        display: flex;
      }

      .mobile-menu {
        display: block;
      }

      header {
        padding: 1rem;
      }
    }
  `;

  render() {
    const rateClass =
      this.blockchainService.state !== "writeable"
        ? "disabled"
        : this.activeTab === "rate"
          ? "active"
          : nothing;
    const rateClick =
      this.blockchainService.state !== "writeable"
        ? () => {}
        : () => this.switchTab("rate");
    const rateTitle =
      this.blockchainService.state !== "writeable"
        ? "Please connect your wallet to rate items."
        : nothing;

    const nav = html`<nav>
      <a
        class="${this.activeTab === "people" ? "active" : nothing}"
        @click=${() => this.switchTab("people")}
        >People</a
      >
      <a
        class="${this.activeTab === "uris" ? "active" : nothing}"
        @click=${() => this.switchTab("uris")}
        >URIs</a
      >
      <a
        class="${this.activeTab === "ratings" ? "active" : nothing}"
        @click=${() => this.switchTab("ratings")}
        >Ratings</a
      >
      <a
        ?disabled=${this.blockchainService.state !== "writeable"}
        class="${rateClass}"
        title=${rateTitle}
        @click=${rateClick}
        >Rate an Item</a
      >
      <a
        class="${this.activeTab === "about" ? "active" : nothing}"
        @click=${() => this.switchTab("about")}
        >About</a
      >
    </nav>`;

    return html`
      <header>
        <div class="branding">
          <a
            class="product-name"
            @click=${(e: Event) => {
              e.preventDefault();
              this.switchTab("dashboard");
            }}
            >ChainRater</a
          >
        </div>

        ${nav}

        <div class="wallet">${this.renderWalletButton()}</div>

        <!-- Hamburger menu button -->
        <button
          class="hamburger ${this.isMobileMenuOpen ? "open" : ""}"
          @click=${this.toggleMobileMenu}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>

      <!-- Mobile menu -->
      <div class="mobile-menu ${this.isMobileMenuOpen ? "open" : ""}">
        ${nav}
        <div class="wallet">${this.renderWalletButton()}</div>
      </div>
    `;
  }

  renderWalletButton() {
    if (this.blockchainService.state === "writeable") {
      return html`<address-display
          class="address"
          .address=${this.accountAddress}
        ></address-display>
        <button @click=${this.disconnect}>Disconnect</button>`;
    } else if (this.blockchainService.state === "connecting") {
      return html`<button disabled>Connecting...</button>`;
    } else {
      return html`<button @click=${this.connect}>Connect Wallet</button>`;
    }
  }

  private listeners = new ListenerManager();

  connectedCallback() {
    super.connectedCallback();
    this.listeners.add(this.blockchainService, "stateChanged", () => {
      this.requestUpdate();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.listeners.clear();
  }

  async connect() {
    // Can't connect more than the default.
    if (!window.ethereum) {
      alert("Please install MetaMask or another web3 provider.");
      return;
    }

    try {
      await this.blockchainService.connect();
      this.accountAddress = this.blockchainService.account ?? "";

      this.dispatchEvent(
        new CustomEvent("wallet-connected", {
          detail: { account: this.accountAddress },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error: unknown) {
      let msg: string;

      if (error instanceof BadChainError)
        msg = `Failed to connect wallet due to unsupported chain: ${error.chainId} (only polygon mainnet is supported right now)`;
      else if (error instanceof InvalidDeploymentsFileError)
        msg = `Failed to connect wallet due to developer error - please file a github bug report! (see About page)`;
      else if (error instanceof MissingWeb3Error)
        msg = `Failed to connect wallet - please install MetaMask or another web3 provider.`;
      else {
        msg =
          "Failed to connect wallet. Please make sure MetaMask is installed and unlocked.";
        console.error(error);
      }

      console.error(msg);
      alert(msg);
    }
  }

  async disconnect() {
    this.blockchainService.disconnect();
    this.accountAddress = "";

    // Dispatch disconnected event
    this.dispatchEvent(
      new CustomEvent("wallet-disconnected", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    this.dispatchEvent(
      new CustomEvent("tab-changed", {
        detail: { tab },
        bubbles: true,
        composed: true,
      }),
    );
    // mobile cleanup (whether or not this is a mobile click)
    this.isMobileMenuOpen = false;
    document.body.style.overflow = "";
  }

  /**
   * Toggles the mobile menu open/closed
   */
  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;

    // If opening, prevent scrolling on the body
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }
}
