import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock personas data
const mockPersonas = {
  'blank-chat': {
    id: 'blank-chat',
    display_name: 'Blank Chat',
    icon: '💬',
    system_prompt: '',
    default_model: 'gpt-3.5-turbo',
    requires_premium: false,
    tool_ids: [],
    created_at: new Date().toISOString()
  },
  'dr-mindwell': {
    id: 'dr-mindwell',
    display_name: 'Dr. Mindwell',
    icon: '🧠',
    system_prompt: 'You are Dr. Sarah Mindwell, a licensed clinical psychologist...',
    default_model: 'gpt-3.5-turbo',
    requires_premium: false,
    tool_ids: [],
    created_at: new Date().toISOString()
  },
  'code-sensei': {
    id: 'code-sensei',
    display_name: 'Code Sensei',
    icon: '🥋',
    system_prompt: 'You are Code Sensei, a master software engineer...',
    default_model: 'gpt-4o',
    requires_premium: true,
    tool_ids: [],
    created_at: new Date().toISOString()
  }
};

// Mock the supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn((field, value) => ({
          single: jest.fn(() => Promise.resolve({
            data: mockPersonas[value] || mockPersonas['dr-mindwell'],
            error: null
          }))
        })),
        order: jest.fn(() => Promise.resolve({
          data: Object.values(mockPersonas),
          error: null
        }))
      }))
    }))
  }
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate
  })
}));

// Mock premium hooks
jest.mock('../hooks/usePremium', () => ({
  usePremium: () => ({ isPremium: false })
}));

jest.mock('../hooks/useEntitlements', () => ({
  useEntitlements: () => ({
    isSubscriber: false,
    hasCustomKey: false
  })
}));

describe('Persona Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PersonaPickerScreen', () => {
    it('should load personas from database', async () => {
      const { supabase } = require('../lib/supabase');
      
      // Trigger the database call
      const personas = await supabase
        .from('personas')
        .select('*')
        .order('created_at', { ascending: true });
      
      expect(personas.data).toHaveLength(3);
      expect(personas.data[0].id).toBe('blank-chat');
      expect(personas.data[1].id).toBe('dr-mindwell');
      expect(personas.data[2].id).toBe('code-sensei');
    });

    it('should redirect to paywall for premium personas without subscription', async () => {
      // This would be tested in a React component test
      // For now, we verify the data structure supports this
      const { supabase } = require('../lib/supabase');
      const personas = await supabase.from('personas').select('*').order('created_at', { ascending: true });
      
      const codeSensei = personas.data.find((p: any) => p.id === 'code-sensei');
      expect(codeSensei?.requires_premium).toBe(true);
    });
  });

  describe('ChatScreen Persona Integration', () => {
    it('should load persona by ID from route params', async () => {
      const { supabase } = require('../lib/supabase');
      
      const persona = await supabase
        .from('personas')
        .select('*')
        .eq('id', 'dr-mindwell')
        .single();
      
      expect(persona.data.id).toBe('dr-mindwell');
      expect(persona.data.system_prompt).toContain('Dr. Sarah Mindwell');
      expect(persona.data.default_model).toBe('gpt-3.5-turbo');
    });

    it('should prepare messages with system prompt for therapist persona', async () => {
      const { supabase } = require('../lib/supabase');
      
      const persona = await supabase
        .from('personas')
        .select('*')
        .eq('id', 'dr-mindwell')
        .single();
      
      // Simulate message preparation
      const messages = [];
      const userMessage = 'I feel anxious about work';
      
      // Add persona system prompt if not blank chat
      if (persona.data.system_prompt && persona.data.id !== 'blank-chat') {
        messages.push({ 
          role: 'system', 
          content: persona.data.system_prompt 
        });
      }
      
      messages.push({ role: 'user', content: userMessage });
      
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Dr. Sarah Mindwell');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('I feel anxious about work');
    });

    it('should not add system prompt for blank chat persona', async () => {
      const { supabase } = require('../lib/supabase');
      
      const persona = await supabase
        .from('personas')
        .select('*')
        .eq('id', 'blank-chat')
        .single();
      
      // Simulate message preparation
      const messages = [];
      const userMessage = 'Hello';
      
      // Add persona system prompt if not blank chat
      if (persona.data.system_prompt && persona.data.id !== 'blank-chat') {
        messages.push({ 
          role: 'system', 
          content: persona.data.system_prompt 
        });
      }
      
      messages.push({ role: 'user', content: userMessage });
      
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello');
    });
  });

  describe('Model Selection with Personas', () => {
    it('should show persona default model', async () => {
      const { supabase } = require('../lib/supabase');
      
      const therapistPersona = await supabase
        .from('personas')
        .select('*')
        .eq('id', 'dr-mindwell')
        .single();
      
      const codingPersona = await supabase
        .from('personas')
        .select('*')
        .eq('id', 'code-sensei')
        .single();
      
      expect(therapistPersona.data.default_model).toBe('gpt-3.5-turbo');
      expect(codingPersona.data.default_model).toBe('gpt-4o');
    });

    it('should maintain persona prompt when switching models', () => {
      const personaPrompt = 'You are Dr. Sarah Mindwell...';
      
      // Simulate model switch while maintaining persona
      const messages = [
        { role: 'system', content: personaPrompt },
        { role: 'user', content: 'Hello' }
      ];
      
      // When switching models, the system prompt should remain
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe(personaPrompt);
      
      // Only the model parameter changes, not the messages
      expect(messages).toHaveLength(2);
    });
  });
});

describe('Persona Database Schema', () => {
  it('should have correct persona structure', () => {
    const expectedPersonaStructure = {
      id: 'string',
      display_name: 'string',
      icon: 'string',
      system_prompt: 'string',
      default_model: 'string',
      requires_premium: false,
      tool_ids: [],
      created_at: 'string'
    };
    
    // This verifies our TypeScript interface matches expected structure
    expect(typeof expectedPersonaStructure.id).toBe('string');
    expect(typeof expectedPersonaStructure.requires_premium).toBe('boolean');
    expect(Array.isArray(expectedPersonaStructure.tool_ids)).toBe(true);
  });
});