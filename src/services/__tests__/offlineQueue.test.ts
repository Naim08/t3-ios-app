import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueue } from '../offlineQueue';
import { spendTokens } from '../../hooks/useCredits';

// Setup environment variables for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../../hooks/useCredits');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockSpendTokens = spendTokens as jest.MockedFunction<typeof spendTokens>;

describe('OfflineQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
    mockNetInfo.addEventListener.mockReturnValue(() => {});
  });

  it('should queue spend when offline', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: false } as any);

    await offlineQueue.queueSpend(100);

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'credits_offline_queue',
      expect.stringContaining('"amount":100')
    );
    expect(mockSpendTokens).not.toHaveBeenCalled();
  });

  it('should process queue immediately when online', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
    mockSpendTokens.mockResolvedValue({ remaining: 900 });

    await offlineQueue.queueSpend(100);

    expect(mockSpendTokens).toHaveBeenCalledWith(100);
  });

  it('should handle failed spends gracefully', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
    mockSpendTokens.mockRejectedValueOnce(new Error('Network error'));

    // This should not throw, but handle the error internally
    await expect(offlineQueue.queueSpend(100)).resolves.not.toThrow();
    expect(mockSpendTokens).toHaveBeenCalledWith(100);
  });

  it('should calculate queued amount correctly', async () => {
    // First queue some items
    mockNetInfo.fetch.mockResolvedValue({ isConnected: false } as any);
    
    await offlineQueue.queueSpend(100);
    await offlineQueue.queueSpend(200);

    const queuedAmount = await offlineQueue.getQueuedAmount();
    expect(queuedAmount).toBe(300);
  });

  it('should clear queue', async () => {
    await offlineQueue.clearQueue();

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'credits_offline_queue',
      '[]'
    );
  });

  it('should process queue when network comes online', async () => {
    // Set up offline queue with pending items
    mockNetInfo.fetch.mockResolvedValue({ isConnected: false } as any);
    await offlineQueue.queueSpend(100);
    
    // Verify that addEventListener was called during initialization
    expect(mockNetInfo.addEventListener).toHaveBeenCalled();
  });
});
