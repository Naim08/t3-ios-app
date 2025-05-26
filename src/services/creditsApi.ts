import { supabase } from '../lib/supabase';

export interface UserCredits {
  total_credits: number;
  last_updated: string;
}

export interface CreditTransaction {
  amount: number;
  description?: string;
}

export class CreditsApi {
  private static async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  private static async callFunction(functionName: string, body?: any) {
    const headers = await this.getAuthHeaders();
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Get current user credits
   */
  static async getCredits(): Promise<UserCredits> {
    return this.callFunction('get_credits');
  }

  /**
   * Spend tokens (atomic operation)
   * @param amount Number of tokens to spend
   * @param description Optional description for the transaction
   * @returns Remaining credits after spending
   */
  static async spendTokens(amount: number, description?: string): Promise<number> {
    const result = await this.callFunction('spend_tokens', { amount, description });
    return result.remaining_credits;
  }

  /**
   * Add tokens (atomic operation)
   * @param amount Number of tokens to add
   * @param description Optional description for the transaction
   * @returns New credit balance
   */
  static async addTokens(amount: number, description?: string): Promise<number> {
    const result = await this.callFunction('add_tokens', { amount, description });
    return result.new_balance;
  }
}

export default CreditsApi;
