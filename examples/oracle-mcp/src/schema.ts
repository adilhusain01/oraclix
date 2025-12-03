import { z } from 'zod';

export const TokenPriceSchema = z.object({
  symbol: z.string().min(1).max(20),
  price: z.number().positive(),
  priceUsd: z.number().positive(),
  timestamp: z.number().positive(),
  source: z.string(),
  marketCap: z.number().positive().optional(),
  volume24h: z.number().nonnegative().optional(),
  percentChange24h: z.number().optional(),
});

export const GasPriceSchema = z.object({
  network: z.string(),
  standard: z.number().positive(),
  fast: z.number().positive(),
  instant: z.number().positive(),
  timestamp: z.number().positive(),
  unit: z.string().default('gwei'),
});

export const HistoricalPriceSchema = z.object({
  symbol: z.string().min(1).max(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  price: z.number().positive(),
  priceUsd: z.number().positive(),
  volume: z.number().nonnegative(),
});

export const ContractEventSchema = z.object({
  eventName: z.string().min(1),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/), // Ethereum address format
  data: z.record(z.any()),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  blockNumber: z.number().positive().optional(),
  timestamp: z.number().positive(),
});

// Input schemas for MCP tools
export const GetTokenPriceInputSchema = z.object({
  symbol: z.string().min(1).max(20).describe('Token symbol (e.g., BTC, ETH, MATIC)'),
  network: z.string().optional().describe('Blockchain network (default: polygon)'),
  source: z.string().optional().describe('Price source (coingecko, quicknode)'),
});

export const GetGasPriceInputSchema = z.object({
  network: z.string().default('polygon').describe('Blockchain network'),
});

export const GetHistoricalPriceInputSchema = z.object({
  symbol: z.string().min(1).max(20).describe('Token symbol'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format'),
  network: z.string().optional().describe('Blockchain network'),
});

export const PublishToContractInputSchema = z.object({
  eventName: z.string().min(1).describe('Name of the event to publish'),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe('Smart contract address'),
  data: z.record(z.any()).describe('Event data to publish'),
});

export type TokenPrice = z.infer<typeof TokenPriceSchema>;
export type GasPrice = z.infer<typeof GasPriceSchema>;
export type HistoricalPrice = z.infer<typeof HistoricalPriceSchema>;
export type ContractEvent = z.infer<typeof ContractEventSchema>;
export type GetTokenPriceInput = z.infer<typeof GetTokenPriceInputSchema>;
export type GetGasPriceInput = z.infer<typeof GetGasPriceInputSchema>;
export type GetHistoricalPriceInput = z.infer<typeof GetHistoricalPriceInputSchema>;
export type PublishToContractInput = z.infer<typeof PublishToContractInputSchema>;