import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './header-nav';
import './dashboard';
import './user-ratings';
import './rating-form';
import './rating-search';
import type { Rating } from '../types/rating.types';

@customElement('chain-rater')
export class ChainRater extends LitElement {
  @property({ type: String }) activeTab = 'dashboard';
  @property({ type: Boolean }) isConnected = false;
  @property({ type: String }) account = '';
  
  @state() private ratingToEdit: Rating | null = null;
  @state() private prefilledURI = '';
  
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
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
        <div class="container">
          ${this.renderActiveTab()}
        </div>
      </main>
    `;
  }
  
  renderActiveTab() {
    switch (this.activeTab) {
      case 'dashboard':
        return html`<app-dashboard @view-uri=${this.handleViewURI}></app-dashboard>`;
        
      case 'myratings':
        return html`
          <user-ratings 
            @edit-rating=${this.handleEditRating}
            @rating-removed=${this.handleRatingRemoved}
          ></user-ratings>
        `;
        
      case 'rate':
        return html`
          <rating-form 
            .isEditing=${!!this.ratingToEdit}
            .existingRating=${this.ratingToEdit}
            .uriInput=${this.prefilledURI}
            @rating-submitted=${this.handleRatingSubmitted}
            @edit-cancelled=${this.handleEditCancelled}
          ></rating-form>
        `;
        
      case 'search':
        return html`
          <rating-search 
            @rate-item=${this.handleRateItem}
            @rating-cleaned=${this.handleRatingCleaned}
          ></rating-search>
        `;
        
      default:
        return html`<div>Unknown tab</div>`;
    }
  }
  
  handleTabChange(e: CustomEvent) {
    this.activeTab = e.detail.tab;
    
    // Reset editing state when switching away from rate tab
    if (this.activeTab !== 'rate') {
      this.ratingToEdit = null;
      this.prefilledURI = '';
    }
  }
  
  handleWalletConnected(e: CustomEvent) {
    this.isConnected = true;
    this.account = e.detail.account;
  }
  
  handleWalletDisconnected() {
    this.isConnected = false;
    this.account = '';
    
    // If on my ratings tab, switch to dashboard since it requires connection
    if (this.activeTab === 'myratings') {
      this.activeTab = 'dashboard';
    }
  }
  
  handleEditRating(e: CustomEvent) {
    this.ratingToEdit = e.detail.rating;
    this.activeTab = 'rate';
  }
  
  handleRatingRemoved(e: CustomEvent) {
    // Refresh user ratings component
    this.requestUpdate();
  }
  
  handleRatingSubmitted(e: CustomEvent) {
    // If we were editing, clear the edit state
    this.ratingToEdit = null;
    this.prefilledURI = '';
    
    // Navigate to my ratings after submission
    if (this.isConnected) {
      this.activeTab = 'myratings';
      
      // Refresh user ratings component
      this.requestUpdate();
    }
  }
  
  handleEditCancelled() {
    this.ratingToEdit = null;
    this.prefilledURI = '';
    this.activeTab = 'myratings';
  }
  
  handleViewURI(e: CustomEvent) {
    this.prefilledURI = e.detail.uri || '';
    this.activeTab = 'rate';
  }
  
  handleRateItem(e: CustomEvent) {
    this.prefilledURI = e.detail.uri || '';
    this.activeTab = 'rate';
  }
  
  handleRatingCleaned(e: CustomEvent) {
    // Refresh search results
    this.requestUpdate();
  }
}