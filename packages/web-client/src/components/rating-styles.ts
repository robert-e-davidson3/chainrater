import { css, CSSResult } from "lit";

export const ratingStarsStyles: CSSResult = css`
  :host {
    color: #f1c40f;
    font-size: 1.25rem;
  }
`;

export const ratingItemStyles: CSSResult = css`
  :host {
    display: block;
  }

  li {
    padding: 1rem;
    border-bottom: 1px solid #eee;
    display: grid;
    gap: 1rem;
    align-items: center;
  }

  li.with-actions {
    grid-template-columns: 3fr 1fr 1fr 1fr 1fr;
  }

  li.no-actions {
    grid-template-columns: 3fr 1fr 1fr 1fr;
  }

  li:last-child {
    border-bottom: none;
  }

  .uri {
    font-weight: 500;
  }
  
  .uri a {
    color: #3498db;
    text-decoration: none;
  }
  
  .uri a:hover {
    text-decoration: underline;
  }

  .stake,
  .expiration {
    text-align: center;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  button {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  button:hover {
    background-color: #2980b9;
  }

  button.secondary {
    background-color: #e74c3c;
  }

  button.secondary:hover {
    background-color: #c0392b;
  }

  .expiring-critical {
    background-color: rgba(231, 76, 60, 0.1);
  }

  .expiring-soon {
    background-color: rgba(241, 196, 15, 0.1);
  }

  .expiring-warning {
    background-color: rgba(243, 156, 18, 0.05);
  }
`;