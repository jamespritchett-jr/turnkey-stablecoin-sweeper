import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import { createAccount } from "@turnkey/viem";
import { turnkey } from "./turnkey.mjs";

/** Build a Viem wallet client that signs via Turnkey for (orgId, address) */
export async function viemFor(orgId, address) {
  const client = await turnkey();

  const account = await createAccount({
    client,              // TurnkeyClient instance
    organizationId: orgId,
    signWith: address,   // the deposit wallet account address
  });

  return createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.RPC_URL),
  });
}
