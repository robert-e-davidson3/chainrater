import "./components/app";

// Custom element typings for TypeScript
declare global {
  interface HTMLElementTagNameMap {
    "chain-rater": HTMLElement;
    "header-nav": HTMLElement;
    "app-dashboard": HTMLElement;
    "user-ratings": HTMLElement;
    "rating-form": HTMLElement;
    "rating-search": HTMLElement;
    "stake-time-display": HTMLElement;
    "time-input": HTMLElement;
  }
}
