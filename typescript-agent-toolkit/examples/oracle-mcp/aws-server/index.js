import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import morgan from 'morgan';
import { body, validationResult } from 'express-validator';
import fetch from 'node-fetch';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend-vercel.app', // Replace with your actual Vercel domain
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In-memory cache (in production, use Redis)
class CacheService {
  constructor(ttl = 30000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  generateKey(...parts) {
    return parts.join(':');
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, customTTL) {
    const expiry = Date.now() + (customTTL || this.ttl);
    this.cache.set(key, { value, expiry });
  }

  size() {
    return this.cache.size;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Services
class PolygonService {
  constructor(config) {
    this.config = config;
  }

  async getTokenPrice(symbol, network = 'polygon') {
    try {
      if (this.config.coingeckoApiKey) {
        return await this.getTokenPriceFromCoinGecko(symbol);
      }
      return await this.getTokenPriceFromPublicAPI(symbol);
    } catch (error) {
      throw new Error(`Failed to fetch token price for ${symbol}: ${error.message}`);
    }
  }

  async getTokenPriceFromCoinGecko(symbol) {
    const coinId = this.getCoinGeckoId(symbol);
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;

    const headers = {};
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

  async getTokenPriceFromPublicAPI(symbol) {
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

  async getHistoricalPrice(symbol, date, network = 'polygon') {
    const coinId = this.getCoinGeckoId(symbol);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${this.formatDateForCoinGecko(date)}`;

    const headers = {};
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

  getCoinGeckoId(symbol) {
    const symbolMap = {
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

  formatDateForCoinGecko(date) {
    const [year, month, day] = date.split('-');
    return `${day}-${month}-${year}`;
  }

  async checkHealth() {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/ping');
      return response.ok;
    } catch {
      return false;
    }
  }
}

class GasTrackerService {
  constructor(config) {
    this.config = config;
  }

  async getGasPrice(network = 'polygon') {
    switch (network) {
      case 'polygon':
        return await this.getPolygonGasPrice();
      case 'ethereum':
        return await this.getEthereumGasPrice();
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  async getPolygonGasPrice() {
    try {
      return await this.getPolygonGasFromOwlracle();
    } catch (error) {
      console.warn('Owlracle API failed, falling back to RPC:', error);
      return await this.getPolygonGasFromRPC();
    }
  }

  async getPolygonGasFromOwlracle() {
    const response = await fetch('https://owlracle.info/poly/gas');

    if (!response.ok) {
      throw new Error(`Owlracle API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.speeds || data.speeds.length === 0) {
      throw new Error('Invalid gas data from Owlracle');
    }

    const speeds = data.speeds;
    const standard = speeds.find(s => s.acceptance >= 90)?.gasPrice || speeds[0]?.gasPrice;
    const fast = speeds.find(s => s.acceptance >= 95)?.gasPrice || speeds[1]?.gasPrice || standard;
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

  async getPolygonGasFromRPC() {
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

    const gasPriceWei = parseInt(data.result, 16);
    const gasPriceGwei = gasPriceWei / 1e9;

    return {
      network: 'polygon',
      standard: Math.round(gasPriceGwei),
      fast: Math.round(gasPriceGwei * 1.2),
      instant: Math.round(gasPriceGwei * 1.5),
      timestamp: Date.now(),
      unit: 'gwei',
    };
  }

  async getEthereumGasPrice() {
    try {
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
    } catch (error) {
      throw new Error(`Failed to get Ethereum gas price: ${error.message}`);
    }
  }

  async getMultiNetworkGasPrice() {
    const networks = ['polygon', 'ethereum'];
    const results = {};

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

  async checkHealth() {
    try {
      const response = await fetch('https://owlracle.info/poly/gas');
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Initialize services
const cache = new CacheService(30000); // 30 seconds TTL
const polygonService = new PolygonService({
  coingeckoApiKey: process.env.COINGECKO_API_KEY,
  quicknodeApiKey: process.env.QUICKNODE_API_KEY,
  polygonRpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
});
const gasTracker = new GasTrackerService({
  quicknodeApiKey: process.env.QUICKNODE_API_KEY,
  polygonRpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
});

// Cleanup cache every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

// Validation middleware
const validateTokenPrice = [
  body('symbol').isString().isLength({ min: 1, max: 10 }).trim(),
  body('network').optional().isString().isIn(['polygon', 'ethereum']),
  body('source').optional().isString(),
];

const validateGasPrice = [
  body('network').optional().isString().isIn(['polygon', 'ethereum']),
];

const validateHistoricalPrice = [
  body('symbol').isString().isLength({ min: 1, max: 10 }).trim(),
  body('date').isISO8601().toDate(),
  body('network').optional().isString().isIn(['polygon', 'ethereum']),
];

const validatePublishToContract = [
  body('eventName').isString().isLength({ min: 1, max: 100 }).trim(),
  body('contractAddress').isString().matches(/^0x[a-fA-F0-9]{40}$/),
  body('data').isObject(),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'Oracle MCP Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      tokenPrice: 'POST /api/token-price',
      gasPrice: 'POST /api/gas-price',
      historicalPrice: 'POST /api/historical-price',
      multiNetworkGas: 'POST /api/multi-network-gas',
      publishToContract: 'POST /api/publish-to-contract',
      healthCheck: 'GET /api/health'
    }
  });
});

// Token price endpoint
app.post('/api/token-price', validateTokenPrice, handleValidationErrors, async (req, res) => {
  try {
    const { symbol, network = 'polygon', source } = req.body;
    const cacheKey = cache.generateKey('token_price', symbol, network);

    let tokenPrice = cache.get(cacheKey);
    if (tokenPrice) {
      return res.json({
        success: true,
        data: { ...tokenPrice, cached: true },
        message: `Token price for ${symbol.toUpperCase()} retrieved from cache`
      });
    }

    tokenPrice = await polygonService.getTokenPrice(symbol, network);
    cache.set(cacheKey, tokenPrice);

    res.json({
      success: true,
      data: tokenPrice,
      message: `Token price for ${symbol.toUpperCase()} fetched successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get token price: ${error.message}`,
      data: null
    });
  }
});

// Gas price endpoint
app.post('/api/gas-price', validateGasPrice, handleValidationErrors, async (req, res) => {
  try {
    const { network = 'polygon' } = req.body;
    const cacheKey = cache.generateKey('gas_price', network);

    let gasPrice = cache.get(cacheKey);
    if (gasPrice) {
      return res.json({
        success: true,
        data: { ...gasPrice, cached: true },
        message: `Gas price for ${network} retrieved from cache`
      });
    }

    gasPrice = await gasTracker.getGasPrice(network);
    cache.set(cacheKey, gasPrice);

    res.json({
      success: true,
      data: gasPrice,
      message: `Gas price for ${network} fetched successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get gas price: ${error.message}`,
      data: null
    });
  }
});

// Historical price endpoint
app.post('/api/historical-price', validateHistoricalPrice, handleValidationErrors, async (req, res) => {
  try {
    const { symbol, date, network = 'polygon' } = req.body;
    const dateStr = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
    const cacheKey = cache.generateKey('historical_price', symbol, dateStr, network);

    let historicalPrice = cache.get(cacheKey);
    if (historicalPrice) {
      return res.json({
        success: true,
        data: { ...historicalPrice, cached: true },
        message: `Historical price for ${symbol.toUpperCase()} on ${dateStr} retrieved from cache`
      });
    }

    historicalPrice = await polygonService.getHistoricalPrice(symbol, dateStr, network);
    cache.set(cacheKey, historicalPrice, 24 * 60 * 60 * 1000); // 24 hours

    res.json({
      success: true,
      data: historicalPrice,
      message: `Historical price for ${symbol.toUpperCase()} on ${dateStr} fetched successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get historical price: ${error.message}`,
      data: null
    });
  }
});

// Multi-network gas price endpoint
app.post('/api/multi-network-gas', async (req, res) => {
  try {
    const cacheKey = cache.generateKey('multi_gas_price');

    let gasPrices = cache.get(cacheKey);
    if (gasPrices) {
      return res.json({
        success: true,
        data: { ...gasPrices, cached: true },
        message: 'Multi-network gas prices retrieved from cache'
      });
    }

    gasPrices = await gasTracker.getMultiNetworkGasPrice();
    cache.set(cacheKey, gasPrices);

    res.json({
      success: true,
      data: gasPrices,
      message: 'Multi-network gas prices fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get multi-network gas prices: ${error.message}`,
      data: null
    });
  }
});

// Publish to contract endpoint (simulation)
app.post('/api/publish-to-contract', validatePublishToContract, handleValidationErrors, async (req, res) => {
  try {
    const { eventName, contractAddress, data } = req.body;

    const event = {
      eventName,
      contractAddress,
      data,
      transactionHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 50000000,
      timestamp: Date.now(),
    };

    console.log('Publishing to contract:', event);

    const cacheKey = cache.generateKey('contract_event', contractAddress, eventName, Date.now().toString());
    cache.set(cacheKey, event);

    res.json({
      success: true,
      data: event,
      message: `Event ${eventName} published to contract ${contractAddress} successfully (simulated)`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to publish to contract: ${error.message}`,
      data: null
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [polygonHealth, gasTrackerHealth] = await Promise.all([
      polygonService.checkHealth(),
      gasTracker.checkHealth(),
    ]);

    const health = {
      polygon: polygonHealth,
      gasTracker: gasTrackerHealth,
      cache: cache.size(),
      uptime: process.uptime(),
      timestamp: Date.now(),
    };

    res.json({
      success: true,
      data: health,
      message: 'Health check completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Health check failed: ${error.message}`,
      data: null
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    data: null
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    data: null
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Oracle MCP Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 API Documentation: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});