export interface Rating {
  uriHash: string;
  decodedURI?: string;
  score: number;
  posted: number;
  stake: bigint;
  rater: string;
  expirationTime: Date;
}

export interface SearchResult {
  uriHash: string;
  decodedURI?: string;
  averageScore: number;
  ratingCount: number;
  topRatings?: Rating[];
  isExpired?: boolean;
}