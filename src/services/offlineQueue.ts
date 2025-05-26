import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { spendTokens } from '../hooks/useCredits';

interface QueuedSpend {
  id: string;
  amount: number;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private static instance: OfflineQueue;
  private queue: QueuedSpend[] = [];
  private isProcessing = false;
  private readonly QUEUE_KEY = 'credits_offline_queue';
  private readonly MAX_RETRIES = 3;

  private constructor() {
    this.loadQueue();
    this.setupNetworkListener();
  }

  static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue();
    }
    return OfflineQueue.instance;
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_KEY);
      this.queue = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async queueSpend(amount: number): Promise<void> {
    const spend: QueuedSpend = {
      id: `${Date.now()}_${Math.random()}`,
      amount,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(spend);
    await this.saveQueue();

    // Try to process immediately if online
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        return;
      }

      // Process items one by one to maintain order
      while (this.queue.length > 0) {
        const spend = this.queue[0];

        try {
          await spendTokens(spend.amount);
          // Success - remove from queue
          this.queue.shift();
          await this.saveQueue();
        } catch (error) {
          console.error('Failed to process queued spend:', error);

          spend.retries++;
          if (spend.retries >= this.MAX_RETRIES) {
            // Max retries reached - remove from queue and log
            console.error(`Dropping spend after ${this.MAX_RETRIES} retries:`, spend);
            this.queue.shift();
          } else {
            // Keep in queue for retry, but break to avoid infinite loop
            break;
          }
          await this.saveQueue();
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async getQueuedAmount(): Promise<number> {
    return this.queue.reduce((total, spend) => total + spend.amount, 0);
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }
}

export const offlineQueue = OfflineQueue.getInstance();
export default offlineQueue;