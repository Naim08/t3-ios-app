import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

export interface PendingPurchase {
  id: string;
  receiptData: string;
  userId: string;
  timestamp: number;
  productId: string;
  transactionId: string;
}

const PENDING_PURCHASES_KEY = 'pending_purchases';

export class OfflinePurchaseQueue {
  private static instance: OfflinePurchaseQueue;
  private isProcessing = false;

  static getInstance(): OfflinePurchaseQueue {
    if (!OfflinePurchaseQueue.instance) {
      OfflinePurchaseQueue.instance = new OfflinePurchaseQueue();
    }
    return OfflinePurchaseQueue.instance;
  }

  async addPendingPurchase(purchase: Omit<PendingPurchase, 'id' | 'timestamp'>): Promise<void> {
    try {
      const pendingPurchases = await this.getPendingPurchases();
      
      const newPurchase: PendingPurchase = {
        ...purchase,
        id: `${purchase.transactionId}_${Date.now()}`,
        timestamp: Date.now(),
      };

      pendingPurchases.push(newPurchase);
      await AsyncStorage.setItem(PENDING_PURCHASES_KEY, JSON.stringify(pendingPurchases));
      
      console.log('Added purchase to offline queue:', newPurchase.id);
      
      // Try to process immediately if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        this.processPendingPurchases();
      }
    } catch (error) {
      console.error('Failed to add pending purchase:', error);
    }
  }

  async getPendingPurchases(): Promise<PendingPurchase[]> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_PURCHASES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get pending purchases:', error);
      return [];
    }
  }

  async removePendingPurchase(purchaseId: string): Promise<void> {
    try {
      const pendingPurchases = await this.getPendingPurchases();
      const filtered = pendingPurchases.filter(p => p.id !== purchaseId);
      await AsyncStorage.setItem(PENDING_PURCHASES_KEY, JSON.stringify(filtered));
      console.log('Removed purchase from offline queue:', purchaseId);
    } catch (error) {
      console.error('Failed to remove pending purchase:', error);
    }
  }

  async processPendingPurchases(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      console.log('Already processing pending purchases');
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;

    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('No internet connection, skipping pending purchase processing');
        return { processed, failed };
      }

      const pendingPurchases = await this.getPendingPurchases();
      console.log(`Processing ${pendingPurchases.length} pending purchases`);

      for (const purchase of pendingPurchases) {
        try {
          const { data, error } = await supabase.functions.invoke('validate_receipt', {
            body: {
              receipt_data: purchase.receiptData,
              user_id: purchase.userId,
            },
          });

          if (error) {
            throw error;
          }

          if (data.success || data.alreadyProcessed) {
            await this.removePendingPurchase(purchase.id);
            processed++;
            console.log('Successfully processed pending purchase:', purchase.id);
          } else {
            throw new Error(data.error || 'Validation failed');
          }
        } catch (error) {
          console.error('Failed to process pending purchase:', purchase.id, error);
          
          // Remove purchases older than 7 days to prevent infinite retries
          const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          if (purchase.timestamp < weekAgo) {
            await this.removePendingPurchase(purchase.id);
            console.log('Removed expired pending purchase:', purchase.id);
          }
          
          failed++;
        }
      }
    } catch (error) {
      console.error('Error processing pending purchases:', error);
    } finally {
      this.isProcessing = false;
    }

    console.log(`Processed ${processed} pending purchases, ${failed} failed`);
    return { processed, failed };
  }

  async clearAllPendingPurchases(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_PURCHASES_KEY);
      console.log('Cleared all pending purchases');
    } catch (error) {
      console.error('Failed to clear pending purchases:', error);
    }
  }

  // Set up network listener to process purchases when coming back online
  startNetworkListener(): () => void {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing) {
        console.log('Network connected, processing pending purchases');
        this.processPendingPurchases();
      }
    });

    return unsubscribe;
  }
}
