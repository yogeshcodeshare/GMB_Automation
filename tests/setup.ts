import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

// Load .env.local for integration tests when present (never committed).
const envPath = path.resolve(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  config({ path: envPath });
}
