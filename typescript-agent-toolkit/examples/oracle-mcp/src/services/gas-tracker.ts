import { GasPrice, Network } from '../types';

interface GasTrackerConfig {
  quicknodeApiKey?: string;
  polygonRpcUrl: string;
}

export class GasTrackerService {
  private config: GasTrackerConfig;

  constructor(config: GasTrackerConfig) {
    this.config = config;
  }

  async getGasPrice(network: Network = Network.POLYGON): Promise<GasPrice> {
    try {
      switch (network) {
        case Network.POLYGON:
          return await this.getPolygonGasPrice();
        case Network.ETHEREUM:
          return await this.getEthereumGasPrice();
        default:
          throw new Error(`Unsupported network: ${network}`);
      }
    } catch (error) {
      throw new Error(`Failed to fetch gas price for ${network}: ${error}`);
    }
  }

  private async getPolygonGasPrice(): Promise<GasPrice> {
    try {
      // Try Owlracle API first (reliable for Polygon gas prices)
      try {
        return await this.getPolygonGasFromOwlracle();
      } catch (error) {
        console.warn('Owlracle API failed, falling back to RPC:', error);
      }

      // Fallback to direct RPC call
      return await this.getPolygonGasFromRPC();
    } catch (error) {
      throw new Error(`Failed to get Polygon gas price: ${error}`);
    }
  }

  private async getPolygonGasFromOwlracle(): Promise<GasPrice> {
    const response = await fetch('https://owlracle.info/poly/gas');

    if (!response.ok) {
      throw new Error(`Owlracle API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.speeds || data.speeds.length === 0) {
      throw new Error('Invalid gas data from Owlracle');
    }

    // Owlracle returns different speed tiers
    const speeds = data.speeds;
    const standard = speeds.find((s: any) => s.acceptance >= 90)?.gasPrice || speeds[0]?.gasPrice;
    const fast = speeds.find((s: any) => s.acceptance >= 95)?.gasPrice || speeds[1]?.gasPrice || standard;
    const instant = speeds[speeds.length - 1]?.gasPrice || fast;

    return {
      network: 'polygon',
      standard: parseFloat(standard) || 30,
      fast: parseFloat(fast) || 35,
      instant: parseFloat(instant) || 40,
      timestamp: Date.now(),
      unit: 'gwei',
    };
  }

  private async getPolygonGasFromRPC(): Promise<GasPrice> {
    const response = await fetch(this.config.polygonRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC method error: ${data.error.message}`);
    }

    // Convert from wei to gwei
    const gasPriceWei = parseInt(data.result, 16);
    const gasPriceGwei = gasPriceWei / 1e9;

    // Create different speed tiers based on standard price
    return {
      network: 'polygon',
      standard: Math.round(gasPriceGwei),
      fast: Math.round(gasPriceGwei * 1.2),
      instant: Math.round(gasPriceGwei * 1.5),
      timestamp: Date.now(),
      unit: 'gwei',
    };
  }

  private async getEthereumGasPrice(): Promise<GasPrice> {
    try {
      // Use ETH Gas Station API
      const response = await fetch('https://ethgasstation.info/api/ethgasAPI.json');

      if (!response.ok) {
        throw new Error(`ETH Gas Station API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        network: 'ethereum',
        standard: Math.round(data.average / 10), // Convert from API format
        fast: Math.round(data.fast / 10),
        instant: Math.round(data.fastest / 10),
        timestamp: Date.now(),
        unit: 'gwei',
      };
    } catch (error) {
      // Fallback to a different endpoint
      return await this.getEthereumGasFromAlternative();
    }
  }

  private async getEthereumGasFromAlternative(): Promise<GasPrice> {
    const response = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle');

    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== '1') {
      throw new Error(`Etherscan API error: ${data.message}`);
    }

    return {
      network: 'ethereum',
      standard: parseInt(data.result.SafeGasPrice),
      fast: parseInt(data.result.ProposeGasPrice),
      instant: parseInt(data.result.FastGasPrice),
      timestamp: Date.now(),
      unit: 'gwei',
    };
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('https://owlracle.info/poly/gas');
      return response.ok;
    } catch {
      return false;
    }
  }

  async getMultiNetworkGasPrice(): Promise<Record<string, GasPrice>> {
    const networks = [Network.POLYGON, Network.ETHEREUM];
    const results: Record<string, GasPrice> = {};

    await Promise.allSettled(
      networks.map(async (network) => {
        try {
          results[network] = await this.getGasPrice(network);
        } catch (error) {
          console.error(`Failed to get gas price for ${network}:`, error);
        }
      })
    );

    return results;
  }
}