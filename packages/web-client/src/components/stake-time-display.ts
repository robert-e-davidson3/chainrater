import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  BlockchainService,
  calculateExpirationTime,
} from "../services/blockchain.service.js";
import { formatETH, formatTimeRemaining } from "../utils/blockchain.utils.js";
import { blockchainServiceContext } from "../contexts/blockchain-service.context.js";
import {
  SECONDS_IN_MINUTE,
  SECONDS_IN_HOUR,
  SECONDS_IN_DAY,
  SECONDS_IN_WEEK,
  SECONDS_IN_YEAR,
} from "../utils/time-constants.js";

@customElement("stake-time-display")
export class StakeTimeDisplay extends LitElement {
  @property({ type: Object }) stake: bigint = 0n;
  @property({ type: Object }) posted: bigint = 0n;
  @property({ type: Boolean }) showDetails: boolean = false;
  @property({ type: Boolean }) aggregateMode: boolean = false;

  @consume({ context: blockchainServiceContext })
  _blockchainService?: BlockchainService;

  @state() showTooltip: boolean = false;

  get blockchainService() {
    if (!this._blockchainService) {
      throw new Error("Missing blockchain service context");
    }
    return this._blockchainService;
  }

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
      font-size: inherit;
      color: inherit;
    }

    .time-display {
      cursor: pointer;
      color: var(--primary-color, #3498db);
      font-weight: 500;
    }

    :host(.inherit-color) .time-display {
      color: inherit;
    }

    .time-display:hover {
      text-decoration: underline;
    }

    .tooltip {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background-color: white;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 8px 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 100;
      min-width: 180px;
      margin-top: 8px;
      font-size: 0.9rem;
    }

    .tooltip::before {
      content: "";
      position: absolute;
      top: -6px;
      left: 50%;
      transform: translateX(-50%);
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 6px solid white;
    }

    .tooltip-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .tooltip-row:last-child {
      margin-bottom: 0;
    }

    .label {
      font-weight: 500;
      color: #666;
    }

    .value {
      font-weight: 600;
    }

    .expired {
      color: #e74c3c;
    }

    .active {
      color: #2ecc71;
    }

    .aggregate-mode {
      font-style: italic;
    }
  `;

  render() {
    if (!this.blockchainService.ready || this.stake === 0n) {
      return html`<span>-</span>`;
    }

    const stakePerSecond = this.blockchainService.ratings.stakePerSecond;

    // In aggregate mode, we just show the equivalent duration
    if (this.aggregateMode) {
      const durationInSeconds = Number(this.stake) / Number(stakePerSecond);
      const durationText = this.formatDuration(durationInSeconds);

      const tooltipContent = this.showTooltip
        ? this.renderAggregateTooltip(durationInSeconds)
        : null;

      return html`
        <div
          class="time-display aggregate-mode"
          @click=${this.toggleTooltip}
          @mouseenter=${this.showDetails ? this.toggleTooltip : null}
          @mouseleave=${this.showDetails ? this.toggleTooltip : null}
        >
          ${durationText} ${tooltipContent}
        </div>
      `;
    }

    // In regular mode, we show time remaining with expiration date
    const expirationTime = calculateExpirationTime(
      this.posted,
      this.stake,
      stakePerSecond,
    );

    const timeRemaining = formatTimeRemaining(expirationTime);
    const isExpired = expirationTime < new Date();
    const statusClass = isExpired ? "expired" : "active";

    const tooltipContent = this.showTooltip
      ? this.renderTooltip(isExpired, statusClass, expirationTime)
      : null;

    return html`
      <div
        class="time-display"
        @click=${this.toggleTooltip}
        @mouseenter=${this.showDetails ? this.toggleTooltip : null}
        @mouseleave=${this.showDetails ? this.toggleTooltip : null}
      >
        ${timeRemaining} ${tooltipContent}
      </div>
    `;
  }

  formatDuration(seconds: number): string {
    if (seconds < SECONDS_IN_MINUTE) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < SECONDS_IN_HOUR) {
      return `${Math.round(seconds / SECONDS_IN_MINUTE)} minutes`;
    } else if (seconds < SECONDS_IN_DAY) {
      return `${Math.round(seconds / SECONDS_IN_HOUR)} hours`;
    } else if (seconds < SECONDS_IN_WEEK) {
      return `${Math.round(seconds / SECONDS_IN_DAY)} days`;
    } else if (seconds < SECONDS_IN_YEAR) {
      return `${Math.round(seconds / SECONDS_IN_WEEK)} weeks`;
    } else {
      return `${Math.round(seconds / SECONDS_IN_YEAR)} years`;
    }
  }

  renderAggregateTooltip(durationInSeconds: number) {
    return html`
      <div class="tooltip">
        <div class="tooltip-row">
          <span class="label">Total Stake:</span>
          <span class="value">${formatETH(this.stake)}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">Equivalent Duration:</span>
          <span class="value">${this.formatDuration(durationInSeconds)}</span>
        </div>
      </div>
    `;
  }

  renderTooltip(isExpired: boolean, statusClass: string, expirationTime: Date) {
    const expiredInfo = !isExpired
      ? html`
          <div class="tooltip-row">
            <span class="label">Expires:</span>
            <span class="value"
              >${expirationTime.toLocaleDateString()}
              ${expirationTime.toLocaleTimeString()}</span
            >
          </div>
        `
      : html`
          <div class="tooltip-row">
            <span class="label">Expired:</span>
            <span class="value"
              >${formatTimeRemaining(expirationTime)
                .replace("Expired", "")
                .trim()}
              ago</span
            >
          </div>
        `;

    return html`
      <div class="tooltip">
        <div class="tooltip-row">
          <span class="label">Staked:</span>
          <span class="value">${formatETH(this.stake)}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">Status:</span>
          <span class="value ${statusClass}">
            ${isExpired ? "Expired" : "Active"}
          </span>
        </div>
        ${expiredInfo}
      </div>
    `;
  }

  toggleTooltip() {
    this.showTooltip = !this.showTooltip;
  }
}
