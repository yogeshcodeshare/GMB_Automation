import { appendFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "vitest";
import { dataForSeoCredentials } from "@/lib/env";

const OUT = process.env.PROBE_OUT ?? path.join(tmpdir(), "dfs-probe-result.txt");
function report(line: string) {
  console.log(line);
  appendFileSync(OUT, line + "\n");
}

/** TEMPORARY diagnostic for the Day-2 smoke's HTTP 403 — prints DataForSEO
 * status codes/messages only (never credentials). Gated like the live smoke:
 *   RUN_LIVE_SMOKE=1 npx vitest run tests/dfs-access-probe.test.ts */
const creds = dataForSeoCredentials();
const enabled = Boolean(creds) && process.env.RUN_LIVE_SMOKE === "1";

describe.skipIf(!enabled)("DataForSEO access probe", () => {
  it("reports per-endpoint access level", async () => {
    writeFileSync(OUT, "");
    const auth =
      "Basic " +
      Buffer.from(`${creds!.login}:${creds!.password}`).toString("base64");

    async function probe(name: string, path: string, body?: unknown) {
      try {
        const res = await fetch(`https://api.dataforseo.com/v3/${path}`, {
          method: body ? "POST" : "GET",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });
        let detail = "";
        try {
          const json = (await res.json()) as {
            status_code?: number;
            status_message?: string;
            tasks?: Array<{
              status_code?: number;
              status_message?: string;
              result?: Array<{ money?: { balance?: number } }>;
            }>;
          };
          const task = json.tasks?.[0];
          detail = `api=${json.status_code} "${json.status_message}" task=${task?.status_code} "${task?.status_message}"`;
          if (name === "user_data" && task?.result?.[0]?.money) {
            detail += ` balance=$${task.result[0].money.balance}`;
          }
        } catch {
          detail = "(non-JSON body)";
        }
        report(`[probe] ${name}: HTTP ${res.status} ${detail}`);
      } catch (e) {
        report(`[probe] ${name}: network error ${(e as Error).message}`);
      }
    }

    const task = [
      {
        keyword: "मनोवेध हिप्नोक्लिनिक Karad",
        language_code: "en",
        location_code: 2356,
      },
    ];
    await probe("user_data", "appendix/user_data");
    await probe("mbi_live", "business_data/google/my_business_info/live", task);
    await probe(
      "mbi_task_post",
      "business_data/google/my_business_info/task_post",
      task
    );
  }, 120_000);
});
