import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  GetTokenPriceInputSchema,
  GetGasPriceInputSchema,
  GetHistoricalPriceInputSchema,
  PublishToContractInputSchema
} from './schema';
import { CacheService } from './services/cache';
import { PolygonService } from './services/polygon';
import { GasTrackerService } from './services/gas-tracker';
import { Network } from './types';

interface Services {
  cache: CacheService;
  polygonService: PolygonService;
  gasTracker: GasTrackerService;
}

export function setupServerTools(server: McpServer, services: Services) {
  // Debug: Check what we receive
  console.log('setupServerTools - services object:', !!services);
  console.log('setupServerTools - services.cache:', !!services?.cache);
  console.log('setupServerTools - services.polygonService:', !!services?.polygonService);
  console.log('setupServerTools - services.gasTracker:', !!services?.gasTracker);

  const { cache, polygonService, gasTracker } = services;

  // Debug: Check destructured values
  console.log('setupServerTools - destructured cache:', !!cache);
  console.log('setupServerTools - destructured polygonService:', !!polygonService);
  console.log('setupServerTools - destructured gasTracker:', !!gasTracker);

  // Get Token Price Tool
  server.tool(
    'getTokenPrice',
    'Get current token price from various blockchain networks',
    {
      symbol: GetTokenPriceInputSchema.shape.symbol,
      network: GetTokenPriceInputSchema.shape.network,
      source: GetTokenPriceInputSchema.shape.source,
    },
    async ({ symbol, network = 'polygon', source }) => {
      try {
        const cacheKey = cache.generateKey('token_price', symbol, network);

        // Check cache first
        let tokenPrice = cache.get(cacheKey);
        if (tokenPrice) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              success: true,
              data: {
                ...tokenPrice,
                cached: true,
              }
            }) }]
          };
        }

        // Fetch fresh data
        tokenPrice = await polygonService.getTokenPrice(
          symbol,
          network as Network
        );

        // Cache the result
        cache.set(cacheKey, tokenPrice);

        return {
          content: [{ type: "text", text: JSON.stringify({
            success: true,
            data: tokenPrice,
            message: `Token price for ${symbol.toUpperCase()} fetched successfully`
          }) }]
        };

      } catch (error) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            success: false,
            error: `Failed to get token price: ${error instanceof Error ? error.message : String(error)}`,
            data: null
          }) }]
        };
      }
    }
  );

  // Get Gas Price Tool
  server.tool(
    'getGasPrice',
    'Get current gas prices for blockchain networks',
    {
      network: GetGasPriceInputSchema.shape.network,
    },
    async ({ network = 'polygon' }) => {
      try {
        const cacheKey = cache.generateKey('gas_price', network);

        // Check cache first
        let gasPrice = cache.get(cacheKey);
        if (gasPrice) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              success: true,
              data: {
                ...gasPrice,
                cached: true,
              }
            }) }]
          };
        }

        // Fetch fresh data
        gasPrice = await gasTracker.getGasPrice(network as Network);

        // Cache the result
        cache.set(cacheKey, gasPrice);

        return {
          content: [{ type: "text", text: JSON.stringify({
            success: true,
            data: gasPrice,
            message: `Gas price for ${network} fetched successfully`
          }) }]
        };

      } catch (error) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            success: false,
            error: `Failed to get gas price: ${error instanceof Error ? error.message : String(error)}`,
            data: null
          }) }]
        };
      }
    }
  );

  // Get Historical Price Tool
  server.tool(
    'getHistoricalPrice',
    'Get historical token price for a specific date',
    {
      symbol: GetHistoricalPriceInputSchema.shape.symbol,
      date: GetHistoricalPriceInputSchema.shape.date,
      network: GetHistoricalPriceInputSchema.shape.network,
    },
    async ({ symbol, date, network = 'polygon' }) => {
      try {
        const cacheKey = cache.generateKey('historical_price', symbol, date, network);

        // Check cache first (longer TTL for historical data)
        let historicalPrice = cache.get(cacheKey);
        if (historicalPrice) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              success: true,
              data: {
                ...historicalPrice,
                cached: true,
              }
            }) }]
          };
        }

        // Fetch fresh data
        historicalPrice = await polygonService.getHistoricalPrice(
          symbol,
          date,
          network as Network
        );

        // Cache with longer TTL (24 hours for historical data)
        cache.set(cacheKey, historicalPrice, 24 * 60 * 60 * 1000);

        return {
          content: [{ type: "text", text: JSON.stringify({
            success: true,
            data: historicalPrice,
            message: `Historical price for ${symbol.toUpperCase()} on ${date} fetched successfully`
          }) }]
        };

      } catch (error) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            success: false,
            error: `Failed to get historical price: ${error instanceof Error ? error.message : String(error)}`,
            data: null
          }) }]
        };
      }
    }
  );

  // Get Multi-Network Gas Prices Tool
  server.tool(
    'getMultiNetworkGasPrice',
    'Get gas prices for multiple blockchain networks simultaneously',
    {},
    async () => {
      try {
        const cacheKey = cache.generateKey('multi_gas_price');

        // Check cache first
        let gasPrices = cache.get(cacheKey);
        if (gasPrices) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              success: true,
              data: {
                ...gasPrices,
                cached: true,
              }
            }) }]
          };
        }

        // Fetch fresh data for all networks
        gasPrices = await gasTracker.getMultiNetworkGasPrice();

        // Cache the result
        cache.set(cacheKey, gasPrices);

        return {
          content: [{ type: "text", text: JSON.stringify({
            success: true,
            data: gasPrices,
            message: 'Multi-network gas prices fetched successfully'
          }) }]
        };

      } catch (error) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            success: false,
            error: `Failed to get multi-network gas prices: ${error instanceof Error ? error.message : String(error)}`,
            data: null
          }) }]
        };
      }
    }
  );

  // Publish to Smart Contract Tool
  server.tool(
    'publishToContract',
    'Publish data or events to a smart contract (simulation)',
    {
      eventName: PublishToContractInputSchema.shape.eventName,
      contractAddress: PublishToContractInputSchema.shape.contractAddress,
      data: PublishToContractInputSchema.shape.data,
    },
    async ({ eventName, contractAddress, data }) => {
      try {
        // This is a simulation - in a real implementation you would:
        // 1. Connect to a blockchain RPC
        // 2. Send a transaction to the contract
        // 3. Wait for confirmation

        const event = {
          eventName,
          contractAddress,
          data,
          transactionHash: `0x${Math.random().toString(16).slice(2, 66)}`, // Mock transaction hash
          blockNumber: Math.floor(Math.random() * 1000000) + 50000000, // Mock block number
          timestamp: Date.now(),
        };

        // Log the event (in production, this would be an actual blockchain transaction)
        console.log('Publishing to contract:', event);

        // Cache the event
        const cacheKey = cache.generateKey('contract_event', contractAddress, eventName, Date.now().toString());
        cache.set(cacheKey, event);

        return {
          content: [{ type: "text", text: JSON.stringify({
            success: true,
            data: event,
            message: `Event ${eventName} published to contract ${contractAddress} successfully (simulated)`
          }) }]
        };

      } catch (error) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            success: false,
            error: `Failed to publish to contract: ${error instanceof Error ? error.message : String(error)}`,
            data: null
          }) }]
        };
      }
    }
  );

  // Health Check Tool
  server.tool(
    'healthCheck',
    'Check the health status of all oracle services',
    {},
    async () => {
      try {
        // Debug: Check if services are defined
        console.log('Health check - polygonService defined:', !!polygonService);
        console.log('Health check - gasTracker defined:', !!gasTracker);
        console.log('Health check - cache defined:', !!cache);

        if (!polygonService) {
          throw new Error('PolygonService is not initialized');
        }
        if (!gasTracker) {
          throw new Error('GasTrackerService is not initialized');
        }
        if (!cache) {
          throw new Error('CacheService is not initialized');
        }

        // Check if checkHealth methods exist
        if (typeof polygonService.checkHealth !== 'function') {
          throw new Error('PolygonService.checkHealth method is not defined');
        }
        if (typeof gasTracker.checkHealth !== 'function') {
          throw new Error('GasTrackerService.checkHealth method is not defined');
        }

        const [polygonHealth, gasTrackerHealth] = await Promise.all([
          polygonService.checkHealth(),
          gasTracker.checkHealth(),
        ]);

        const health = {
          polygon: polygonHealth,
          gasTracker: gasTrackerHealth,
          cache: cache.size(),
          timestamp: Date.now(),
        };

        return {
          content: [{ type: "text", text: JSON.stringify({
            success: true,
            data: health,
            message: 'Health check completed'
          }) }]
        };

      } catch (error) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            success: false,
            error: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
            data: null
          }) }]
        };
      }
    }
  );
}