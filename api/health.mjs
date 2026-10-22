import { healthHandler } from "../shared/api-core.mjs";

export default function handler(_req, res) {
  const result = healthHandler();
  for (const [name, value] of Object.entries(result.headers ?? {})) res.setHeader(name, value);
  res.status(result.status).json(result.body);
}
