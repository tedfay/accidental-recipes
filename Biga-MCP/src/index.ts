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

const server = new McpServer({
  name: 'biga',
  version: '0.1.0',
});

// ─── Health check ────────────────────────────────────────────────────────────

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

// ─── Tools ───────────────────────────────────────────────────────────────────

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

// ─── Resource template ───────────────────────────────────────────────────────

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

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env['PORT'];

if (PORT) {
  // HTTP mode — used by Railway and any production deployment.
  // Stateless: no session tracking, each request is independent.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Health check for Railway
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // MCP endpoint — POST only
    if (req.method === 'POST' && req.url === '/mcp') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString());
      await transport.handleRequest(req, res, body);
      return;
    }

    // GET /mcp for SSE stream (required by Streamable HTTP spec)
    if (req.method === 'GET' && req.url === '/mcp') {
      await transport.handleRequest(req, res);
      return;
    }

    // DELETE /mcp for session cleanup (spec compliance, no-op in stateless)
    if (req.method === 'DELETE' && req.url === '/mcp') {
      await transport.handleRequest(req, res);
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
