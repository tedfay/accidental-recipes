import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { sql } from './db.js';
import { getRecipe } from './tools/get-recipe.js';
import { searchRecipes } from './tools/search-recipes.js';
import { getSeoMetadata } from './tools/get-seo-metadata.js';
import { getIngredient } from './tools/get-ingredient.js';
import { listIngredients } from './tools/list-ingredients.js';
import { getRecipesByIngredient } from './tools/get-recipes-by-ingredient.js';
import { searchContent } from './tools/search-content.js';
import { getIngredientFrequencies } from './tools/get-ingredient-frequencies.js';

// ─── Tool & resource registration ───────────────────────────────────────────
// Extracted into a function so HTTP mode can create a fresh McpServer per
// request (stateless Streamable HTTP requires this).

function createConfiguredServer(): McpServer {
  const server = new McpServer({
    name: 'biga',
    version: '0.1.0',
  });

  server.tool(
    'health_check',
    'Verify database connectivity and report recipe count',
    {},
    async () => {
      const start = Date.now();
      try {
        const [row] = await sql<[{ count: string }]>`
          SELECT count(*)::text AS count FROM recipes WHERE status = 'live'
        `;
        const latencyMs = Date.now() - start;
        const recipeCount = parseInt(row?.count ?? '0', 10);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ status: 'ok', recipeCount, latencyMs }),
          }],
        };
      } catch (err) {
        const latencyMs = Date.now() - start;
        const message = err instanceof Error ? err.message : 'Unknown error';
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ status: 'error', message, latencyMs }),
          }],
        };
      }
    },
  );

  server.tool(
    'get_recipe',
    'Fetch a single recipe by slug with full enriched ingredient data (Wikidata links, resolved labels)',
    {
      slug: z.string().describe('Recipe slug, e.g. "grandma-lloyds-pumpkin-pie"'),
    },
    async ({ slug }) => getRecipe(slug),
  );

  server.tool(
    'search_recipes',
    'Full-text search across recipe titles and headnotes. Returns slug, title, headnote preview, and ingredient count.',
    {
      query: z.string().describe('Search terms, e.g. "pumpkin muffins"'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum number of results to return (default: 10)'),
    },
    async ({ query, limit }) => searchRecipes(query, limit ?? 10),
  );

  server.tool(
    'get_seo_metadata',
    'Return a Schema.org Recipe JSON-LD object for a given slug. Use this when generating structured data for web pages or SEO analysis.',
    {
      slug: z.string().describe('Recipe slug'),
    },
    async ({ slug }) => getSeoMetadata(slug),
  );

  server.tool(
    'get_ingredient',
    'Fetch a single ingredient entity by Wikidata ID with all recipes that use it',
    {
      wikidataId: z.string().describe('Wikidata entity ID, e.g. "Q49391"'),
    },
    async ({ wikidataId }) => getIngredient(wikidataId),
  );

  server.tool(
    'list_ingredients',
    'List all ingredient entities with name, Wikidata ID, category, and alternate names',
    {},
    async () => listIngredients(),
  );

  server.tool(
    'get_recipes_by_ingredient',
    'Return recipes containing all specified ingredients, matched by Wikidata ID (AND logic)',
    {
      wikidataIds: z.array(z.string()).min(1).describe('One or more Wikidata IDs, e.g. ["Q11106", "Q45989"]'),
      limit: z.number().int().min(1).max(200).optional().describe('Max results (default: 56)'),
    },
    async ({ wikidataIds, limit }) => getRecipesByIngredient(wikidataIds, limit ?? 56),
  );

  server.tool(
    'get_ingredient_frequencies',
    'Return recipe count per ingredient, keyed by Wikidata ID. Used for filter panel sorting.',
    {},
    async () => getIngredientFrequencies(),
  );

  server.tool(
    'search_content',
    'Search recipes by text query and/or ingredient filters. All parameters optional — any combination is valid.',
    {
      query: z.string().optional().describe('Full text search terms, e.g. "pumpkin muffins"'),
      include_ids: z
        .array(z.string())
        .optional()
        .describe('Wikidata IDs of ingredients to require (AND logic), e.g. ["Q11106", "Q45989"]'),
      exclude_ids: z
        .array(z.string())
        .optional()
        .describe('Wikidata IDs of ingredients to exclude — accepted but no-op for now'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Max results (default: 50)'),
    },
    async ({ query, include_ids, exclude_ids, limit }) =>
      searchContent(query, include_ids, exclude_ids, limit ?? 50),
  );

  server.resource(
    'recipe',
    new ResourceTemplate('recipes://{slug}', { list: undefined }),
    async (uri, { slug }) => {
      const result = await getRecipe(String(slug));
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: result.content[0]?.text ?? '{}',
          },
        ],
      };
    },
  );

  return server;
}

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env['PORT'];

if (PORT) {
  // HTTP mode — used by Railway and any production deployment.
  // Stateless: a new McpServer + transport is created per request.
  // This is the correct pattern for StreamableHTTPServerTransport
  // in stateless mode (sessionIdGenerator: undefined).

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Health check for Railway
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Direct tool call endpoint — bypasses MCP protocol handshake.
    // The Next.js bridge calls this instead of the full MCP endpoint.
    // Accepts: POST /tools/call { tool: string, args?: {} }
    // Returns: parsed tool result as JSON
    if (req.method === 'POST' && req.url === '/tools/call') {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const { tool, args = {} } = JSON.parse(Buffer.concat(chunks).toString()) as {
          tool: string;
          args?: Record<string, unknown>;
        };

        // Direct dispatch — tool functions return MCP response shape
        type ToolHandler = (a: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>;
        const toolMap: Record<string, ToolHandler> = {
          get_recipe: (a) => getRecipe(a.slug as string),
          search_recipes: (a) => searchRecipes(a.query as string, (a.limit as number) ?? 10),
          get_seo_metadata: (a) => getSeoMetadata(a.slug as string),
          get_ingredient: (a) => getIngredient(a.wikidataId as string),
          list_ingredients: () => listIngredients(),
          get_recipes_by_ingredient: (a) => getRecipesByIngredient(a.wikidataIds as string[], (a.limit as number) ?? 56),
          get_ingredient_frequencies: () => getIngredientFrequencies(),
          search_content: (a) => searchContent(a.query as string | undefined, a.include_ids as string[] | undefined, a.exclude_ids as string[] | undefined, (a.limit as number) ?? 50),
        };

        const handler = toolMap[tool];
        if (!handler) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Unknown tool: ${tool}` }));
          return;
        }

        const result = await handler(args);
        const textContent = result.content?.find((c) => c.type === 'text');
        if (textContent) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(textContent.text);
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No text content in tool response' }));
        }
      } catch (err) {
        console.error('[tools/call] Error:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
        }
      }
      return;
    }

    // MCP Streamable HTTP endpoint — full protocol for MCP-native clients
    if (req.url === '/mcp') {
      try {
        const server = createConfiguredServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        await server.connect(transport);

        if (req.method === 'POST') {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(chunk as Buffer);
          }
          const body = JSON.parse(Buffer.concat(chunks).toString());
          await transport.handleRequest(req, res, body);
        } else if (req.method === 'GET' || req.method === 'DELETE') {
          await transport.handleRequest(req, res);
        } else {
          res.writeHead(405).end();
        }
      } catch (err) {
        console.error('[MCP HTTP] Error handling request:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(Number(PORT), () => {
    console.log(`Biga-MCP HTTP server listening on port ${PORT}`);
  });
} else {
  // stdio mode — local dev, spawned by the Next.js API route.
  // Single server instance, single transport — process exits after use.
  const server = createConfiguredServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
