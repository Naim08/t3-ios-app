// Token spending middleware for streaming
export class TokenSpendingMiddleware {
  private pendingCost = 0; // Changed from pendingTokens to pendingCost for fractional support
  private readonly batchCostThreshold = 5; // Spend when we reach 5 credits worth
  private spendTimer?: number | ReturnType<typeof setTimeout>;
  private readonly userId: string;
  private readonly supabaseUrl: string;
  private readonly userToken: string;
  private readonly modelId: string;
  
  // Track accumulated text for final cost calculation
  private accumulatedText = '';
  private promptTokens = 0;

  constructor(userId: string, supabaseUrl: string, userToken: string, modelId: string, promptTokens: number) {
    this.userId = userId;
    this.supabaseUrl = supabaseUrl;
    this.userToken = userToken;
    this.modelId = modelId;
    this.promptTokens = promptTokens;
  }

  // Add text token for incremental cost calculation
  async accumulateText(text: string): Promise<void> {
    this.accumulatedText += text;
    
    // Calculate running cost estimate - we'll do final reconciliation at the end
    // For now, use a conservative estimate to avoid overcharging during streaming
    const conservativeEstimate = text.length * 0.001; // Very conservative per-character cost
    this.pendingCost += conservativeEstimate;
    
    // Batch spend when we reach the threshold
    if (this.pendingCost >= this.batchCostThreshold) {
      await this.flushCost();
    } else {
      // Set a timer to flush remaining cost after 2 seconds of inactivity
      if (this.spendTimer) {
        clearTimeout(this.spendTimer);
      }
      this.spendTimer = setTimeout(() => {
        this.flushCost();
      }, 2000);
    }
  }

  // Legacy method for backward compatibility
  async accumulateTokens(tokens: number): Promise<void> {
    this.pendingCost += tokens;
    
    // Batch spend when we reach the threshold
    if (this.pendingCost >= this.batchCostThreshold) {
      await this.flushCost();
    } else {
      // Set a timer to flush remaining cost after 2 seconds of inactivity
      if (this.spendTimer) {
        clearTimeout(this.spendTimer);
      }
      this.spendTimer = setTimeout(() => {
        this.flushCost();
      }, 2000);
    }
  }

  async flushCost(): Promise<void> {
    if (this.pendingCost <= 0) return;

    const costToSpend = this.pendingCost;
    this.pendingCost = 0;

    if (this.spendTimer) {
      clearTimeout(this.spendTimer);
      this.spendTimer = undefined;
    }

    try {
      console.log(`Spending ${costToSpend.toFixed(3)} credits for user ${this.userId}`);
      
      const response = await fetch(`${this.supabaseUrl}/functions/v1/spend_tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.ceil(costToSpend), // Round up for API call
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to spend credits:', error);
        
        // If insufficient credits, throw error to stop stream
        if (response.status === 402) {
          throw new Error('insufficient_credits');
        }
      }
    } catch (error) {
      console.error('Credit spending error:', error);
      // Re-add cost back to pending if spend failed (except for insufficient credits)
      if (error.message !== 'insufficient_credits') {
        this.pendingCost += costToSpend;
      }
      throw error;
    }
  }

  async finalize(): Promise<void> {
    // Calculate final accurate cost based on accumulated text
    if (this.accumulatedText) {
      const { calculateStreamingCost } = await import('./costs.js');
      const actualCost = calculateStreamingCost(this.modelId, this.promptTokens, this.accumulatedText);
      
      // Add any remaining accurate cost calculation
      this.pendingCost += actualCost;
      console.log(`Final cost calculation: ${actualCost} credits for ${this.accumulatedText.length} characters`);
    }
    
    // Flush any remaining cost
    await this.flushCost();
  }
}
