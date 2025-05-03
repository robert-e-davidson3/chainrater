import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import { BlockchainService } from "../services/blockchain.service.js";
import { MissingContextError } from "../utils/blockchain.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";

import "./address-display.js";

@customElement("header-nav")
export class HeaderNav extends LitElement {
  @consume({ context: blockchainServiceContext })
  _blockchainService?: BlockchainService;

  get blockchainService() {
    if (!this._blockchainService)
      throw new MissingContextError("blockchainServiceContext");
    return this._blockchainService;
  }

  @property({ type: Boolean })
  isConnected = false;
  @property({ type: String }) activeTab = "dashboard";
  @property({ type: String }) accountAddress = "";
  @state() private isConnecting = false;

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
    }

    .branding {
      font-size: 1.5rem;
      font-weight: bold;
      color: #3498db;
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

    .wallet {
      display: flex;
      align-items: center;
      gap: 1rem;
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
      <header>
        <div class="branding">
          <a
            class="product-name"
            @click=${() => this.switchTab("dashboard")}
            >ChainRater</a>
        </div>

        <nav>
          <a
            class="${this.activeTab === "people" ? "active" : ""}"
            @click=${() => this.switchTab("people")}
            >People</a
          >
          <a
            class="${this.activeTab === "uris" ? "active" : ""}"
            @click=${() => this.switchTab("uris")}
            >URIs</a
          >
          <a
            class="${this.activeTab === "ratings" ? "active" : ""}"
            @click=${() => this.switchTab("ratings")}
            >Ratings</a
          >
          <a
            class="${this.activeTab === "rate" ? "active" : ""}"
            @click=${() => this.switchTab("rate")}
            >Rate an Item</a
          >
          <a
            class="${this.activeTab === "about" ? "active" : ""}"
            @click=${() => this.switchTab("about")}
            >About</a
          >
        </nav>

        <div class="wallet">${this.renderWalletButton()}</div>
      </header>
    `;
  }

  renderWalletButton() {
    if (this.isConnected) {
      return html`<address-display class="address" .address=${this.accountAddress}></address-display>
        <button @click=${this.disconnect}>Disconnect</button>`;
    } else if (this.isConnecting) {
      return html`<button disabled>Connecting...</button>`;
    } else {
      return html`<button @click=${this.connect}>Connect Wallet</button>`;
    }
  }

  async connect() {
    this.isConnecting = true;

    try {
      await this.blockchainService.connect();
      this.accountAddress = this.blockchainService.account ?? "";
      this.isConnected = true;

      // Dispatch connected event
      this.dispatchEvent(
        new CustomEvent("wallet-connected", {
          detail: { account: this.accountAddress },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert(
        "Failed to connect wallet. Please make sure MetaMask is installed and unlocked.",
      );
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect() {
    this.blockchainService.disconnect();
    this.isConnected = false;
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
  }
}
