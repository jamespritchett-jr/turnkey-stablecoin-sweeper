import "dotenv/config";
import { Turnkey } from "@turnkey/sdk-server";

export async function turnkey() {
  const {
    TURNKEY_BASE_URL = "https://api.turnkey.com",
    TURNKEY_API_PUBLIC_KEY,
    TURNKEY_API_PRIVATE_KEY,
    TURNKEY_PARENT_ORG_ID,
  } = process.env;

  if (!TURNKEY_API_PUBLIC_KEY || !TURNKEY_API_PRIVATE_KEY) {
    throw new Error("Missing Turnkey API keys in .env");
  }

  // Clean up the base URL - remove trailing slash
  const cleanBaseUrl = TURNKEY_BASE_URL.replace(/\/$/, '');

  const tk = new Turnkey({
    apiBaseUrl: cleanBaseUrl,
    apiPublicKey: TURNKEY_API_PUBLIC_KEY,
    apiPrivateKey: TURNKEY_API_PRIVATE_KEY,
    defaultOrganizationId: TURNKEY_PARENT_ORG_ID,
  });

  return tk.apiClient();
}