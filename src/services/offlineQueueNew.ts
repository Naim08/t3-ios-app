import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { spendTokens } from '../hooks/useCredits';

interface QueuedSpend {
  id: string;
  amount: number;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'pending_token_spends';
const MAX_RETRIES = 3;

class OfflineQueue {
  private processing = false;
  private listeners: (() => void)[] = [];

  constructor() {
    // Listen for network changes
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Add a token spend to the offline queue
   */
  async queueSpend(amount: number): Promise<void> {
    const spend: QueuedSpend = {
      id: Date.now().toString(),
      amount,
      timestamp: Date.now(),
      retries: 0,
    };

    try {
      const existing = await this.getQueue();
      const updated = [...existing, spend];
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
      
      // Try to process immediately if online
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        this.processQueue();
      }
    } catch (error) {
      console.error('Failed to queue spend:', error);
      throw error;
    }
  }

  /**
   * Get all queued spends
   */
  async getQueue(): Promise<QueuedSpend[]> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Process all queued spends
   */
  async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;
    const queue = await this.getQueue();
    const failed: QueuedSpend[] = [];

    for (const spend of queue) {
      try {
        await spendTokens(spend.amount);
        // Success - remove from queue (implicitly by not adding to failed)
      } catch (error) {
        console.warn(`Failed to process spend ${spend.id}:`, error);
        
        // Increment retries
        spend.retries += 1;
        
        // Keep if under max retries
        if (spend.retries < MAX_RETRIES) {
          failed.push(spend);
        } else {
          console.error(`Dropping spend ${spend.id} after ${MAX_RETRIES} retries`);
        }
      }
    }

    // Update queue with failed items
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
    
    this.processing = false;
    this.notifyListeners();
  }

  /**
   * Get count of pending spends
   */
  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.reduce((total, spend) => total + spend.amount, 0);
  }

  /**
   * Clear all queued spends (for testing/debugging)
   */
  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
    this.notifyListeners();
  }

  /**
   * Add listener for queue changes
   */
  addListener(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const offlineQueue = new OfflineQueue();

/**
 * Enhanced spend function that handles offline scenarios
 */
export const spendTokensWithQueue = async (amount: number): Promise<{ remaining?: number; queued: boolean }> => {
  const netState = await NetInfo.fetch();
  
  if (!netState.isConnected) {
    // Offline - queue the spend
    await offlineQueue.queueSpend(amount);
    return { queued: true };
  }

  try {
    // Online - try direct spend
    const result = await spendTokens(amount);
    return { remaining: result.remaining, queued: false };
  } catch (error) {
    // Network error - queue for later
    console.warn('Direct spend failed, queuing:', error);
    await offlineQueue.queueSpend(amount);
    return { queued: true };
  }
};
