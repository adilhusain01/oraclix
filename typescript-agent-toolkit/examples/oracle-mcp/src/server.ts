import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { McpHonoServerDO } from "@nullshot/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setupServerTools } from "./tools";
import { CacheService } from "./services/cache";
import { PolygonService } from "./services/polygon";
import { GasTrackerService } from "./services/gas-tracker";

export class OracleMcpServer extends McpHonoServerDO<Env> {
  private cache: CacheService;
  private polygonService: PolygonService;
  private gasTracker: GasTrackerService;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    try {
      console.log('Constructor - starting initialization');

      // Initialize cache with TTL from environment or default to 30 seconds
      const cacheTTL = env.CACHE_TTL_SECONDS ? parseInt(env.CACHE_TTL_SECONDS) * 1000 : 30000;
      console.log('Constructor - creating CacheService with TTL:', cacheTTL);
      this.cache = new CacheService(cacheTTL);
      console.log('Constructor - CacheService created:', !!this.cache);

      // Initialize services
      console.log('Constructor - creating PolygonService');
      this.polygonService = new PolygonService({
        coingeckoApiKey: env.COINGECKO_API_KEY,
        quicknodeApiKey: env.QUICKNODE_API_KEY,
        polygonRpcUrl: env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      });
      console.log('Constructor - PolygonService created:', !!this.polygonService);

      console.log('Constructor - creating GasTrackerService');
      this.gasTracker = new GasTrackerService({
        quicknodeApiKey: env.QUICKNODE_API_KEY,
        polygonRpcUrl: env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      });
      console.log('Constructor - GasTrackerService created:', !!this.gasTracker);

      console.log('Constructor - all services initialized successfully');
    } catch (error) {
      console.error('Constructor - error during initialization:', error);
      throw error;
    }
  }

  getImplementation(): Implementation {
    return {
      name: "OracleMcpServer",
      version: "1.0.0",
    };
  }

  configureServer(server: McpServer): void {
    // Debug: Check if services are initialized
    console.log('configureServer - cache defined:', !!this.cache);
    console.log('configureServer - polygonService defined:', !!this.polygonService);
    console.log('configureServer - gasTracker defined:', !!this.gasTracker);

    // Initialize services if they don't exist (backup initialization)
    if (!this.cache) {
      console.log('configureServer - initializing missing cache service');
      const cacheTTL = 30000; // Use default since env might not be available
      this.cache = new CacheService(cacheTTL);
    }

    if (!this.polygonService) {
      console.log('configureServer - initializing missing polygon service');
      this.polygonService = new PolygonService({
        coingeckoApiKey: undefined, // Use fallback since env might not be available
        quicknodeApiKey: undefined,
        polygonRpcUrl: 'https://polygon-rpc.com',
      });
    }

    if (!this.gasTracker) {
      console.log('configureServer - initializing missing gas tracker service');
      this.gasTracker = new GasTrackerService({
        quicknodeApiKey: undefined,
        polygonRpcUrl: 'https://polygon-rpc.com',
      });
    }

    setupServerTools(server, {
      cache: this.cache,
      polygonService: this.polygonService,
      gasTracker: this.gasTracker,
    });
  }
}