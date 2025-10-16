import "dotenv/config";
import fs from "node:fs";
import { createPublicClient, http, encodeFunctionData, parseAbi, getAddress } from "viem";
import { sepolia } from "viem/chains";
import { viemFor } from "./lib/viem-account.mjs";
import { TOKENS, OMNIBUS, POLL_INTERVAL_MS, SWEEP_THRESHOLD_WEI } from "./config.mjs";

if (!OMNIBUS) throw new Error("Missing OMNIBUS_ADDRESS in .env");
if (TOKENS.length === 0) throw new Error("Set USDC_ADDRESS/USDT_ADDRESS in .env");

const users = fs.existsSync("users.json") ? JSON.parse(fs.readFileSync("users.json", "utf8")) : [];
if (users.length === 0) {
  console.log("No users in users.json. Run: npm run provision -- <userId>");
  process.exit(0);
}

const publicClient = createPublicClient({ chain: sepolia, transport: http(process.env.RPC_URL) });
const erc20 = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
]);

async function sweepOne(user) {
  for (const token of TOKENS) {
    const bal = await publicClient.readContract({
      address: token,
      abi: erc20,
      functionName: "balanceOf",
      args: [user.address]
    });
    if (bal <= SWEEP_THRESHOLD_WEI) continue;

    const unsigned = {
      to: token,
      value: 0n,
      data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [getAddress(OMNIBUS), bal] }),
      chainId: sepolia.id
    };

    const walletClient = await viemFor(user.orgId, user.address);
    const hash = await walletClient.sendTransaction(unsigned);
    console.log(`[SWEEP] ${user.userId} ${token} -> omnibus ${OMNIBUS}: ${hash}`);
  }
}

async function loop() {
  console.log(`Watching ${users.length} deposit wallet(s)…`);
  console.log(`Tokens: ${TOKENS.join(", ")}`);
  while (true) {
    await Promise.all(users.map(sweepOne));
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

loop().catch(e => { console.error(e); process.exit(1); });
