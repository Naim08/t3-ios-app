
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  isStreaming?: boolean;
}

export interface StreamMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Temporary mock messages
export const mockMessages: Message[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Hi! Ask me anything about React Native.',
    createdAt: '2025-05-23T15:00:00Z'
  },
  {
    id: 'm2',
    role: 'user',
    text: 'How do I optimize Hermes startup time?',
    createdAt: '2025-05-23T15:00:05Z'
  },
  {
    id: 'm3',
    role: 'assistant',
    text: `Here are some ways to optimize Hermes startup time:

## 1. Enable Hermes bytecode precompilation
- Use \`--bytecode\` flag when building
- This reduces JS parsing time

## 2. Optimize bundle size
\`\`\`javascript
// Use Metro bundler optimizations
module.exports = {
  transformer: {
    minifierConfig: {
      mangle: { toplevel: true },
      compress: { drop_console: true }
    }
  }
};
\`\`\`

## 3. Lazy load modules
Only import what you need when you need it.`,
    createdAt: '2025-05-23T15:00:10Z'
  },
  {
    id: 'm4',
    role: 'user',
    text: 'What about reducing memory usage?',
    createdAt: '2025-05-23T15:00:15Z'
  }
] as const;
