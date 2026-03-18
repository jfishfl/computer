import { InsertToken } from "@shared/schema";

export interface IStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private token: string | null = null;

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
  }
}

export const storage = new MemStorage();
