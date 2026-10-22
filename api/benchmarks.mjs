import { benchmarksHandler } from "../shared/api-core.mjs";

export default async function handler(req, res) {
  const result = await benchmarksHandler({ headers: req.headers ?? {}, query: req.query ?? {} });
  for (const [name, value] of Object.entries(result.headers ?? {})) res.setHeader(name, value);
  res.status(result.status).json(result.body);
}
