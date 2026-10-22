import { providersHandler } from "../shared/api-core.mjs";

/**
 * GET /api/providers?author=openai&slug=gpt-6-luna
 * (The local server keeps the /api/providers/:author/:slug shape; the query form is what a
 * single serverless function can route without a rewrite per segment.)
 */
export default async function handler(req, res) {
  const author = String(req.query?.author ?? "");
  const slug = String(req.query?.slug ?? "");
  const result = await providersHandler({ params: { author, slug } });
  for (const [name, value] of Object.entries(result.headers ?? {})) res.setHeader(name, value);
  res.status(result.status).json(result.body);
}
