import "./components/app";

const hasEthereum =
  typeof window !== "undefined" && typeof window.ethereum !== "undefined";

console.log(
  `ChainRater app starting...${hasEthereum ? " Web3 wallet detected." : " No Web3 wallet detected."}`,
);

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
