import { InsertToken } from "@shared/schema";
import { ACCOUNTS, DEFAULT_ACCOUNT } from "@shared/schema";
import fs from "fs";
import path from "path";

export interface IStorage {
  getToken(accountId?: string): Promise<string | null>;
  setToken(token: string, accountId?: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private tokens: Record<string, string | null> = {};

  constructor() {
    // Load all account tokens from disk on startup
    for (const [id, config] of Object.entries(ACCOUNTS)) {
      const tokenFile = path.join(process.cwd(), config.tokenFile);
      try {
        if (fs.existsSync(tokenFile)) {
          this.tokens[id] = fs.readFileSync(tokenFile, "utf-8").trim() || null;
        } else {
          this.tokens[id] = null;
        }
      } catch {
        this.tokens[id] = null;
      }
    }
  }

  async getToken(accountId: string = DEFAULT_ACCOUNT): Promise<string | null> {
    return this.tokens[accountId] ?? null;
  }

  async setToken(token: string, accountId: string = DEFAULT_ACCOUNT): Promise<void> {
    this.tokens[accountId] = token;
    const config = ACCOUNTS[accountId];
    if (!config) return;
    const tokenFile = path.join(process.cwd(), config.tokenFile);
    try {
      fs.writeFileSync(tokenFile, token, { mode: 0o600 });
    } catch {}
  }
}

export const storage = new MemStorage();
