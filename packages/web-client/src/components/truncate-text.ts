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

  @property({ type: String }) ellipsisPosition: EllipsisPosition = "middle";

  render() {
    return html`<div>${this.getTruncatedText()}</div>`;
  }

  getTruncatedText() {
    const maxChars = this.calculateWidth();
    console.log(this.text, this.text.length, maxChars);
    if (this.text.length <= maxChars) {
      // Text fits without truncation
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
    // First, let's try to measure the parent's width if we can
    let parentWidth = 0;
    let ourWidth = 0;

    if (this.parentElement) parentWidth = this.parentElement.clientWidth;

    // Get our own width
    ourWidth = this.clientWidth;

    // Determine available width - if parent element has a width, use that
    // Otherwise, use our own width
    const availableWidth = parentWidth > 0 ? parentWidth : ourWidth;

    // If we have no width information, assume there's enough space
    // This prevents unnecessary truncation during initial render
    if (availableWidth <= 0) {
      return 1000; // Large number to avoid truncation
    }

    // Get computed styles to account for any styling applied to the element
    const computedStyle = window.getComputedStyle(this);

    // Measure a monospace character to get its width
    const tempSpan = document.createElement("span");
    tempSpan.style.fontFamily = computedStyle.fontFamily;
    tempSpan.style.fontSize = computedStyle.fontSize;
    tempSpan.style.fontWeight = computedStyle.fontWeight;
    tempSpan.style.letterSpacing = computedStyle.letterSpacing;
    tempSpan.style.visibility = "hidden";
    tempSpan.style.position = "absolute";
    tempSpan.textContent = "X";
    document.body.appendChild(tempSpan);
    const charWidth = tempSpan.getBoundingClientRect().width;
    document.body.removeChild(tempSpan);

    // If character width is invalid, don't truncate
    if (charWidth <= 0) return 1000;

    // Calculate how many characters can fit
    const maxChars = Math.ceil(availableWidth / charWidth);

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
