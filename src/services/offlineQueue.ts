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
  private networkUnsubscribe?: () => void;

  private constructor() {
    this.setupNetworkListener();
  }

  static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue();
    }
    return OfflineQueue.instance;
  }

  // For testing - reset the singleton
  static resetInstance(): void {
    if (OfflineQueue.instance?.networkUnsubscribe) {
      OfflineQueue.instance.networkUnsubscribe();
    }
    OfflineQueue.instance = undefined as any;
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
    try {
      this.networkUnsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && !this.isProcessing) {
          this.processQueue();
        }
      });
    } catch (error) {
      console.error('Failed to setup network listener:', error);
    }
  }

  async queueSpend(amount: number): Promise<void> {
    try {
      // Load existing queue first
      await this.loadQueue();

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
    } catch (error) {
      console.error('Failed to queue spend:', error);
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
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async getQueuedAmount(): Promise<number> {
    try {
      await this.loadQueue();
      return this.queue.reduce((total, spend) => total + spend.amount, 0);
    } catch (error) {
      console.error('Failed to get queued amount:', error);
      return 0;
    }
  }

  async clearQueue(): Promise<void> {
    try {
      this.queue = [];
      await this.saveQueue();
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }
}

export const offlineQueue = OfflineQueue.getInstance();
export { OfflineQueue };
export default offlineQueue;