import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

type EllipsisPosition = "middle" | "start" | "end";

@customElement("truncate-text")
export class TruncateText extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      white-space: nowrap;
      font-family: monospace;
    }

    div {
      white-space: nowrap;
    }
  `;

  @property({ type: String }) text = "";

  // Minimum characters to display (including ellipsis)
  @property({ type: Number }) minChars = 9;

  @property({ type: Number }) maxChars?: number;

  @property({ type: String }) ellipsisPosition: EllipsisPosition = "middle";

  render() {
    return html`<div>${this.getTruncatedText()}</div>`;
  }

  getTruncatedText() {
    const maxChars = this.calculateWidth();

    // Text fits without truncation
    if (this.text.length <= maxChars) {
      this.notifyTruncated(false);
      return this.text;
    }

    // Text needs truncation
    this.notifyTruncated(true);

    const ellipsis = "..." as const;
    const ellipsisLength = 3 as const;

    switch (this.ellipsisPosition) {
      case "start": {
        const startVisibleChars = maxChars - ellipsisLength;
        const text = this.text.substring(this.text.length - startVisibleChars);
        return `${ellipsis}${text}`;
      }
      case "end": {
        const endVisibleChars = maxChars - ellipsisLength;
        const text = this.text.substring(0, endVisibleChars);
        return `${text}${ellipsis}`;
      }
      case "middle":
        const charsPerSide = Math.floor((maxChars - ellipsisLength) / 2);
        const leftText = this.text.substring(0, charsPerSide);
        const rightText = this.text.substring(this.text.length - charsPerSide);
        return `${leftText}${ellipsis}${rightText}`;
    }
  }

  private notifyTruncated(truncated: boolean) {
    this.dispatchEvent(
      new CustomEvent("truncated", {
        detail: { truncated },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private calculateWidth(): number {
    if (this.maxChars === this.minChars) return this.maxChars;

    const availableWidth = this.parentElement
      ? this.parentElement.clientWidth
      : this.clientWidth;

    // If no available width then node does not exist, so avoid truncation
    if (availableWidth <= 0) return 1000;

    const computedStyle = window.getComputedStyle(this);

    // Measure a monospace character to get its width
    const tempSpan = document.createElement("span");
    tempSpan.style.fontFamily = computedStyle.fontFamily;
    tempSpan.style.fontSize = computedStyle.fontSize;
    tempSpan.style.fontWeight = computedStyle.fontWeight;
    tempSpan.style.letterSpacing = computedStyle.letterSpacing;
    tempSpan.style.visibility = "hidden";
    tempSpan.style.position = "absolute";
    tempSpan.textContent = "M";
    document.body.appendChild(tempSpan);
    const charWidth = tempSpan.getBoundingClientRect().width;
    document.body.removeChild(tempSpan);

    // Something went wrong so avoid truncation
    if (charWidth <= 0) return 1000;

    // Calculate how many characters can fit
    // (Unsure why Math.ceil is needed here, but it is)
    const maxChars = Math.ceil(availableWidth / charWidth);

    // If enforced max is less than real max, use enforced max
    if (this.maxChars && this.maxChars < maxChars) return this.maxChars;

    // If maxChars is larger than the text, return the text length
    if (maxChars >= this.text.length) return this.text.length;

    // Otherwise, use the max number of characters that can fit, or minChars if larger
    return Math.max(maxChars, this.minChars);
  }

  private resizeObserver?: ResizeObserver;

  // Update when resized
  connectedCallback() {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver(() => this.requestUpdate());
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
