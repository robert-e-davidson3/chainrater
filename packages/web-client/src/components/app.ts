import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("root")
export class App extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
    }
    h1 {
      color: #333;
    }
  `;

  render() {
    return html`
      <h1>ChainRater</h1>
      <p>Welcome to ChainRater - your blockchain rating platform</p>
    `;
  }
}
