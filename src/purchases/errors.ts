import Toast from 'react-native-toast-message';

export interface ErrorDetails {
  code?: string;
  message: string;
  userFriendlyMessage?: string;
}

export class PurchaseError extends Error {
  code?: string;
  userFriendlyMessage?: string;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.code = details.code;
    this.userFriendlyMessage = details.userFriendlyMessage || details.message;
    this.name = 'PurchaseError';
  }
}

export const showPurchaseError = (error: Error | PurchaseError) => {
  const isPurchaseError = error instanceof PurchaseError;
  const message = isPurchaseError ? error.userFriendlyMessage : 'An unexpected error occurred';
  
  Toast.show({
    type: 'error',
    text1: 'Purchase Error',
    text2: message,
    visibilityTime: 4000,
    autoHide: true,
  });
};

export const showPurchaseSuccess = (message: string = 'Purchase completed successfully!') => {
  Toast.show({
    type: 'success',
    text1: 'Purchase Successful',
    text2: message,
    visibilityTime: 3000,
    autoHide: true,
  });
};

export const showRestoreSuccess = (count: number) => {
  Toast.show({
    type: 'success',
    text1: 'Purchases Restored',
    text2: `${count} purchase${count !== 1 ? 's' : ''} restored successfully`,
    visibilityTime: 3000,
    autoHide: true,
  });
};

export const showRestoreInfo = (message: string) => {
  Toast.show({
    type: 'info',
    text1: 'Restore Purchases',
    text2: message,
    visibilityTime: 3000,
    autoHide: true,
  });
};
