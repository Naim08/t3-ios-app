/**
 * ChatScreen - Basic Test
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ChatScreen } from '../ChatScreen';

// Mock all dependencies
jest.mock('../../hooks/useEntitlements', () => ({
  useEntitlements: () => ({
    isSubscriber: false,
    hasCustomKey: false,
  }),
}));

jest.mock('../../hooks/useCredits', () => ({
  useCredits: () => ({
    remaining: 100,
    refetch: jest.fn(),
  }),
}));

jest.mock('../useStream', () => ({
  useStream: () => ({
    isStreaming: false,
    streamingText: '',
    error: null,
    startStream: jest.fn(),
    abortStream: jest.fn(),
    retryStream: jest.fn(),
  }),
}));

describe('ChatScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  it('renders without crashing', () => {
    const { getByText } = render(
      <ChatScreen navigation={mockNavigation} />
    );
    
    expect(getByText('AI Assistant')).toBeTruthy();
  });
});
