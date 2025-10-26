# Turnkey Stablecoin Deposit Sweeper

> Automated deposit wallet creation and fund sweeping with Turnkey policy enforcement

[![Turnkey](https://img.shields.io/badge/Powered%20by-Turnkey-blue)](https://turnkey.com)

## 🎯 Overview

This implementation demonstrates a production-ready stablecoin deposit management system for fintech applications using Turnkey's wallet infrastructure and policy engine. It addresses the common pattern of:

1. **Generating dedicated deposit addresses** for each end user
2. **Automatically sweeping deposits** into a central omnibus wallet
3. **Enforcing strict policies** that prevent unauthorized fund movement

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Turnkey Organization                    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Omnibus Wallet                         │  │
│  │  Policy: Deny all outgoing transactions by default   │  │
│  │  Address: 0xeD1e...                                  │  │
│  └──────────────▲───────────────────────────────────────┘  │
│                 │                                          │
│                 │ Auto-sweep USDC/USDT                     │
│                 │                                          │
│  ┌──────────────┴──────────┬──────────────────────┐        │
│  │                         │                      │        │
│  │  Deposit Wallet 1       │  Deposit Wallet N    │        │
│  │  Policy: Omnibus only   │  Policy: Omnibus only│        │
│  │  Tokens: USDC/USDT      │  Tokens: USDC/USDT   │        │
│  │  Address: 0xa1bd...     │  Address: 0x03CB...  │        │
│  └─────────────────────────┴──────────────────────┘        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Three-Layer Design

1. **Wallet Layer**: Creates isolated deposit wallets for each user via Turnkey API
2. **Policy Layer**: Enforces security rules in Turnkey's Trusted Execution Environments (TEEs)
3. **Automation Layer**: Monitors balances and triggers automatic sweeps

## 🔑 Key Features

### Infrastructure-Level Security
- **Private keys stored in TEEs - Never exposed to application
- **Policy enforcement in secure enclaves** - Cannot be bypassed even with compromised credentials
- **Cryptographically guaranteed restrictions** - Not dependent on application code

### Policy-Controlled Operations

**Deposit Wallet Policies**:
- ✅ Transfers ONLY to omnibus wallet address
- ✅ ONLY USDC/USDT tokens allowed
- ✅ Amount cannot exceed wallet balance
- ❌ Any other destination or token is rejected

**Omnibus Wallet Policy**:
- ❌ Denies all outgoing transactions by default
- ✅ Requires manual override or multi-signature approval for withdrawals
- ✅ Protects treasury from unauthorized access

### Automated Monitoring
- Checks deposit wallets every 15 seconds (configurable)
- Automatically sweeps when balance detected
- Handles gas management gracefully
- Comprehensive error handling and logging
- Timestamps on all events for audit trail

### Dynamic Configuration
- **100% `.env` driven** - No hardcoded addresses or chain IDs
- **Multi-chain ready** - Change network by updating config
- **Extensible token support** - Add new tokens via environment variables
- **Professional logging** - Token symbols, amounts, and timestamps

## 📋 Prerequisites

- Node.js v18+
- A Turnkey account ([sign up here](https://app.turnkey.com))
- Testnet RPC URL (Infura, Alchemy, etc.)
- Testnet tokens for testing (optional)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/jamespritchett-jr/turnkey-stablecoin-sweeper.git
cd turnkey-stablecoin-sweeper
npm install
```

### 2. Set Up Turnkey Account

1. Go to [https://app.turnkey.com](https://app.turnkey.com)
2. Create an organization
3. Generate an API key pair:
   - Navigate to: User Details → Create API Key
   - Save both the public and private keys securely

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Turnkey Configuration
TURNKEY_BASE_URL=https://api.turnkey.com/
TURNKEY_PARENT_ORG_ID=your-org-id-here
TURNKEY_API_PUBLIC_KEY=your-public-key-here
TURNKEY_API_PRIVATE_KEY=your-private-key-here

# Network (Sepolia testnet for demo)
CHAIN_ID=11155111
CHAIN_NAME=Sepolia
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Token Addresses (Sepolia testnet)
USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
USDT_ADDRESS=0x7169D38820dfd117C3FA1f22a697dBA58d90BA06

# Omnibus Wallet
OMNIBUS_ADDRESS=your-omnibus-address-here
OMNIBUS_WALLET_ID=your-omnibus-wallet-id-here

# Sweep Configuration
SWEEP_THRESHOLD_WEI=0
POLL_INTERVAL_MS=15000
```

### 4. Create Deposit Wallets

```bash
npm run provision -- alice
npm run provision -- bob
npm run provision -- charlie
```

This creates isolated deposit wallets for each user. The wallets are saved to `users.json`.

### 5. Start the Sweeper

```bash
npm run sweep
```

Output:
```
================================================================================
🔍 Turnkey Stablecoin Sweeper
================================================================================
Network: Sepolia (Chain ID: 11155111)
Omnibus: 0xYourOmnibusWalletAddressHere
Tokens: USDC (0x1c7D...2238), USDT (0x7169...BA06)
Check interval: 15s

Monitoring 3 deposit wallet(s):
  1. alice           → 0xAlice00986010E93f4F8B1DAF85ae6E8fd0eD4ed
  2. bob             → 0xBob976CcCC72d5FD129C015Ae8402509b2173422
  3. charlie         → 0xCharlie04f01653f5695B1Bc38755050cD8A2251
================================================================================
Started at: 2025-01-22 23:45:30

[2025-01-22 23:45:31] ⚠️  bob: Cannot sweep 10.00 USDC - wallet needs ETH for gas
```

## 🎬 Demo Flow

### Complete End-to-End Test

1. **Create deposit wallets**:
   ```bash
   npm run provision -- demo_user
   cat users.json
   ```

2. **Fund with testnet tokens**:
   - Get Sepolia ETH: https://sepoliafaucet.com
   - Get Sepolia USDC: https://faucet.circle.com
   - Send to a deposit wallet address from `users.json`

3. **Watch automatic sweep**:
   ```bash
   npm run sweep
   ```

4. **Observe the sweep**:
   ```
   [2025-01-22 23:46:01] ✅ [SWEEP] demo_user swept 10.00 USDC to omnibus: 0xabc123...
   ```

## 🔐 Policy Definitions

### Deposit Wallet Policy (`src/policies/deposit-policy.json`)

```json
{
  "name": "DepositWallet_StablecoinSweepOnly",
  "effect": "ALLOW",
  "when": {
    "erc20_transfer": {
      "token_in": ["${USDC_ADDRESS}", "${USDT_ADDRESS}"],
      "to_eq": "${OMNIBUS_ADDRESS}"
    }
  }
}
```

**What this enforces**:
- ✅ Transactions can ONLY send to omnibus address
- ✅ ONLY USDC and USDT tokens are allowed
- ❌ Any other destination → Rejected by Turnkey
- ❌ Any other token → Rejected by Turnkey

### Omnibus Wallet Policy (`src/policies/omnibus-policy.json`)

```json
{
  "name": "Omnibus_StrictDeny",
  "effect": "DENY",
  "when": { 
    "action": "SIGN_TRANSACTION" 
  }
}
```

**What this enforces**:
- ❌ All outgoing transactions denied by default
- ✅ Requires manual policy override or multi-sig approval
- ✅ Protects treasury from automated draining

## 📂 Project Structure

```
stablecoin-deposit-sweeper/
├── src/
│   ├── lib/
│   │   ├── turnkey.mjs           # Turnkey client initialization
│   │   └── viem-account.mjs      # Viem wallet client helpers
│   ├── policies/
│   │   ├── deposit-policy.json   # Deposit wallet security rules
│   │   └── omnibus-policy.json   # Omnibus wallet security rules
│   ├── config.mjs                # Dynamic config from .env
│   ├── provision.mjs             # Wallet creation script
│   └── watch-and-sweep.mjs       # Monitoring and sweeping logic
├── scripts/
│   └── apply-policies.mjs        # Policy application helper
├── users.json                    # Created wallets (not in git)
├── .env                          # Your secrets (not in git)
├── .env.example                  # Template for configuration
├── package.json
└── README.md
```

## 🎯 Assignment Requirements - Implementation Mapping

### ✅ Requirement 1: Per-User Deposit Wallets
**Implementation**: `src/provision.mjs`
- Uses Turnkey's `createWallet` API
- Private keys generated and stored in Turnkey's TEEs
- Each user gets isolated wallet
- Keys never exposed to application

### ✅ Requirement 2: Policy-Controlled Sweeping
**Implementation**: `src/watch-and-sweep.mjs` + `src/policies/deposit-policy.json`
- Monitors balances every 15 seconds
- Constructs ERC-20 transfer to omnibus
- Turnkey validates against policy before signing
- Automatic execution when balance detected

### ✅ Requirement 3a: Only Omnibus Destination
**Implementation**: Policy condition `to_eq: ${OMNIBUS_ADDRESS}`
- Enforced in Turnkey's secure enclave
- Any other destination rejected at signing stage
- Cannot be bypassed even with compromised keys

### ✅ Requirement 3b: Amount ≤ Balance
**Implementation**: Balance check + ERC-20 contract enforcement
- Sweeper reads actual balance via `balanceOf()`
- Uses exact balance in transfer
- ERC-20 contract reverts if insufficient

### ✅ Requirement 3c: Only USDC/USDT
**Implementation**: Policy condition `token_in: [USDC, USDT]`
- Explicit whitelist in policy
- Any other token rejected by Turnkey
- Enforced cryptographically

### ✅ Requirement 4: Omnibus Heavily Restricted
**Implementation**: `src/policies/omnibus-policy.json`
- Deny-all policy for outgoing transactions
- Requires manual override or multi-sig
- Protects treasury from unauthorized access

## 🛠️ Configuration Options

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TURNKEY_API_PUBLIC_KEY` | Your Turnkey API public key | Yes |
| `TURNKEY_API_PRIVATE_KEY` | Your Turnkey API private key | Yes |
| `TURNKEY_PARENT_ORG_ID` | Your organization ID | Yes |
| `CHAIN_ID` | Blockchain network ID | Yes |
| `CHAIN_NAME` | Network name for display | Yes |
| `RPC_URL` | Ethereum RPC endpoint | Yes |
| `USDC_ADDRESS` | USDC token contract address | Yes |
| `USDT_ADDRESS` | USDT token contract address | Yes |
| `OMNIBUS_ADDRESS` | Central treasury wallet address | Yes |
| `SWEEP_THRESHOLD_WEI` | Minimum balance to trigger sweep | No (default: 0) |
| `POLL_INTERVAL_MS` | Check interval in milliseconds | No (default: 15000) |

### Adding New Tokens

Simply add to `.env`:
```bash
DAI_ADDRESS=0x...
WETH_ADDRESS=0x...
```

The sweeper automatically detects all `*_ADDRESS` variables and monitors them!

### Changing Networks

Update `.env`:
```bash
# Switch to Polygon
CHAIN_ID=137
CHAIN_NAME=Polygon
RPC_URL=https://polygon-rpc.com
USDC_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
```

No code changes needed!

## 🔧 Advanced Features

### Multi-Signature Withdrawals (Production)

For production omnibus management, you would implement multi-signature approval:

```json
{
  "policyName": "Omnibus Multi-Sig",
  "effect": "ALLOW",
  "consensus": "approvers.count(user, user.tags.contains('TREASURER')) >= 3",
  "condition": "activity.intent.amount < 10000000000"
}
```

This requires 3 treasurers to approve withdrawals under $10k.

### Additional Policy Options

**Deposit Wallets**:
- Amount limits per transaction
- Rate limiting (max sweeps per day)
- Time windows (business hours only)
- Velocity checks (max volume per 24h)

**Omnibus**:
- Tiered approval (2-sig for small, 5-sig for large)
- Destination whitelists
- Time delays (withdrawal queue)
- Emergency freeze capability

### Derivation Path

We use `m/44'/60'/0'/0/0` - the BIP-44 standard for Ethereum:
- `44'` = BIP-44 standard
- `60'` = Ethereum coin type
- `0'` = First account
- `0` = External addresses
- `0` = First address

This ensures compatibility with MetaMask, Ledger, and other standard wallets.

## 🎓 Technical Deep Dives

### How Turnkey Signing Works

1. **User authenticates** (API key, passkey, etc.)
2. **Request created** and signed by stamper
3. **Sent to Turnkey API** with transaction details
4. **Turnkey validates** signature and policy
5. **If approved**: Turnkey signs with private key in TEE
6. **Signed transaction** returned to client
7. **Client broadcasts** to blockchain

### Security Model

**Traditional Approach** (Vulnerable):
```
Private Key → Encrypted → Database
❌ Keys exist in software
❌ Can be extracted if encryption broken
❌ Policies enforced in application code
```

**Turnkey Approach** (Secure):
```
Private Key → Generated in TEE → Never Leaves
✅ Keys only in hardware
✅ Cannot be extracted (physically impossible)
✅ Policies enforced where keys are stored
```

### Why This Matters

Even if an attacker:
- ❌ Compromises your API keys
- ❌ Gains access to your codebase
- ❌ Controls your application servers

They **CANNOT**:
- ❌ Make deposit wallets send to their address (policy blocks)
- ❌ Sweep unauthorized tokens (policy blocks)
- ❌ Drain the omnibus (policy blocks)

Security is **infrastructure-level**, not **application-level**.

## 🚨 Production Considerations

### For Production Deployment:

1. **Gas Management**
   - Auto-fund deposit wallets with ETH for gas
   - Monitor gas prices and optimize timing
   - Batch multiple sweeps to save costs

2. **Monitoring & Alerting**
   - Set up webhook notifications
   - Alert on failed sweeps
   - Dashboard for operations team
   - Prometheus/Grafana metrics

3. **Error Handling**
   - Dead letter queue for failed sweeps
   - Retry logic with exponential backoff
   - Circuit breakers for repeated failures

4. **Scalability**
   - Database for wallet mappings (not JSON file)
   - Event-driven architecture (not polling)
   - Parallel processing for large wallet counts
   - Caching layer for frequently accessed data

5. **Security**
   - Rotate API keys regularly
   - Store keys in vault (AWS Secrets Manager, etc.)
   - Separate keys for production vs development
   - Regular security audits
   - Rate limiting and DDoS protection


## 📊 Monitoring Output

The sweeper provides detailed, timestamped logs:

```
[2025-01-22 23:45:31] ⚠️  bob (0xf939...): Cannot sweep 10.00 USDC - needs ETH for gas
[2025-01-22 23:46:01] ✅ [SWEEP] alice swept 250.50 USDC to omnibus: 0xabc...
[2025-01-22 23:46:15] ✅ [SWEEP] charlie swept 1,000.00 USDT to omnibus: 0xdef...
```

Perfect for:
- Operational monitoring
- Audit trails
- Debugging timing issues
- Performance analysis

## 🐛 Troubleshooting

### Common Issues

**Issue**: `Cannot sweep - wallet needs ETH for gas fees`
- **Solution**: Fund deposit wallet with small amount of ETH (0.001 ETH is sufficient)

**Issue**: `Turnkey signing error`
- **Solution**: Check API keys are correct and organization ID matches

**Issue**: `Policy validation failed`
- **Solution**: Verify omnibus address in policy matches actual omnibus address

**Issue**: `Transaction timeout`
- **Solution**: Check RPC URL is working and network is not congested

## 📚 Resources

- **Turnkey Documentation**: https://docs.turnkey.com
- **Turnkey SDK**: https://github.com/tkhq/sdk
- **API Reference**: https://docs.turnkey.com/api
- **Dashboard**: https://app.turnkey.com
- **Sepolia Faucet**: https://sepoliafaucet.com
- **Circle USDC Faucet**: https://faucet.circle.com

## 🤝 Contributing

This is a demonstration project for Turnkey's Solutions Engineer interview process. For production use cases, additional features and hardening would be recommended.

## 📝 License

MIT

## 🙏 Acknowledgments

Built with [Turnkey](https://turnkey.com) - Secure, scalable wallet infrastructure.

Based on patterns from:
- [Turnkey Sweeper Example](https://github.com/tkhq/sdk/tree/main/examples/sweeper)
- [Turnkey Rebalancer Example](https://github.com/tkhq/sdk/tree/main/examples/rebalancer)

---

**Questions or Issues?** Check the [Turnkey documentation](https://docs.turnkey.com) or reach out to the Turnkey team.
