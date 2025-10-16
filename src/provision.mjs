import "dotenv/config";
import fs from "node:fs";
import { turnkey } from "./lib/turnkey.mjs";

const STORE = "users.json";
const db = fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, "utf8")) : [];

export async function createUserDeposit(userId) {
  const tk = await turnkey();
  const orgId = process.env.TURNKEY_PARENT_ORG_ID;
  if (!orgId) throw new Error("Missing TURNKEY_PARENT_ORG_ID");

  console.log(`Creating deposit wallet for user: ${userId}`);

  //createWallet method from the SDK
  const walletResponse = await tk.createWallet({
    walletName: `deposit-${userId}`,
    accounts: [
      {
        curve: "CURVE_SECP256K1",
        pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/60'/0'/0/0",
        addressFormat: "ADDRESS_FORMAT_ETHEREUM"
      }
    ]
  });

  const walletId = walletResponse.walletId;
  const address = walletResponse.addresses[0];

  if (!walletId || !address) {
    throw new Error("Could not get walletId/address from response");
  }

  const rec = { userId, orgId, walletId, address, createdAt: new Date().toISOString() };
  db.push(rec);
  fs.writeFileSync(STORE, JSON.stringify(db, null, 2));
  
  console.log("Created deposit wallet!");
  console.log(`   User: ${userId}`);
  console.log(`   Address: ${address}`);
  console.log(`   Wallet ID: ${walletId}`);
  
  return rec;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2] || `demo${Date.now()}`;
  createUserDeposit(id).catch(e => { 
    console.error("Error:", e.message); 
    process.exit(1); 
  });
}