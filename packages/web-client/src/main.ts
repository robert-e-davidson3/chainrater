import "./components/app";

// Check for wallet
const hasEthereum =
  typeof window !== "undefined" && typeof window.ethereum !== "undefined";

// Log app starting
console.log(
  `ChainRater app starting...${hasEthereum ? " Web3 wallet detected." : " No Web3 wallet detected."}`,
);

// Global error handler
window.addEventListener("error", (event) => {
  console.error("Uncaught error:", event.error);
});

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
