// Modern avatar utility with reliable sources

export type AvatarProvider = 'ui-avatars' | 'gravatar' | 'dicebear' | 'local';

export const DEFAULT_AVATARS = [
  { id: 'avatar-1', name: 'Alex Chen', color: '6366f1' },
  { id: 'avatar-2', name: 'Maya Patel', color: 'ec4899' },
  { id: 'avatar-3', name: 'Sam Rivera', color: '10b981' },
  { id: 'avatar-4', name: 'Jordan Kim', color: 'f59e0b' },
  { id: 'avatar-5', name: 'Casey Wong', color: 'ef4444' },
  { id: 'avatar-6', name: 'Riley Moore', color: '8b5cf6' }
] as const;

export type DefaultAvatarId = typeof DEFAULT_AVATARS[number]['id'];

// Generate avatar URL using UI Avatars (most reliable)
export function getUIAvatarUrl(
  name: string,
  size = 200,
  backgroundColor = '6366f1'
): string {
  const cleanName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${cleanName}&size=${size}&background=${backgroundColor}&color=fff&bold=true&format=png&rounded=true`;
}

// Fallback: Generate avatar URL using DiceBear API
export function getDiceBearUrl(
  seed: string,
  style: 'bottts' | 'avataaars' | 'pixel-art' = 'bottts',
  size = 200
): string {
  return `https://api.dicebear.com/7.x/${style}/png?seed=${seed}&size=${size}&backgroundColor=transparent`;
}

// Generate Gravatar URL from email
export function getGravatarUrl(email: string, size = 200): string {
  // Simple hash function (you might want to use a proper crypto library)
  const hash = Array.from(email.toLowerCase().trim())
    .reduce((hash, char) => {
      const chr = char.charCodeAt(0);
      hash = ((hash << 5) - hash) + chr;
      return hash & hash; // Convert to 32-bit integer
    }, 0)
    .toString(16)
    .padStart(8, '0');
    
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=pg`;
}

// Main function: Get default avatar with fallback chain
export function getDefaultAvatarUrl(
  avatarId: DefaultAvatarId,
  size = 200,
  provider: AvatarProvider = 'ui-avatars'
): string {
  const avatar = DEFAULT_AVATARS.find(a => a.id === avatarId);
  if (!avatar) return getUIAvatarUrl('User', size, '6366f1');

  switch (provider) {
    case 'ui-avatars':
      return getUIAvatarUrl(avatar.name, size, avatar.color);
    case 'dicebear':
      return getDiceBearUrl(avatarId, 'bottts', size);
    case 'gravatar':
      return getGravatarUrl(`${avatarId}@example.com`, size);
    default:
      return getUIAvatarUrl(avatar.name, size, avatar.color);
  }
}

// Get multiple avatar options for user to choose from during setup
export function getAvatarOptions(provider: AvatarProvider = 'ui-avatars'): Array<{
  id: DefaultAvatarId;
  url: string;
  name: string;
  color: string;
}> {
  return DEFAULT_AVATARS.map(avatar => ({
    id: avatar.id,
    url: getDefaultAvatarUrl(avatar.id, 200, provider),
    name: avatar.name,
    color: avatar.color
  }));
}

// Get different avatar provider options
export function getAvatarProviderOptions(): Array<{
  provider: AvatarProvider;
  name: string;
  description: string;
  reliable: boolean;
}> {
  return [
    { 
      provider: 'ui-avatars', 
      name: 'Text Avatars', 
      description: 'Clean, professional text-based avatars',
      reliable: true 
    },
    { 
      provider: 'dicebear', 
      name: 'Illustrated', 
      description: 'Colorful illustrated characters',
      reliable: false 
    },
    { 
      provider: 'gravatar', 
      name: 'Gravatar', 
      description: 'Industry standard avatar service',
      reliable: true 
    }
  ];
}

// Get avatar URL for a user profile
export function getUserAvatarUrl(profile: {
  avatar_type: 'default' | 'uploaded';
  avatar_url?: string | null;
  default_avatar_id?: string | null;
}, size = 200): string {
  if (profile.avatar_type === 'uploaded' && profile.avatar_url) {
    return profile.avatar_url;
  }
  
  if (profile.default_avatar_id) {
    return getDefaultAvatarUrl(profile.default_avatar_id as DefaultAvatarId, size, 'ui-avatars');
  }
  
  // Fallback to first default avatar
  return getDefaultAvatarUrl('avatar-1', size, 'ui-avatars');
}

// Generate random default avatar for new users
export function getRandomDefaultAvatar(): DefaultAvatarId {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)].id;
}