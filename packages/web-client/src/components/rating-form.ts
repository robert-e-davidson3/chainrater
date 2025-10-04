import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  type ExistingRating,
  BlockchainService,
  Contract,
} from "../services/blockchain.service.js";
import { MissingContextError, hashURI } from "../utils/blockchain.utils.js";
import { URIValidator } from "../utils/uri.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import { MIN_DURATION_SECONDS } from "../utils/time-constants.js";
import "./time-input.js";

@customElement("rating-form")
export class RatingForm extends LitElement {
  @property({ type: String }) uriInput = ""; // URI, not its hash
  @property({ type: Number }) scoreInput = 3;
  @property({ type: Number }) durationSeconds = MIN_DURATION_SECONDS; // Duration in seconds
  @property({ type: Object }) minStake = BigInt(0);
  @property({ type: Boolean }) isEditing = false;
  @property({ type: Object }) existingRating: ExistingRating | null = null;

  @state() private isSubmitting = false;
  @state() private errorMessage = "";
  @state() private successMessage = "";
  @state() private showURIExamples = false;

  @consume({ context: blockchainServiceContext })
  _blockchainService?: BlockchainService;

  get blockchainService() {
    if (!this._blockchainService)
      throw new MissingContextError("blockchainServiceContext");
    return this._blockchainService;
  }

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

    .success {
      color: #27ae60;
      margin-top: 1rem;
      padding: 0.75rem;
      background-color: rgba(39, 174, 96, 0.1);
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
        <h2>${this.isEditing ? "Update Rating" : "Rate an Item"}</h2>

        <div class="form-group">
          <label for="uri">URI</label>
          <input
            id="uri"
            type="text"
            .value=${this.uriInput}
            @input=${(e: any) => (this.uriInput = e.target.value)}
            ?disabled=${this.isEditing}
            placeholder="e.g., restaurant://Name, product://Brand"
          />
          <div class="helper-text">
            Enter a URI that identifies what you're rating
            <button class="view-examples" @click=${this.toggleURIExamples}>
              ${this.showURIExamples ? "Hide examples" : "View examples"}
            </button>
          </div>

          ${this.showURIExamples
            ? html`
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
              `
            : ""}
        </div>

        <div class="form-group">
          <label>Rating</label>
          <div class="star-selector">${this.renderStarSelector()}</div>
        </div>

        <div class="form-group">
          <label for="duration">Duration</label>
          <time-input
            id="duration"
            .value=${this.durationSeconds}
            .disabled=${this.isSubmitting}
            @time-change=${this.handleTimeChange}
          ></time-input>
          <div class="helper-text">
            Minimum duration is 1 week. Longer durations require more ETH and
            give your rating more weight.
          </div>
        </div>

        ${this.errorMessage
          ? html`
              <div class="error"><span>⚠️</span> ${this.errorMessage}</div>
            `
          : ""}
        ${this.successMessage
          ? html`
              <div class="success"><span>✓</span> ${this.successMessage}</div>
            `
          : ""}

        <button @click=${this.submitRating} ?disabled=${this.isSubmitting}>
          ${this.isSubmitting
            ? "Submitting..."
            : this.isEditing
              ? "Update Rating"
              : "Submit Rating"}
        </button>

        ${this.isEditing
          ? html`
              <button class="secondary" @click=${this.cancelEdit}>
                Cancel
              </button>
            `
          : ""}
      </section>
    `;
  }

  renderStarSelector() {
    return html`
      ${[1, 2, 3, 4, 5].map(
        (score) => html`
          <span
            class="star ${this.scoreInput >= score ? "active" : ""}"
            @click=${() => (this.scoreInput = score)}
          >
            ★
          </span>
        `,
      )}
    `;
  }

  toggleURIExamples() {
    this.showURIExamples = !this.showURIExamples;
  }

  handleTimeChange(e: CustomEvent) {
    this.durationSeconds = e.detail.seconds;
  }

  validateForm(): boolean {
    // Check if connected
    if (!this.blockchainService.ready) {
      this.errorMessage = "Please connect your wallet first";
      return false;
    }

    // Validate URI
    if (!this.uriInput.trim()) {
      this.errorMessage = "URI is required";
      return false;
    }

    if (!URIValidator.validate(this.uriInput)) {
      this.errorMessage =
        "Invalid URI format. Please check examples for valid formats.";
      return false;
    }

    // Validate score
    if (this.scoreInput < 1 || this.scoreInput > 5) {
      this.errorMessage = "Score must be between 1 and 5";
      return false;
    }

    // Validate duration
    if (this.durationSeconds < MIN_DURATION_SECONDS) {
      this.errorMessage = "Duration must be at least 1 week";
      return false;
    }

    // Calculate stake from duration
    const stakePerSecond = this.blockchainService.ratings.stakePerSecond;
    const stake = BigInt(this.durationSeconds) * stakePerSecond;

    if (stake < this.minStake) {
      this.errorMessage = "Stake is too low for the selected duration";
      return false;
    }

    return true;
  }

  async submitRating() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = "";
    this.successMessage = "";

    try {
      // Calculate stake from duration
      const stakePerSecond = this.blockchainService.ratings.stakePerSecond;
      const stake = BigInt(this.durationSeconds) * stakePerSecond;

      // Store the URI that was rated for future reference
      const ratedUri = this.uriInput;
      const ratedUriHash = hashURI(ratedUri).toLowerCase();

      // Set up a promise that resolves when the blockchain service processes the event
      const eventProcessed = new Promise<void>((resolve) => {
        const handler = (
          ratings: Contract.Ratings.RatingSubmittedEvent[],
        ) => {
          if (ratings.some((r) => r.uriHash.toLowerCase() === ratedUriHash)) {
            this.blockchainService.ratings.off(
              Contract.Ratings.RatingSubmittedEventName,
              handler,
            );
            resolve();
          }
        };
        this.blockchainService.ratings.on(
          Contract.Ratings.RatingSubmittedEventName,
          handler,
        );
      });

      await this.blockchainService.ratings.submitRating(
        ratedUri,
        this.scoreInput,
        stake,
      );

      // Wait for the blockchain service to process the event
      await eventProcessed;

      // Show success message
      this.successMessage = `Rating submitted successfully for "${ratedUri}"!`;

      // Reset form if not editing
      if (!this.isEditing) {
        this.resetForm();
      }

      // Cache the URI in the blockchain service to avoid race condition
      // where event arrives before state propagates
      this.blockchainService.ratings.cacheUri(ratedUriHash, ratedUri);

      // Notify parent components about the rating submission
      this.dispatchEvent(
        new CustomEvent("rating-submitted", {
          detail: {
            uri: ratedUri,
            score: this.scoreInput,
            stake,
            durationSeconds: this.durationSeconds,
          },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      this.errorMessage = `Transaction failed: ${error.message || "Unknown error"}`;
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelEdit() {
    this.resetForm();
    // Notify parent about cancellation
    this.dispatchEvent(
      new CustomEvent("edit-cancelled", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  resetForm() {
    this.uriInput = "";
    this.scoreInput = 3;
    this.durationSeconds = MIN_DURATION_SECONDS;
    this.errorMessage = "";
    this.successMessage = "";
    this.isEditing = false;
    this.existingRating = null;
  }
}
