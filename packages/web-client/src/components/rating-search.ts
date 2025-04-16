import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BlockchainService } from '../services/blockchain.service';
import { formatETH, formatTimeAgo } from '../utils/blockchain.utils';
import type { SearchResult } from '../types/rating.types';

@customElement('rating-search')
export class RatingSearch extends LitElement {
  @property({ type: String }) searchInput = '';
  @property({ type: String }) searchType = 'all';
  @property({ type: Array }) searchResults: SearchResult[] = [];
  
  @state() private isSearching = false;
  @state() private errorMessage = '';
  
  private blockchainService = BlockchainService.getInstance();
  
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
    
    .search-results {
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
    
    .uri {
      font-weight: 500;
      flex-basis: 40%;
    }
    
    .rating-summary, .expiration {
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
    
    li button {
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
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
    
    /* Search type descriptions */
    .search-type-info {
      border-radius: 8px;
      padding: 1rem;
      background-color: #f8f9fa;
      border-left: 3px solid #3498db;
      margin-bottom: 1rem;
    }
    
    .search-type-info h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      font-size: 1rem;
      color: #333;
    }
    
    .search-type-info p {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
    }
  `;
  
  render() {
    return html`
      <section class="search">
        <h2>Search Ratings</h2>
        
        ${this.renderSearchTypeInfo()}
        
        <div class="search-controls">
          <input type="text" 
                placeholder="Search by name or keyword..." 
                .value=${this.searchInput} 
                @input=${e => this.searchInput = e.target.value}
                @keydown=${e => e.key === 'Enter' && this.performSearch()}>
          
          <select .value=${this.searchType} @change=${e => this.searchType = e.target.value}>
            <option value="all">All Ratings</option>
            <option value="guide">Highest Rated</option>
            <option value="rate">Find URI for Rating</option>
            <option value="cleanup">Find Expired Ratings</option>
          </select>
          
          <button @click=${this.performSearch} ?disabled=${this.isSearching}>
            ${this.isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        ${this.errorMessage ? html`
          <div class="error">
            <span>⚠️</span> ${this.errorMessage}
          </div>
        ` : ''}
        
        <div class="search-results">
          ${this.renderSearchResults()}
        </div>
      </section>
    `;
  }
  
  renderSearchTypeInfo() {
    const descriptions = {
      all: 'Search across all ratings matching your query.',
      guide: 'Find the highest rated items to guide your decisions.',
      rate: 'Discover URIs for items you want to rate.',
      cleanup: 'Find expired ratings to cleanup and earn rewards.'
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
      case 'guide': return 'Highest Rated Items';
      case 'rate': return 'Find URI for Rating';
      case 'cleanup': return 'Expired Ratings';
      default: return 'All Ratings';
    }
  }
  
  renderSearchResults() {
    if (this.isSearching) {
      return html`<div class="loading">Searching...</div>`;
    }
    
    if (!this.searchResults.length) {
      if (this.searchInput) {
        return html`<p class="empty-results">No results found for "${this.searchInput}"</p>`;
      }
      return html`<p class="empty-results">Enter a search term to find ratings</p>`;
    }
    
    return html`
      <ul>
        ${this.searchResults.map(result => html`
          <li>
            <div class="uri">${result.decodedURI || result.uriHash.substring(0, 10) + '...'}</div>
            
            ${this.searchType === 'cleanup' ? html`
              <div class="expiration">Expired ${formatTimeAgo(result.expirationTime || new Date())}</div>
              <button @click=${() => this.cleanupRating(result)}>
                Cleanup (${formatETH(BigInt(result.stake || 0))})
              </button>
            ` : html`
              <div class="rating-summary">
                <span class="avg-score">${result.averageScore.toFixed(1)}</span>
                <span class="rating-count">(${result.ratingCount} ratings)</span>
              </div>
              <button @click=${() => this.rateItem(result)}>Rate This</button>
            `}
          </li>
        `)}
      </ul>
    `;
  }
  
  async performSearch() {
    if (!this.searchInput.trim() && this.searchType !== 'cleanup') {
      this.errorMessage = 'Please enter a search term';
      return;
    }
    
    this.isSearching = true;
    this.errorMessage = '';
    
    try {
      // In a real implementation, this would query the blockchain or an indexer
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate different mock results based on search type
      this.searchResults = this.generateMockResults();
    } catch (error) {
      console.error('Search error:', error);
      this.errorMessage = 'Failed to search. Please try again.';
    } finally {
      this.isSearching = false;
    }
  }
  
  generateMockResults(): SearchResult[] {
    const now = Date.now();
    
    // Base mock data
    const allResults = [
      {
        uriHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        decodedURI: 'restaurant://Goy\'s Vegan Hamburgers',
        averageScore: 4.6,
        ratingCount: 8,
        stake: '200000000000000000', // 0.2 ETH
        expirationTime: new Date(now - 86400000 * 2), // Expired 2 days ago
        isExpired: true
      },
      {
        uriHash: '0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef',
        decodedURI: 'business://Ethereum Foundation',
        averageScore: 4.2,
        ratingCount: 15,
        stake: '150000000000000000', // 0.15 ETH
        expirationTime: new Date(now - 86400000 * 1), // Expired 1 day ago
        isExpired: true
      },
      {
        uriHash: '0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef',
        decodedURI: 'product://Tesla Model 3',
        averageScore: 4.8,
        ratingCount: 12,
        stake: '180000000000000000', // 0.18 ETH
        expirationTime: new Date(now + 86400000 * 10), // Expires in 10 days
        isExpired: false
      },
      {
        uriHash: '0x4567890123abcdef4567890123abcdef4567890123abcdef4567890123abcdef',
        decodedURI: 'consumable://Jack Daniel\'s Whiskey',
        averageScore: 3.7,
        ratingCount: 25,
        stake: '120000000000000000', // 0.12 ETH
        expirationTime: new Date(now - 86400000 * 3), // Expired 3 days ago
        isExpired: true
      },
      {
        uriHash: '0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef',
        decodedURI: 'app://Discord',
        averageScore: 4.5,
        ratingCount: 15,
        stake: '170000000000000000', // 0.17 ETH
        expirationTime: new Date(now + 86400000 * 5), // Expires in 5 days
        isExpired: false
      }
    ];
    
    // Filter based on search type and input
    const searchLower = this.searchInput.toLowerCase();
    
    switch (this.searchType) {
      case 'cleanup':
        return allResults.filter(result => result.isExpired);
        
      case 'guide':
        return allResults
          .filter(result => !result.isExpired && result.decodedURI.toLowerCase().includes(searchLower))
          .sort((a, b) => b.averageScore - a.averageScore);
        
      case 'rate':
        return allResults
          .filter(result => result.decodedURI.toLowerCase().includes(searchLower))
          .slice(0, 3); // Limit to first few matches
        
      default: // 'all'
        return allResults.filter(result => 
          result.decodedURI.toLowerCase().includes(searchLower)
        );
    }
  }
  
  rateItem(result: SearchResult) {
    // Dispatch event to switch to rate tab with this URI
    this.dispatchEvent(new CustomEvent('rate-item', {
      detail: { 
        uri: result.decodedURI,
        uriHash: result.uriHash 
      },
      bubbles: true,
      composed: true
    }));
  }
  
  async cleanupRating(result: SearchResult) {
    if (!this.blockchainService.isConnected()) {
      this.errorMessage = 'Please connect your wallet first';
      return;
    }
    
    if (!confirm(`Clean up this expired rating and claim ${formatETH(BigInt(result.stake || 0))}?`)) {
      return;
    }
    
    try {
      // Extract rater address from the result (in a real implementation)
      const raterAddress = '0x0000000000000000000000000000000000000000'; // Placeholder
      
      await this.blockchainService.cleanupRating(
        result.decodedURI || '',
        raterAddress
      );
      
      // Remove from list after successful cleanup
      this.searchResults = this.searchResults.filter(r => 
        r.uriHash !== result.uriHash
      );
      
      // Notify parent components
      this.dispatchEvent(new CustomEvent('rating-cleaned', {
        detail: { result },
        bubbles: true,
        composed: true
      }));
      
    } catch (error) {
      console.error('Failed to cleanup rating:', error);
      this.errorMessage = `Transaction failed: ${error.message || 'Unknown error'}`;
    }
  }
}