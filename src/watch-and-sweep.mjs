import "dotenv/config";
import fs from "node:fs";
import { createPublicClient, http, encodeFunctionData, parseAbi, getAddress, formatEther } from "viem";
import { sepolia, mainnet, polygon, arbitrum, optimism, base } from "viem/chains";
import { viemFor } from "./lib/viem-account.mjs";
import { TOKENS, OMNIBUS, POLL_INTERVAL_MS, SWEEP_THRESHOLD_WEI, CHAIN_ID } from "./config.mjs";

// Timestamp helper
function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

if (!OMNIBUS) throw new Error("Missing OMNIBUS_ADDRESS in .env");
if (TOKENS.length === 0) throw new Error("Set token addresses in .env");

const users = fs.existsSync("users.json") ? JSON.parse(fs.readFileSync("users.json", "utf8")) : [];
if (users.length === 0) {
  console.log("No users in users.json. Run: npm run provision -- <userId>");
  process.exit(0);
}

// Map chain ID to chain config (fallback for viem chain objects)
const CHAIN_MAP = {
  1: mainnet,
  11155111: sepolia,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base
};

// Get chain from map or create custom chain from .env
const chain = CHAIN_MAP[CHAIN_ID] || {
  id: CHAIN_ID,
  name: process.env.CHAIN_NAME || "Unknown Network",
  network: process.env.CHAIN_NAME?.toLowerCase() || "unknown",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL] },
    public: { http: [process.env.RPC_URL] }
  }
};

// Build token info dynamically from ALL *_ADDRESS env vars
const TOKEN_INFO = {};
Object.keys(process.env).forEach(key => {
  const match = key.match(/^(.+)_ADDRESS$/);
  if (match && process.env[key] && key !== 'OMNIBUS_ADDRESS') {
    const symbol = match[1];
    const address = process.env[key];
    TOKEN_INFO[address.toLowerCase()] = {
      symbol: symbol,
      address: address
    };
  }
});

const publicClient = createPublicClient({ 
  chain, 
  transport: http(process.env.RPC_URL) 
});

const erc20 = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
]);

async function sweepOne(user) {
  for (const token of TOKENS) {
    try {
      const bal = await publicClient.readContract({
        address: token,
        abi: erc20,
        functionName: "balanceOf",
        args: [user.address]
      });
      
      if (bal <= SWEEP_THRESHOLD_WEI) continue;

      const tokenInfo = TOKEN_INFO[token.toLowerCase()];
      const tokenSymbol = tokenInfo?.symbol || "TOKEN";
      
      // Format amount (assuming 6 decimals for USDC/USDT)
      const decimals = 6; // USDC and USDT use 6 decimals
      const amount = Number(bal) / Math.pow(10, decimals);
      const formattedAmount = amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 6 
      });
      
      // Check ETH balance for gas
      const ethBalance = await publicClient.getBalance({ address: user.address });
      if (ethBalance === 0n) {
        console.log(`[${timestamp()}] ⚠️  ${user.userId} (${user.address}): Cannot sweep ${formattedAmount} ${tokenSymbol} - wallet needs ETH for gas fees`);
        continue;
      }

      const unsigned = {
        to: token,
        value: 0n,
        data: encodeFunctionData({ 
          abi: erc20, 
          functionName: "transfer", 
          args: [getAddress(OMNIBUS), bal] 
        }),
        chainId: chain.id
      };

      const walletClient = await viemFor(user.orgId, user.address);
      const hash = await walletClient.sendTransaction(unsigned);
      
      console.log(`[${timestamp()}] ✅ [SWEEP] ${user.userId} (${user.address}): swept ${formattedAmount} ${tokenSymbol} to omnibus: ${hash}`);
      
    } catch (error) {
      const tokenInfo = TOKEN_INFO[token.toLowerCase()];
      const tokenSymbol = tokenInfo?.symbol || "TOKEN";
      
      // Try to get amount for error messages
      let amountStr = "";
      try {
        const bal = await publicClient.readContract({
          address: token,
          abi: erc20,
          functionName: "balanceOf",
          args: [user.address]
        });
        const decimals = 6;
        const amount = Number(bal) / Math.pow(10, decimals);
        amountStr = ` (${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${tokenSymbol})`;
      } catch {
        // If balance check fails, just skip amount
      }
      
      // Parse common errors into user-friendly messages
      if (error.message?.includes("gas required exceeds allowance") || 
          error.details?.includes("gas required exceeds allowance")) {
        console.log(`[${timestamp()}] ⚠️  ${user.userId} (${user.address}): Cannot sweep${amountStr} - wallet needs ETH for gas fees`);
      } else if (error.message?.includes("insufficient funds")) {
        console.log(`[${timestamp()}] ⚠️  ${user.userId} (${user.address}): Insufficient ${tokenSymbol} balance to sweep`);
      } else if (error.message?.includes("nonce")) {
        console.log(`[${timestamp()}] ⚠️  ${user.userId} (${user.address}): Nonce error - transaction may be pending`);
      } else if (error.message?.includes("Turnkey")) {
        console.log(`[${timestamp()}] ❌ ${user.userId} (${user.address}): Turnkey signing error - ${error.message.split('\n')[0]}`);
      } else {
        console.log(`[${timestamp()}] ❌ ${user.userId} (${user.address}): Sweep failed for ${tokenSymbol} - ${error.shortMessage || error.message.split('\n')[0]}`);
      }
    }
  }
}

async function loop() {
  // Format token list with symbols and addresses
  const tokenList = TOKENS.map(t => {
    const tokenInfo = TOKEN_INFO[t.toLowerCase()];
    return tokenInfo ? `${tokenInfo.symbol} (${t})` : t;
  }).join(", ");
  
  console.log(`\n${"=".repeat(80)}`);
  console.log(`         Turnkey Stablecoin Sweeper`);
  console.log(`${"=".repeat(80)}`);
  console.log(`Network: ${chain.name} (Chain ID: ${chain.id})`);
  console.log(`Omnibus: ${OMNIBUS}`);
  console.log(`Tokens: ${tokenList}`);
  console.log(`Check interval: ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`\nMonitoring ${users.length} deposit wallet(s):`);
  users.forEach((user, idx) => {
    console.log(`  ${idx + 1}. ${user.userId.padEnd(15)} → ${user.address}`);
  });
  console.log(`${"=".repeat(80)}`);
  console.log(`Started at: ${timestamp()}\n`);
  
  while (true) {
    await Promise.all(users.map(sweepOne));
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

loop().catch(e => { 
  console.error(`\n[${timestamp()}] ❌ Fatal error:`, e.message); 
  process.exit(1); 
});