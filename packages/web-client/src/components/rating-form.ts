import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ethers } from 'ethers';
import { BlockchainService } from '../services/blockchain.service';
import { formatETH } from '../utils/blockchain.utils';
import { URIValidator } from '../utils/uri.utils';
import type { Rating } from '../types/rating.types';

@customElement('rating-form')
export class RatingForm extends LitElement {
  @property({ type: String }) uriInput = '';
  @property({ type: Number }) scoreInput = 3;
  @property({ type: String }) stakeInput = '';
  @property({ type: Object }) minStake = BigInt(0);
  @property({ type: Boolean }) isEditing = false;
  @property({ type: Object }) existingRating: Rating | null = null;
  
  @state() private isSubmitting = false;
  @state() private errorMessage = '';
  @state() private showURIExamples = false;
  
  private blockchainService = BlockchainService.getInstance();
  
  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .rating-form {
      background-color: #fff;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    h2 {
      margin-top: 0;
      color: #333;
      margin-bottom: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }
    
    input[type="text"],
    input[type="number"] {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }
    
    input:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
    
    .helper-text {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #666;
    }
    
    .star-selector {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    
    .star {
      font-size: 2rem;
      cursor: pointer;
      color: #ccc;
      transition: color 0.2s;
    }
    
    .star.active {
      color: #f1c40f;
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
      margin-right: 0.5rem;
    }
    
    button:hover {
      background-color: #2980b9;
    }
    
    button:disabled {
      background-color: #95a5a6;
      cursor: not-allowed;
    }
    
    button.secondary {
      background-color: #95a5a6;
    }
    
    button.secondary:hover {
      background-color: #7f8c8d;
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
    
    .uri-examples {
      margin-top: 1rem;
      background-color: #f9f9f9;
      padding: 1rem;
      border-radius: 4px;
      border-left: 3px solid #3498db;
    }
    
    .uri-examples h4 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      color: #333;
    }
    
    .uri-examples ul {
      margin: 0;
      padding-left: 1.5rem;
    }
    
    .uri-examples li {
      margin-bottom: 0.25rem;
    }
    
    .view-examples {
      background: none;
      border: none;
      color: #3498db;
      padding: 0;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: underline;
      margin: 0;
    }
    
    .view-examples:hover {
      color: #2980b9;
      background: none;
    }
  `;
  
  render() {
    return html`
      <section class="rating-form">
        <h2>${this.isEditing ? 'Update Rating' : 'Rate an Item'}</h2>
        
        <div class="form-group">
          <label for="uri">URI</label>
          <input id="uri" type="text" .value=${this.uriInput} 
            @input=${e => this.uriInput = e.target.value}
            ?disabled=${this.isEditing}
            placeholder="e.g., restaurant://Name, product://Brand">
          <div class="helper-text">
            Enter a URI that identifies what you're rating
            <button class="view-examples" @click=${this.toggleURIExamples}>
              ${this.showURIExamples ? 'Hide examples' : 'View examples'}
            </button>
          </div>
          
          ${this.showURIExamples ? html`
            <div class="uri-examples">
              <h4>URI Format Examples:</h4>
              <ul>
                <li><strong>restaurant://</strong>Name of Restaurant</li>
                <li><strong>product://</strong>Product Name</li>
                <li><strong>service://</strong>Service Provider</li>
                <li><strong>consumable://</strong>Food or Beverage</li>
                <li><strong>movie://</strong>Movie Title</li>
                <li><strong>book://</strong>Book Title</li>
                <li><strong>person://</strong>Person's Name</li>
                <li><strong>business://</strong>Business Name</li>
                <li><strong>app://</strong>Application Name</li>
                <li><strong>game://</strong>Game Title</li>
              </ul>
            </div>
          ` : ''}
        </div>
        
        <div class="form-group">
          <label>Rating</label>
          <div class="star-selector">
            ${this.renderStarSelector()}
          </div>
        </div>
        
        <div class="form-group">
          <label for="stake">Stake Amount (ETH)</label>
          <input id="stake" type="number" min="0" step="0.001" .value=${this.stakeInput}
            @input=${e => this.stakeInput = e.target.value}>
          <div class="helper-text">
            Minimum stake: ${formatETH(this.minStake || BigInt(16000000 * 604800))}.
            Larger stakes last longer and have more weight.
          </div>
        </div>
        
        ${this.errorMessage ? html`
          <div class="error">
            <span>⚠️</span> ${this.errorMessage}
          </div>
        ` : ''}
        
        <button @click=${this.submitRating} ?disabled=${this.isSubmitting}>
          ${this.isSubmitting ? 'Submitting...' : (this.isEditing ? 'Update Rating' : 'Submit Rating')}
        </button>
        
        ${this.isEditing ? html`
          <button class="secondary" @click=${this.cancelEdit}>Cancel</button>
        ` : ''}
      </section>
    `;
  }
  
  renderStarSelector() {
    return html`
      ${[1, 2, 3, 4, 5].map(score => html`
        <span class="star ${this.scoreInput >= score ? 'active' : ''}"
              @click=${() => this.scoreInput = score}>
          ★
        </span>
      `)}
    `;
  }
  
  toggleURIExamples() {
    this.showURIExamples = !this.showURIExamples;
  }
  
  async connectedCallback() {
    super.connectedCallback();
    
    // Try to get minimum stake from contract
    try {
      if (this.blockchainService.isConnected()) {
        this.minStake = await this.blockchainService.getMinimumStake();
      } else {
        // Default: MIN_STAKE = STAKE_PER_SECOND * 1 weeks;
        this.minStake = BigInt(16000000 * 604800);
      }
    } catch (error) {
      console.error('Error getting minimum stake:', error);
    }
    
    // If editing, populate form with existing rating
    if (this.isEditing && this.existingRating) {
      this.uriInput = this.existingRating.decodedURI || '';
      this.scoreInput = this.existingRating.score;
      this.stakeInput = Number(ethers.utils.formatEther(this.existingRating.stake)).toString();
    }
  }
  
  validateForm(): boolean {
    // Check if connected
    if (!this.blockchainService.isConnected()) {
      this.errorMessage = 'Please connect your wallet first';
      return false;
    }
    
    // Validate URI
    if (!this.uriInput.trim()) {
      this.errorMessage = 'URI is required';
      return false;
    }
    
    if (!URIValidator.validate(this.uriInput)) {
      this.errorMessage = 'Invalid URI format. Please check examples for valid formats.';
      return false;
    }
    
    // Validate score
    if (this.scoreInput < 1 || this.scoreInput > 5) {
      this.errorMessage = 'Score must be between 1 and 5';
      return false;
    }
    
    // Validate stake
    if (!this.stakeInput || isNaN(Number(this.stakeInput)) || Number(this.stakeInput) <= 0) {
      this.errorMessage = 'Stake amount is required and must be greater than 0';
      return false;
    }
    
    const stakeWei = ethers.utils.parseEther(this.stakeInput);
    
    if (stakeWei < this.minStake) {
      this.errorMessage = `Stake must be at least ${formatETH(this.minStake)}`;
      return false;
    }
    
    return true;
  }
  
  async submitRating() {
    if (!this.validateForm()) {
      return;
    }
    
    this.isSubmitting = true;
    this.errorMessage = '';
    
    try {
      const stakeWei = ethers.utils.parseEther(this.stakeInput);
      
      await this.blockchainService.submitRating(
        this.uriInput,
        this.scoreInput,
        BigInt(stakeWei.toString())
      );
      
      // Reset form if not editing
      if (!this.isEditing) {
        this.resetForm();
      }
      
      // Notify parent components about the rating submission
      this.dispatchEvent(new CustomEvent('rating-submitted', {
        detail: {
          uri: this.uriInput,
          score: this.scoreInput,
          stake: BigInt(stakeWei.toString())
        },
        bubbles: true,
        composed: true
      }));
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      this.errorMessage = `Transaction failed: ${error.message || 'Unknown error'}`;
    } finally {
      this.isSubmitting = false;
    }
  }
  
  cancelEdit() {
    this.resetForm();
    // Notify parent about cancellation
    this.dispatchEvent(new CustomEvent('edit-cancelled', {
      bubbles: true,
      composed: true
    }));
  }
  
  resetForm() {
    this.uriInput = '';
    this.scoreInput = 3;
    this.stakeInput = '';
    this.errorMessage = '';
    this.isEditing = false;
    this.existingRating = null;
  }
  
  // Method to set values when navigating from another component
  setValues(uri: string, score: number = 3, stake: string = '') {
    this.uriInput = uri;
    this.scoreInput = score;
    this.stakeInput = stake;
  }
}