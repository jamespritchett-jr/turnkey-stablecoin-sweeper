export const CHAIN_ID = Number(process.env.CHAIN_ID || 11155111);
export const TOKENS = [process.env.USDC_ADDRESS, process.env.USDT_ADDRESS]
  .filter(Boolean);
export const OMNIBUS = process.env.OMNIBUS_ADDRESS;
export const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15000);
export const SWEEP_THRESHOLD_WEI = BigInt(process.env.SWEEP_THRESHOLD_WEI || "0");
