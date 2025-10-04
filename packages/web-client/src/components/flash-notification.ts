import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("flash-notification")
export class FlashNotification extends LitElement {
  @property({ type: String }) message = "";
  @property({ type: String }) linkText = "";
  @property({ type: String }) uri = "";
  @property({ type: String }) uriHash = "";
  @property({ type: Number }) duration = 8000; // Auto-dismiss after 8 seconds

  @state() private visible = false;
  private dismissTimeout?: number;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 70px; /* Below header */
      left: 50%;
      transform: translateX(-50%) translateY(-120%);
      z-index: 1000;
      width: 90%;
      max-width: 600px;
      transition: transform 0.3s ease-out;
    }

    :host([visible]) {
      transform: translateX(-50%) translateY(0);
    }

    .flash {
      background-color: #27ae60;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .flash-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .flash-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .flash-text {
      flex: 1;
      min-width: 150px;
    }

    .flash-link {
      color: white;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
      white-space: nowrap;
    }

    .flash-link:hover {
      opacity: 0.8;
    }

    .close-button {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
      flex-shrink: 0;
    }

    .close-button:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }

    @media (max-width: 600px) {
      :host {
        top: 60px;
        width: 95%;
      }

      .flash {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
      }

      .flash-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .flash-link {
        white-space: normal;
        word-break: break-word;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Show the notification with a slight delay for animation
    requestAnimationFrame(() => {
      this.visible = true;
      this.setAttribute("visible", "");
    });

    // Set auto-dismiss timer
    if (this.duration > 0) {
      this.dismissTimeout = window.setTimeout(() => {
        this.dismiss();
      }, this.duration);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }
  }

  render() {
    return html`
      <div class="flash">
        <div class="flash-content">
          <span class="flash-icon">✓</span>
          <span class="flash-text">${this.message}</span>
          ${this.linkText
            ? html`
                <a class="flash-link" @click=${this.handleLinkClick}>
                  ${this.linkText}
                </a>
              `
            : ""}
        </div>
        <button
          class="close-button"
          @click=${this.dismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    `;
  }

  private handleLinkClick(e: Event) {
    e.preventDefault();
    // Dispatch custom event for navigation
    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { uri: this.uri, uriHash: this.uriHash },
        bubbles: true,
        composed: true,
      }),
    );
    this.dismiss();
  }

  private dismiss() {
    this.visible = false;
    this.removeAttribute("visible");

    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      this.dispatchEvent(
        new CustomEvent("dismissed", {
          bubbles: true,
          composed: true,
        }),
      );
    }, 300);
  }
}
