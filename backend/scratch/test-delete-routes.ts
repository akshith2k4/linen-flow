/**
 * Delete test routes via API
 * Routes to delete: 103802–103813, 103821, 103822
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../agent/.env") });

const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
const TOKEN = process.env.API_AUTH_TOKEN || "";

const ROUTE_IDS = [
    	103301
];

async function deleteRoute(id: number): Promise<{ id: number; success: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/trips/routes/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "x-company-id": "1",
      },
    });

    if (res.ok || res.status === 204) {
      return { id, success: true, status: res.status };
    }

    const body = await res.text().catch(() => "");
    return { id, success: false, status: res.status, error: body || res.statusText };
  } catch (e) {
    return { id, success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  console.log(`\n🗑️  Deleting ${ROUTE_IDS.length} routes...\n`);

  const results = await Promise.all(ROUTE_IDS.map(deleteRoute));

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  for (const r of results) {
    if (r.success) {
      console.log(`  ✅ Route ${r.id} deleted (HTTP ${r.status})`);
    } else {
      console.log(`  ❌ Route ${r.id} failed — ${r.error || `HTTP ${r.status}`}`);
    }
  }

  console.log(`\n📊 Summary: ${succeeded.length} deleted, ${failed.length} failed`);
  if (failed.length > 0) {
    console.log("   Failed IDs:", failed.map((r) => r.id).join(", "));
  }
}

main().catch(console.error);
