import { InsertToken } from "@shared/schema";
import fs from "fs";
import path from "path";

const TOKEN_FILE = path.join(process.cwd(), ".token");

export interface IStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private token: string | null = null;

  constructor() {
    // Load token from disk on startup
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        this.token = fs.readFileSync(TOKEN_FILE, "utf-8").trim() || null;
      }
    } catch {}
  }

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
    // Persist to disk so it survives restarts
    try {
      fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
    } catch {}
  }
}

export const storage = new MemStorage();
