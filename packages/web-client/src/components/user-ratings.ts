import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BlockchainService } from '../services/blockchain.service';
import { formatETH, formatTimeRemaining } from '../utils/blockchain.utils';
import type { Rating } from '../types/rating.types';

@customElement('user-ratings')
export class UserRatings extends LitElement {
  @property({ type: Array }) userRatings: Rating[] = [];
  @property({ type: Object }) totalStake = BigInt(0);
  @property({ type: Boolean }) loading = true;
  
  private blockchainService = BlockchainService.getInstance();
  
  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .user-ratings {
      display: grid;
      gap: 2rem;
    }
    
    .stats-card {
      background-color: #fff;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .stake-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #3498db;
      margin: 1rem 0;
    }
    
    .ratings-list {
      background-color: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    h2, h3 {
      margin-top: 0;
      color: #333;
    }
    
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    li {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      display: grid;
      grid-template-columns: 3fr 1fr 1fr 1fr 1fr;
      gap: 1rem;
      align-items: center;
    }
    
    li:last-child {
      border-bottom: none;
    }
    
    .uri {
      font-weight: 500;
    }
    
    .rating-stars {
      color: #f1c40f;
      font-size: 1.25rem;
    }
    
    .stake, .expiration {
      text-align: center;
    }
    
    .actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
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
    }
    
    button:hover {
      background-color: #2980b9;
    }
    
    button.secondary {
      background-color: #e74c3c;
    }
    
    button.secondary:hover {
      background-color: #c0392b;
    }
    
    .empty-list {
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
    
    .trust-insights {
      background-color: #fff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      text-align: center;
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
    
    /* Column headers */
    .list-header {
      display: grid;
      grid-template-columns: 3fr 1fr 1fr 1fr 1fr;
      gap: 1rem;
      padding: 0.5rem 1rem;
      font-weight: bold;
      border-bottom: 2px solid #eee;
      color: #666;
    }
    
    .list-header div:not(:first-child) {
      text-align: center;
    }
    
    .list-header div:last-child {
      text-align: right;
    }
  `;
  
  render() {
    if (this.loading) {
      return html`
        <div class="loading">
          Loading your ratings data...
        </div>
      `;
    }
    
    return html`
      <section class="user-ratings">
        <div class="stats-card">
          <h2>Your Total Stake</h2>
          <div class="stake-value">${formatETH(this.totalStake)}</div>
        </div>
        
        <div class="ratings-list">
          <h3>Your Ratings</h3>
          ${this.renderRatingsList()}
        </div>
        
        <div class="trust-insights">
          <h3>Trust Network</h3>
          <p>Trust graph features coming soon!</p>
        </div>
      </section>
    `;
  }
  
  renderRatingsList() {
    if (!this.userRatings || this.userRatings.length === 0) {
      return html`<p class="empty-list">You haven't rated any items yet</p>`;
    }
    
    return html`
      <div class="list-header">
        <div>Item</div>
        <div>Rating</div>
        <div>Stake</div>
        <div>Expires In</div>
        <div>Actions</div>
      </div>
      <ul>
        ${this.userRatings.map(rating => html`
          <li class="${this.getExpirationClass(rating)}">
            <div class="uri">${rating.decodedURI || rating.uriHash.substring(0, 10) + '...'}</div>
            <div class="rating-stars">${this.renderStars(rating.score)}</div>
            <div class="stake">${formatETH(rating.stake)}</div>
            <div class="expiration">
              ${formatTimeRemaining(rating.expirationTime)}
            </div>
            <div class="actions">
              <button @click=${() => this.editRating(rating)}>Edit</button>
              <button class="secondary" @click=${() => this.removeRating(rating)}>Remove</button>
            </div>
          </li>
        `)}
      </ul>
    `;
  }
  
  renderStars(score) {
    return '★'.repeat(score) + '☆'.repeat(5 - score);
  }
  
  getExpirationClass(rating) {
    const now = Date.now();
    const expTime = rating.expirationTime.getTime();
    const timeLeft = expTime - now;
    
    if (timeLeft < 86400000) { // Less than 1 day
      return 'expiring-critical';
    } else if (timeLeft < 604800000) { // Less than 1 week
      return 'expiring-soon';
    } else if (timeLeft < 2592000000) { // Less than 1 month
      return 'expiring-warning';
    }
    return '';
  }
  
  editRating(rating) {
    // Dispatch event to open rating form in edit mode
    this.dispatchEvent(new CustomEvent('edit-rating', {
      detail: { rating },
      bubbles: true,
      composed: true
    }));
  }
  
  async removeRating(rating) {
    if (!confirm(`Are you sure you want to remove your rating for ${rating.decodedURI || rating.uriHash}? You will get back ${formatETH(rating.stake)}.`)) {
      return;
    }
    
    try {
      await this.blockchainService.removeRating(rating.decodedURI || rating.uriHash);
      this.dispatchEvent(new CustomEvent('rating-removed', {
        detail: { rating },
        bubbles: true,
        composed: true
      }));
      
      // Remove from local list
      this.userRatings = this.userRatings.filter(r => 
        r.uriHash !== rating.uriHash || r.rater !== rating.rater
      );
      
      // Update total stake
      this.totalStake -= rating.stake;
    } catch (error) {
      console.error('Failed to remove rating:', error);
      alert('Failed to remove rating. Please try again.');
    }
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.loadUserRatings();
  }
  
  async loadUserRatings() {
    this.loading = true;
    
    if (!this.blockchainService.isConnected()) {
      this.loading = false;
      return;
    }
    
    try {
      // In a real implementation, this would fetch actual data
      // from the blockchain or an indexer
      
      // For now, use mock data after a delay to simulate loading
      setTimeout(() => {
        const now = Date.now();
        
        this.userRatings = [
          {
            uriHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            decodedURI: 'restaurant://Goy\'s Vegan Hamburgers',
            score: 5,
            posted: Math.floor(now / 1000) - 86400 * 5, // 5 days ago
            stake: BigInt(200000000000000000n), // 0.2 ETH
            rater: this.blockchainService.account || '',
            expirationTime: new Date(now + 86400000 * 25) // Expires in 25 days
          },
          {
            uriHash: '0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef',
            decodedURI: 'product://Tesla Model 3',
            score: 4,
            posted: Math.floor(now / 1000) - 86400 * 10, // 10 days ago
            stake: BigInt(150000000000000000n), // 0.15 ETH
            rater: this.blockchainService.account || '',
            expirationTime: new Date(now + 86400000 * 5) // Expires in 5 days
          },
          {
            uriHash: '0x4567890123abcdef4567890123abcdef4567890123abcdef4567890123abcdef',
            decodedURI: 'consumable://Jack Daniel\'s Whiskey',
            score: 2,
            posted: Math.floor(now / 1000) - 86400 * 15, // 15 days ago
            stake: BigInt(100000000000000000n), // 0.1 ETH
            rater: this.blockchainService.account || '',
            expirationTime: new Date(now + 86400000 * 0.5) // Expires in 12 hours
          }
        ];
        
        // Calculate total stake
        this.totalStake = this.userRatings.reduce(
          (total, rating) => total + rating.stake, 
          BigInt(0)
        );
        
        this.loading = false;
      }, 1000);
    } catch (error) {
      console.error('Error loading user ratings:', error);
      this.loading = false;
    }
  }
}