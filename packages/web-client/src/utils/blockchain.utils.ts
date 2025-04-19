import { formatEther, keccak256, stringToHex } from 'viem';

export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatETH(amount: bigint | number): string {
  if (typeof amount === 'number') {
    amount = BigInt(amount);
  }
  
  const formatted = formatEther(amount);
  // Remove trailing zeros after decimal point
  const parts = formatted.split('.');
  if (parts.length === 2) {
    const decimals = parts[1].replace(/0+$/, '');
    return decimals.length > 0 
      ? `${parts[0]}.${decimals} ETH` 
      : `${parts[0]} ETH`;
  }
  return `${formatted} ETH`;
}

export function calculateExpirationTime(posted: number, stake: bigint): Date {
  // stake is in wei per second
  const durationSeconds = Number(stake);
  return new Date((posted + durationSeconds) * 1000);
}

export function formatTimeRemaining(expirationTime: Date): string {
  const now = new Date();
  const diffMs = expirationTime.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return 'Expired';
  }
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
  }
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
  
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }
  
  if (diffMins > 0) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  }
  
  return `${diffSecs} second${diffSecs !== 1 ? 's' : ''}`;
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs <= 0) {
    return 'Just now';
  }
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  }
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  
  if (diffMins > 0) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }
  
  return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
}

export function hashURI(uri: string): string {
  return keccak256(stringToHex(uri));
}