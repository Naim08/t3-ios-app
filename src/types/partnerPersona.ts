// Partner Persona Types
// Defines the structure for romantic companion personas with enhanced customization

export interface PersonalityTrait {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'emotional' | 'communication' | 'lifestyle' | 'intimacy';
  oppositeTraitId?: string; // For slider-based traits like introvert/extrovert
}

export interface PersonalityTraitValue {
  traitId: string;
  intensity: number; // 0-10 scale for how strong this trait is
}

export interface PartnerPersonaCustomization {
  // Basic Info
  relationshipType: 'girlfriend' | 'boyfriend' | 'romantic_friend' | 'life_partner';
  intimacyLevel: 'casual' | 'romantic' | 'intimate' | 'deep';
  
  // Personality Traits (selected from available traits)
  personalityTraits: PersonalityTraitValue[];
  
  // Communication Style
  communicationStyle: 'playful' | 'serious' | 'balanced' | 'flirty' | 'caring';
  communicationPreferences: {
    usesPetNames: boolean;
    preferredPetNames: string[];
    textingStyle: 'formal' | 'casual' | 'emoji-heavy' | 'minimal';
    conversationDepth: 'light' | 'moderate' | 'deep' | 'philosophical';
  };
  
  // Memory & Learning Preferences
  memoryPreferences: {
    rememberPersonalDetails: boolean;
    rememberConversations: boolean;
    rememberMilestones: boolean;
    autoExtractMemories: boolean;
    memoryRetentionLevel: 'basic' | 'detailed' | 'comprehensive';
  };
  
  // Relationship Dynamics
  relationshipPreferences: {
    supportStyle: 'emotional' | 'practical' | 'both';
    conflictResolution: 'direct' | 'gentle' | 'collaborative';
    affectionLevel: 'reserved' | 'moderate' | 'very_affectionate';
    independenceLevel: 'very_independent' | 'balanced' | 'close_connection';
  };
  
  // Appearance & Voice (descriptive)
  appearance?: {
    description: string; // User's description of their partner's appearance
    voiceStyle: 'warm' | 'sultry' | 'cheerful' | 'calm' | 'energetic';
  };
  
  // Privacy Settings
  privacySettings: {
    conversationEncryption: boolean;
    dataRetentionDays: number | null; // null = indefinite
    allowAnalytics: boolean;
    shareWithAITraining: boolean;
  };
}

// Predefined personality traits for selection
export const PERSONALITY_TRAITS: PersonalityTrait[] = [
  // Emotional Traits
  {
    id: 'caring',
    name: 'Caring',
    description: 'Deeply empathetic and nurturing, always puts your wellbeing first',
    icon: '🤗',
    category: 'emotional',
  },
  {
    id: 'passionate',
    name: 'Passionate',
    description: 'Intense emotions and strong feelings about everything',
    icon: '🔥',
    category: 'emotional',
  },
  {
    id: 'calm',
    name: 'Calm',
    description: 'Peaceful, stable, and emotionally balanced',
    icon: '😌',
    category: 'emotional',
    oppositeTraitId: 'passionate',
  },
  {
    id: 'optimistic',
    name: 'Optimistic',
    description: 'Always sees the bright side and encourages positivity',
    icon: '☀️',
    category: 'emotional',
  },
  {
    id: 'protective',
    name: 'Protective',
    description: 'Strong desire to keep you safe and secure',
    icon: '🛡️',
    category: 'emotional',
  },
  
  // Communication Traits
  {
    id: 'playful',
    name: 'Playful',
    description: 'Loves humor, teasing, and keeping things light and fun',
    icon: '😄',
    category: 'communication',
  },
  {
    id: 'intellectual',
    name: 'Intellectual',
    description: 'Enjoys deep conversations and exploring complex ideas',
    icon: '🧠',
    category: 'communication',
  },
  {
    id: 'expressive',
    name: 'Expressive',
    description: 'Open with emotions and communicates feelings clearly',
    icon: '💭',
    category: 'communication',
  },
  {
    id: 'mysterious',
    name: 'Mysterious',
    description: 'Intriguing and doesn\'t reveal everything at once',
    icon: '🌙',
    category: 'communication',
    oppositeTraitId: 'expressive',
  },
  {
    id: 'supportive',
    name: 'Supportive',
    description: 'Always there to listen and offer encouragement',
    icon: '🤝',
    category: 'communication',
  },
  
  // Lifestyle Traits
  {
    id: 'adventurous',
    name: 'Adventurous',
    description: 'Loves trying new experiences and exploring together',
    icon: '🌍',
    category: 'lifestyle',
  },
  {
    id: 'homebody',
    name: 'Homebody',
    description: 'Prefers cozy nights in and intimate home settings',
    icon: '🏡',
    category: 'lifestyle',
    oppositeTraitId: 'adventurous',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Artistic, imaginative, and loves creative expression',
    icon: '🎨',
    category: 'lifestyle',
  },
  {
    id: 'ambitious',
    name: 'Ambitious',
    description: 'Goal-oriented and driven to achieve great things',
    icon: '🚀',
    category: 'lifestyle',
  },
  {
    id: 'spontaneous',
    name: 'Spontaneous',
    description: 'Impulsive and loves surprise plans and adventures',
    icon: '✨',
    category: 'lifestyle',
  },
  
  // Intimacy Traits
  {
    id: 'romantic',
    name: 'Romantic',
    description: 'Loves romantic gestures and creating special moments',
    icon: '💕',
    category: 'intimacy',
  },
  {
    id: 'flirty',
    name: 'Flirty',
    description: 'Playfully seductive with natural charm',
    icon: '😘',
    category: 'intimacy',
  },
  {
    id: 'intimate',
    name: 'Intimate',
    description: 'Values deep emotional and physical connection',
    icon: '💖',
    category: 'intimacy',
  },
  {
    id: 'gentle',
    name: 'Gentle',
    description: 'Tender, soft, and approaches intimacy with care',
    icon: '🌸',
    category: 'intimacy',
  },
  {
    id: 'confident',
    name: 'Confident',
    description: 'Self-assured and comfortable with intimacy',
    icon: '💪',
    category: 'intimacy',
  },
];

// Helper functions for personality traits
export const getTraitsByCategory = (category: PersonalityTrait['category']): PersonalityTrait[] => {
  return PERSONALITY_TRAITS.filter(trait => trait.category === category);
};

export const getTraitById = (id: string): PersonalityTrait | undefined => {
  return PERSONALITY_TRAITS.find(trait => trait.id === id);
};

export const getOppositeTraits = (traitId: string): PersonalityTrait | undefined => {
  const trait = getTraitById(traitId);
  if (trait?.oppositeTraitId) {
    return getTraitById(trait.oppositeTraitId);
  }
  return PERSONALITY_TRAITS.find(t => t.oppositeTraitId === traitId);
};

// Default personality trait values for different partner types
export const DEFAULT_TRAIT_VALUES: Record<PartnerPersonaCustomization['relationshipType'], PersonalityTraitValue[]> = {
  girlfriend: [
    { traitId: 'caring', intensity: 8 },
    { traitId: 'romantic', intensity: 7 },
    { traitId: 'supportive', intensity: 8 },
    { traitId: 'expressive', intensity: 6 },
    { traitId: 'optimistic', intensity: 7 },
  ],
  boyfriend: [
    { traitId: 'protective', intensity: 8 },
    { traitId: 'supportive', intensity: 8 },
    { traitId: 'confident', intensity: 7 },
    { traitId: 'caring', intensity: 7 },
    { traitId: 'romantic', intensity: 6 },
  ],
  romantic_friend: [
    { traitId: 'caring', intensity: 7 },
    { traitId: 'gentle', intensity: 8 },
    { traitId: 'supportive', intensity: 8 },
    { traitId: 'intellectual', intensity: 6 },
    { traitId: 'mysterious', intensity: 5 },
  ],
  life_partner: [
    { traitId: 'caring', intensity: 9 },
    { traitId: 'supportive', intensity: 9 },
    { traitId: 'ambitious', intensity: 7 },
    { traitId: 'calm', intensity: 8 },
    { traitId: 'intimate', intensity: 8 },
  ],
};

// All types and constants are exported above 