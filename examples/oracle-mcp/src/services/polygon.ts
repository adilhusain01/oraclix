import { TokenPrice, HistoricalPrice, ApiResponse, Network } from '../types';

interface PolygonServiceConfig {
  coingeckoApiKey?: string;
  quicknodeApiKey?: string;
  polygonRpcUrl: string;
}

export class PolygonService {
  private config: PolygonServiceConfig;

  constructor(config: PolygonServiceConfig) {
    this.config = config;
  }

  async getTokenPrice(symbol: string, network: Network = Network.POLYGON): Promise<TokenPrice> {
    try {
      // Try CoinGecko first
      if (this.config.coingeckoApiKey) {
        try {
          return await this.getTokenPriceFromCoinGecko(symbol);
        } catch (error) {
          console.warn('CoinGecko API failed, falling back to QuickNode:', error);
        }
      }

      // Fallback to QuickNode or public endpoints
      return await this.getTokenPriceFromPublicAPI(symbol);
    } catch (error) {
      throw new Error(`Failed to fetch token price for ${symbol}: ${error}`);
    }
  }

  async getHistoricalPrice(symbol: string, date: string, network: Network = Network.POLYGON): Promise<HistoricalPrice> {
    try {
      if (this.config.coingeckoApiKey) {
        return await this.getHistoricalPriceFromCoinGecko(symbol, date);
      }
      throw new Error('Historical price data requires CoinGecko API key');
    } catch (error) {
      throw new Error(`Failed to fetch historical price for ${symbol} on ${date}: ${error}`);
    }
  }

  private async getTokenPriceFromCoinGecko(symbol: string): Promise<TokenPrice> {
    const coinId = this.getCoinGeckoId(symbol);
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;

    const headers: Record<string, string> = {};
    if (this.config.coingeckoApiKey) {
      headers['X-CG-Demo-API-Key'] = this.config.coingeckoApiKey;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData) {
      throw new Error(`Token ${symbol} not found in CoinGecko`);
    }

    return {
      symbol: symbol.toUpperCase(),
      price: coinData.usd,
      priceUsd: coinData.usd,
      timestamp: Date.now(),
      source: 'coingecko',
      marketCap: coinData.usd_market_cap,
      volume24h: coinData.usd_24h_vol,
      percentChange24h: coinData.usd_24h_change,
    };
  }

  private async getTokenPriceFromPublicAPI(symbol: string): Promise<TokenPrice> {
    // Using a public API as fallback (CoinGecko public endpoint with rate limits)
    const coinId = this.getCoinGeckoId(symbol);
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Public API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData) {
      throw new Error(`Token ${symbol} not found`);
    }

    return {
      symbol: symbol.toUpperCase(),
      price: coinData.usd,
      priceUsd: coinData.usd,
      timestamp: Date.now(),
      source: 'coingecko-public',
    };
  }

  private async getHistoricalPriceFromCoinGecko(symbol: string, date: string): Promise<HistoricalPrice> {
    const coinId = this.getCoinGeckoId(symbol);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${this.formatDateForCoinGecko(date)}`;

    const headers: Record<string, string> = {};
    if (this.config.coingeckoApiKey) {
      headers['X-CG-Demo-API-Key'] = this.config.coingeckoApiKey;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko historical API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.market_data || !data.market_data.current_price) {
      throw new Error(`No historical data available for ${symbol} on ${date}`);
    }

    return {
      symbol: symbol.toUpperCase(),
      date,
      price: data.market_data.current_price.usd,
      priceUsd: data.market_data.current_price.usd,
      volume: data.market_data.total_volume?.usd || 0,
    };
  }

  private getCoinGeckoId(symbol: string): string {
    // Map common symbols to CoinGecko IDs
    const symbolMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'MATIC': 'matic-network',
      'POL': 'polygon-ecosystem-token',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'DAI': 'dai',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'AAVE': 'aave',
    };

    const normalizedSymbol = symbol.toUpperCase();
    return symbolMap[normalizedSymbol] || normalizedSymbol.toLowerCase();
  }

  private formatDateForCoinGecko(date: string): string {
    // CoinGecko expects DD-MM-YYYY format
    const [year, month, day] = date.split('-');
    return `${day}-${month}-${year}`;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/ping');
      return response.ok;
    } catch {
      return false;
    }
  }
}