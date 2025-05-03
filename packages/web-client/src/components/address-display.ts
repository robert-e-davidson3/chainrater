import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./truncate-text.js";

/**
 * Address display component that handles:
 * - Optional display name
 * - Shortening with hover to view full info
 * - Delayed tooltips
 * - Future visualization support
 */
@customElement("address-display")
export class AddressDisplay extends LitElement {
  @property({ type: String }) address = "";
  @property({ type: String }) displayName = "";
  @property({ type: Boolean }) visualize = false;
  @property({ type: Boolean }) truncate = true;

  @state() private isShortened = false;

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
      font-family: monospace;
      color: #3498db;
      cursor: pointer;
    }

    :host(:hover) {
      text-decoration: underline;
    }

    truncate-text {
      width: auto;
      display: inline-block;
    }

    .tooltip {
      visibility: hidden;
      opacity: 0;
      position: absolute;
      top: 100%;
      left: 0;
      background-color: #333;
      color: white;
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 0.5rem;
      font-size: 0.8rem;
      z-index: 10;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      transition:
        opacity 0.3s,
        visibility 0s 1s;
      pointer-events: none;
      min-width: 200px;
      max-width: 300px;
      width: auto;
    }

    .tooltip-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      word-break: break-all;
    }

    .tooltip-content div {
      max-width: 100%;
      overflow-wrap: break-word;
    }

    :host(:hover) .tooltip {
      visibility: visible;
      opacity: 1;
      transition-delay: 1s, 0s;
    }

    .display-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tooltip-label {
      color: #999;
      font-size: 0.7rem;
    }
  `;

  render() {
    const needsTooltip =
      this.isShortened ||
      (this.displayName !== "" && this.address !== this.displayName);
    const tooltipContent = needsTooltip ? this.renderTooltip() : nothing;

    // Determine text and ellipsis position based on content
    const displayText = this.displayName || this.address;
    const ellipsisPosition = this.displayName ? "end" : "middle";

    const chars = this.truncate ? 20 : 1000;

    return html`
      <div @click=${this.handleAddressClick}>
        <truncate-text
          .text=${displayText}
          .ellipsisPosition=${ellipsisPosition}
          .minChars=${chars}
          .maxChars=${chars}
          @truncated=${this.handleTruncatedEvent}
        ></truncate-text>
        ${tooltipContent}
      </div>
    `;
  }

  handleTruncatedEvent(e: CustomEvent) {
    this.isShortened = e.detail.truncated;
  }

  handleAddressClick(e: Event) {
    e.stopPropagation(); // Prevent event from bubbling up

    if (this.address) {
      // Dispatch view-account event to navigate to account details
      this.dispatchEvent(
        new CustomEvent("view-account", {
          detail: { account: this.address },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  renderTooltip() {
    const nameSection =
      this.displayName && this.isShortened
        ? html`
            <div>
              <div class="tooltip-label">Name</div>
              <div>${this.displayName}</div>
            </div>
          `
        : nothing;

    const addressSection = html`
      <div>
        <div class="tooltip-label">Address</div>
        <div>${this.address}</div>
      </div>
    `;

    return html`
      <div class="tooltip">
        <div class="tooltip-content">${nameSection} ${addressSection}</div>
      </div>
    `;
  }
}
