import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { consume } from "@lit/context";
import { BlockchainService } from "../services/blockchain.service.js";
import { formatETH } from "../utils/blockchain.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import {
  SECONDS_IN_WEEK,
  MIN_DURATION_SECONDS,
} from "../utils/time-constants.js";

@customElement("time-input")
export class TimeInput extends LitElement {
  @property({ type: Number }) value = MIN_DURATION_SECONDS; // Duration in seconds
  @property({ type: Boolean }) disabled = false;

  @consume({ context: blockchainServiceContext })
  _blockchainService?: BlockchainService;

  get blockchainService() {
    if (!this._blockchainService) {
      throw new Error("Missing blockchain service context");
    }
    return this._blockchainService;
  }

  static styles = css`
    :host {
      display: block;
    }

    .time-input-container {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    input[type="number"] {
      width: 80px;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    .unit-label {
      font-size: 1rem;
      color: #333;
    }

    input:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }

    .eth-equivalent {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #666;
    }
  `;

  render() {
    return html`
      <div class="time-input-container">
        <input
          type="number"
          min="1"
          step="1"
          .value=${this.getWeeksFromSeconds()}
          @input=${this.handleWeeksInput}
          @keydown=${this.handleKeyDown}
          ?disabled=${this.disabled}
        />
        <span class="unit-label">weeks</span>
      </div>
      <div class="eth-equivalent">
        Equivalent stake: ${this.calculateEquivalentEth()}
      </div>
    `;
  }

  getWeeksFromSeconds(): number {
    return Math.max(1, Math.round(this.value / SECONDS_IN_WEEK));
  }

  handleWeeksInput(e: Event) {
    const target = e.target as HTMLInputElement;
    // Remove any decimal part from the input value
    const integerValue = target.value.replace(".", "");
    // Parse as integer, defaulting to 1 if parsing fails
    const weeks = Math.max(1, parseInt(integerValue) || 1);
    const newSeconds = weeks * SECONDS_IN_WEEK;

    if (this.value !== newSeconds) {
      this.value = newSeconds;

      this.dispatchEvent(
        new CustomEvent("time-change", {
          detail: { seconds: this.value },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  handleKeyDown(e: KeyboardEvent) {
    // Allow: numbers, backspace, delete, tab, escape, enter, home, end, arrow keys
    const allowedKeys = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "Home",
      "End",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ];

    // Also allow control/cmd+key combinations for copy/paste/etc
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key))
      return;

    // If the key isn't in our allowed list, prevent it
    if (!allowedKeys.includes(e.key)) e.preventDefault();
  }

  calculateEquivalentEth(): string {
    const stakePerSecond = this.blockchainService.ratings.stakePerSecond;
    const stake = BigInt(this.value) * stakePerSecond;
    return formatETH(stake);
  }
}
