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
      if (!this.blockchainService.isConnected() && this.searchType !== 'all') {
        throw new Error('Please connect your wallet first');
      }
      
      // Convert search input to actual search results from blockchain
      let results: SearchResult[] = [];
      
      // For "all" or "rate" searches, we search by the URI
      if (this.searchType === 'all' || this.searchType === 'rate' || this.searchType === 'guide') {
        try {
          // Get ratings for the specified URI
          const ratings = await this.blockchainService.getURIRatings(this.searchInput);
          
          if (ratings.length > 0) {
            // Calculate average score
            const totalScore = ratings.reduce((sum, rating) => sum + rating.score, 0);
            const averageScore = totalScore / ratings.length;
            
            // Create a search result
            results.push({
              uriHash: ratings[0].uriHash,
              decodedURI: this.searchInput,
              averageScore,
              ratingCount: ratings.length,
              topRatings: ratings.slice(0, 3) // Take top 3 ratings
            });
          }
        } catch (error) {
          console.warn('Error fetching URI ratings:', error);
        }
      }
      
      // For "cleanup" searches, we look for expired ratings
      if (this.searchType === 'cleanup') {
        try {
          // In a real implementation, we would have a more specialized query
          // to find expired ratings. Since we don't have that yet, we'll
          // check all ratings from all users to find expired ones.
          
          // This is inefficient and just for demonstration - in production
          // you would want to use an indexer or specialized query
          const now = Date.now() / 1000; // current time in seconds
          
          // Get all ratings for the current chain
          const allEvents = await this.blockchainService.publicClient!.getContractEvents({
            address: this.blockchainService.ratingsContract.address,
            abi: this.blockchainService.ratingsContract.abi,
            eventName: 'RatingSubmitted',
            fromBlock: 'earliest',
            toBlock: 'latest'
          });
          
          // Process each event
          for (const event of allEvents) {
            const { uri, rater } = event.args as any;
            
            try {
              // Get the full rating to check if it's expired
              const rating = await this.blockchainService.getRating(uri, rater);
              
              // Check if rating is expired
              if (rating && Number(rating.posted) + Number(rating.stake) < now) {
                results.push({
                  uriHash: uri,
                  decodedURI: rating.decodedURI,
                  averageScore: rating.score,
                  ratingCount: 1,
                  stake: rating.stake.toString(),
                  expirationTime: rating.expirationTime,
                  isExpired: true,
                  rater: rater
                });
              }
            } catch (error) {
              // Skip this rating if there's an error
              console.warn(`Error checking if rating is expired:`, error);
            }
          }
        } catch (error) {
          console.warn('Error fetching expired ratings:', error);
        }
      }
      
      // Filter and sort results based on search type
      this.processResults(results);
      
    } catch (error) {
      console.error('Search error:', error);
      this.errorMessage = error.message || 'Failed to search. Please try again.';
      this.searchResults = [];
    } finally {
      this.isSearching = false;
    }
  }
  
  processResults(results: SearchResult[]) {
    const searchLower = this.searchInput.toLowerCase();
    
    // Filter and sort based on search type
    switch (this.searchType) {
      case 'cleanup':
        // Only show expired ratings
        this.searchResults = results.filter(result => result.isExpired);
        break;
        
      case 'guide':
        // Sort by highest average score
        this.searchResults = results
          .filter(result => !result.isExpired)
          .sort((a, b) => b.averageScore - a.averageScore);
        break;
        
      case 'rate':
        // For finding URIs to rate, show matching URIs
        this.searchResults = results
          .filter(result => 
            result.decodedURI?.toLowerCase().includes(searchLower)
          )
          .slice(0, 3); // Limit to first few matches
        break;
        
      default: // 'all'
        // Show all results that match the search term
        this.searchResults = results.filter(result => 
          result.decodedURI?.toLowerCase().includes(searchLower)
        );
        break;
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
    
    // Find the rater address from the top ratings (it should be included in the result)
    const raterAddress = result.rater;
    
    if (!raterAddress) {
      this.errorMessage = 'Could not determine the rater address';
      return;
    }
    
    if (!confirm(`Clean up this expired rating and claim ${formatETH(BigInt(result.stake || '0'))}?`)) {
      return;
    }
    
    try {
      await this.blockchainService.cleanupRating(
        result.decodedURI || '',
        raterAddress
      );
      
      // Remove from list after successful cleanup
      this.searchResults = this.searchResults.filter(r => 
        r.uriHash !== result.uriHash || r.rater !== raterAddress
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