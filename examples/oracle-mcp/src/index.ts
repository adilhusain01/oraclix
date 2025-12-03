import { OracleMcpServer } from './server';

// Export the OracleMcpServer class for Durable Object binding
export { OracleMcpServer };

// Worker entrypoint for handling incoming requests
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const sessionIdStr = url.searchParams.get('sessionId');
    const id = sessionIdStr
      ? env.ORACLE_MCP_SERVER.idFromString(sessionIdStr)
      : env.ORACLE_MCP_SERVER.newUniqueId();

    console.log(`Oracle MCP Server - Fetching sessionId: ${sessionIdStr} with id: ${id}`);

    url.searchParams.set('sessionId', id.toString());

    return env.ORACLE_MCP_SERVER.get(id).fetch(new Request(
      url.toString(),
      request
    ));
  }
};