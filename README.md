# Turnkey Stablecoin Sweeper (Demo)

Per-user **deposit wallets** → policy-controlled sweeps of **USDC/USDT** to an **omnibus** wallet on **Sepolia**.
Uses Turnkey’s policy engine + EVM parser for guardrails, and the `@turnkey/viem` signer to produce signatures.

```
+-------------------+         +-------------------+
|  End User (Alex ) |         |  End User (Beth)  |
|  Sub-Org A        |         |  Sub-Org B        |
|  Wallet A0        |         |  Wallet B0        |
|  Address a0       |         |  Address b0       |
+---------+---------+         +---------+---------+
          |                             |
          |  ERC-20 transfer (USDC/USDT)|  (policy: to=OMNIBUS only)
          v                             v
          +-------------------------------+
          |         Omnibus Org           |
          |         Omnibus Wallet        |
          |         Address OMNI          |
          +-------------------------------+
```

## Why this is safe
- **Transaction-aware policies** run **inside a secure enclave** (e.g., Nitro/QuorumOS). The EVM parser exposes destination, token, amount, and chain to the policy engine.
- Keys never leave hardware; signatures are only returned if the policy is satisfied.

## Quick Start

```bash
# 0) Install
npm i
cp .env.example .env  # fill Turnkey creds, RPC URL, token addresses, omnibus address

# 1) Provision deposit wallets for users
npm run provision -- alex
npm run provision -- beth

# 2) Apply policies
# Apply deposit policy to a user's sub-org (set ORG_ID to that sub-org ID)
ORG_ID=org_sub_of_alex npm run apply:deposit
ORG_ID=org_sub_of_beth   npm run apply:deposit

# Apply omnibus policy (uses OMNIBUS_ORG_ID from .env by default)
npm run apply:omnibus

# 3) Start watcher/sweeper (polls balances & sweeps)
npm run sweep
```

> If the policy endpoint differs in your environment, set `TURNKEY_POLICY_CREATE_PATH` in `.env`,
> or paste the **expanded** JSON printed by the script into your Turnkey dashboard.

## Config (.env)
- `TURNKEY_BASE_URL`, `TURNKEY_PARENT_ORG_ID`, API key pair
- `CHAIN_ID`, `RPC_URL` (Sepolia recommended for demo)
- `USDC_ADDRESS`, `USDT_ADDRESS` (test tokens)
- `OMNIBUS_ORG_ID`, `OMNIBUS_WALLET_ID`, `OMNIBUS_ADDRESS`
- `SWEEP_THRESHOLD_WEI`, `POLL_INTERVAL_MS`

## Files
- `src/provision.mjs` – create sub-org + wallet + address per user; stores to `users.json`
- `src/watch-and-sweep.mjs` – polls ERC-20 balances; builds `transfer(omnibus, amount)`; Turnkey signs via `@turnkey/viem`; broadcasts via your RPC
- `src/policies/*.json` – deposit & omnibus policies
- `scripts/apply-policies.mjs` – applies a policy to a given org; prints expanded JSON on failure

## Notes
- For clarity, this demo uses **one address per user** at `m/44'/60'/0'/0/0`. In production, derive more or rotate as needed.
- Policies are intentionally strict for deposit wallets (ERC-20: USDC/USDT → OMNIBUS only) and deny-all on the omnibus.
- Keep chains/tokens in `.env` so reviewers can switch networks quickly.

## Talking Points for Reviewers
- “Each end user gets a dedicated **deposit sub-org + wallet + address**.”
- “A **policy** on deposit orgs allows only ERC-20 transfers of **USDC/USDT** to our **omnibus** on Sepolia; the **omnibus** org denies all outbound.”
- “The sweeper worker reads balances, builds `transfer` calldata, and requests a **Turnkey signature**; the enclave validates policy based on parsed EVM metadata, then we broadcast via our RPC.”
- “Because policy lives in the enclave, even if the app misbehaves, signatures can’t be produced for disallowed movements.”