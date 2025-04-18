import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BlockchainService } from '../services/blockchain.service';
import { shortenAddress } from '../utils/blockchain.utils';

@customElement('header-nav')
export class HeaderNav extends LitElement {
  @property({ type: Boolean }) isConnected = false;
  @property({ type: String }) activeTab = 'dashboard';
  @property({ type: String }) accountAddress = '';
  
  private blockchainService = BlockchainService.getInstance();
  
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
      content: '';
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
  `;
  
  render() {
    return html`
      <header>
        <div class="branding">
          <span class="product-name">ChainRater</span>
        </div>
        
        <nav>
          <a class="${this.activeTab === 'dashboard' ? 'active' : ''}" 
             @click=${() => this.switchTab('dashboard')}>Dashboard</a>
          
          ${this.isConnected ? html`
            <a class="${this.activeTab === 'myratings' ? 'active' : ''}" 
               @click=${() => this.switchTab('myratings')}>My Ratings</a>
          ` : ''}
          
          <a class="${this.activeTab === 'rate' ? 'active' : ''}" 
             @click=${() => this.switchTab('rate')}>Rate Item</a>
          
          <a class="${this.activeTab === 'search' ? 'active' : ''}" 
             @click=${() => this.switchTab('search')}>Search</a>
        </nav>
        
        <div class="wallet">
          ${this.isConnected 
            ? html`<span class="address">${shortenAddress(this.accountAddress)}</span>
                   <button @click=${this.disconnect}>Disconnect</button>` 
            : html`<button @click=${this.connect}>Connect Wallet</button>`}
        </div>
      </header>
    `;
  }
  
  async connect() {
    try {
      const account = await this.blockchainService.connect();
      this.isConnected = true;
      this.accountAddress = account;
      
      // Dispatch connected event
      this.dispatchEvent(new CustomEvent('wallet-connected', {
        detail: { account },
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please make sure MetaMask is installed and unlocked.');
    }
  }
  
  async disconnect() {
    await this.blockchainService.disconnect();
    this.isConnected = false;
    this.accountAddress = '';
    
    // Dispatch disconnected event
    this.dispatchEvent(new CustomEvent('wallet-disconnected', {
      bubbles: true,
      composed: true
    }));
  }
  
  switchTab(tab: string) {
    this.activeTab = tab;
    
    // Dispatch tab change event
    this.dispatchEvent(new CustomEvent('tab-changed', {
      detail: { tab },
      bubbles: true,
      composed: true
    }));
  }
}