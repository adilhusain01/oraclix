export interface TokenPrice {
  symbol: string;
  price: number;
  priceUsd: number;
  timestamp: number;
  source: string;
  marketCap?: number;
  volume24h?: number;
  percentChange24h?: number;
}

export interface GasPrice {
  network: string;
  standard: number;
  fast: number;
  instant: number;
  timestamp: number;
  unit: string; // 'gwei' for most networks
}

export interface HistoricalPrice {
  symbol: string;
  date: string;
  price: number;
  priceUsd: number;
  volume: number;
}

export interface ContractEvent {
  eventName: string;
  contractAddress: string;
  data: Record<string, any>;
  transactionHash?: string;
  blockNumber?: number;
  timestamp: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  rateLimit?: {
    remaining: number;
    reset: number;
  };
}

export interface OracleConfig {
  cacheTTL: number;
  rateLimitPerMinute: number;
  defaultNetwork: string;
  apiKeys: {
    coingecko?: string;
    quicknode?: string;
    polygon?: string;
  };
}

export enum Network {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  BSC = 'bsc',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
}

export enum PriceSource {
  COINGECKO = 'coingecko',
  QUICKNODE = 'quicknode',
  COINBASE = 'coinbase',
  BINANCE = 'binance',
}