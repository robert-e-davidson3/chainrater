import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./truncate-text.js";

@customElement("uri-display")
export class UriDisplay extends LitElement {
  @property({ type: String }) uri = "";

  @state() private isShortened = false;

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
      font-family: monospace;
      color: #3498db;
      cursor: pointer;
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
    const tooltipContent = this.isShortened ? this.renderTooltip() : nothing;

    return html`
      <truncate-text
        .text=${this.uri}
        .ellipsisPosition=${"end"}
        .minChars=${30}
        .maxChars=${30}
        @truncated=${this.handleTruncatedEvent}
      ></truncate-text>
      ${tooltipContent}
    `;
  }

  handleTruncatedEvent(e: CustomEvent) {
    this.isShortened = e.detail.truncated;
  }

  renderTooltip() {
    return html`
      <div class="tooltip">
        <div class="tooltip-content">${this.uri}</div>
      </div>
    `;
  }
}
