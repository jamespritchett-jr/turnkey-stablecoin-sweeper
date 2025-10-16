import "dotenv/config";
import fs from "node:fs";
import { turnkey } from "../src/lib/turnkey.mjs";

const which = process.argv[2];
if (!which || !["deposit", "omnibus"].includes(which)) {
  console.log("Usage: npm run apply:deposit  OR  npm run apply:omnibus");
  process.exit(1);
}

const policyPath = which === "deposit" ? "src/policies/deposit-policy.json" : "src/policies/omnibus-policy.json";
const raw = fs.readFileSync(policyPath, "utf8");

function expand(s) {
  return s
    .replaceAll("${CHAIN_ID}", String(process.env.CHAIN_ID || 11155111))
    .replaceAll("${USDC_ADDRESS}", process.env.USDC_ADDRESS || "0xUSDC")
    .replaceAll("${USDT_ADDRESS}", process.env.USDT_ADDRESS || "0xUSDT")
    .replaceAll("${OMNIBUS_ADDRESS}", process.env.OMNIBUS_ADDRESS || "0xOMNI");
}

const expanded = JSON.parse(expand(raw));

// You will typically attach policies to *each* deposit sub-org and to the omnibus org.
// For clarity, this script applies to a single org at a time via env var ORG_ID.
const ORG_ID = process.env.ORG_ID || process.env.OMNIBUS_ORG_ID;
if (!ORG_ID) {
  console.error("Set ORG_ID (for deposit org) or OMNIBUS_ORG_ID in .env");
  process.exit(1);
}

const POLICY_PATH = process.env.TURNKEY_POLICY_CREATE_PATH || "public/v1/query/create_policy";

const tk = await turnkey();
try {
  // This path may vary; check your docs and override TURNKEY_POLICY_CREATE_PATH if needed.
  const res = await tk.request("POST", POLICY_PATH, {
    organizationId: ORG_ID,
    policy: expanded
  });
  console.log("Applied policy to", ORG_ID);
  console.log(JSON.stringify(res, null, 2));
} catch (e) {
  console.error("Policy apply failed.");
  console.error(String(e));
  console.log("\nIf the endpoint path differs, set TURNKEY_POLICY_CREATE_PATH in .env, or paste the expanded policy JSON below into the Turnkey dashboard:");
  console.log(JSON.stringify(expanded, null, 2));
  process.exit(1);
}
