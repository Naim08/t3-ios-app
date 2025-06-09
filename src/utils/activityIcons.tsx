import React from 'react';
import { 
  MapPin, 
  Camera, 
  Mountain, 
  Building2, 
  Music, 
  UtensilsCrossed, 
  ShoppingBag, 
  Waves,
  Clock,
  DollarSign,
  Coffee,
  Wine,
  Utensils,
  TreePine,
  Landmark,
  Palette,
  Theater,
  Church,
  Castle,
  Train,
  Car,
  Plane,
  Ship,
  Hotel,
  Gift,
  Heart,
  Star,
  Binoculars,
  Ticket,
  Users
} from 'lucide-react-native';

export interface ActivityLike {
  name: string;
  type?: 'sightseeing' | 'adventure' | 'cultural' | 'entertainment' | 'dining' | 'shopping' | 'relaxation';
  description?: string;
  location?: string;
}

interface IconProps {
  size: number;
  color: string;
}

/**
 * Get contextual icon based on activity/location name and description
 * Shared utility to avoid duplication across TimelineItem and MapScreen
 */
export const getActivityIcon = (activity: ActivityLike, iconProps: IconProps = { size: 16, color: '#FFFFFF' }) => {
  const text = `${activity.name} ${activity.description || ''} ${activity.location || ''}`.toLowerCase();
  
  // Food & Dining
  if (text.includes('breakfast') || text.includes('brunch')) return <Coffee {...iconProps} />;
  if (text.includes('lunch') || text.includes('dinner') || text.includes('restaurant') || 
      text.includes('cafe') || text.includes('bistro') || text.includes('brasserie')) return <Utensils {...iconProps} />;
  if (text.includes('bar') || text.includes('wine') || text.includes('cocktail') || text.includes('pub')) return <Wine {...iconProps} />;
  
  // Nature & Parks
  if (text.includes('park') || text.includes('garden') || text.includes('forest') || text.includes('tree')) return <TreePine {...iconProps} />;
  if (text.includes('beach') || text.includes('ocean') || text.includes('sea') || 
      text.includes('lake') || text.includes('river')) return <Waves {...iconProps} />;
  if (text.includes('mountain') || text.includes('hill') || text.includes('hiking') || text.includes('trek')) return <Mountain {...iconProps} />;
  
  // Culture & History
  if (text.includes('museum') || text.includes('gallery') || text.includes('art') || text.includes('exhibition')) return <Palette {...iconProps} />;
  if (text.includes('church') || text.includes('cathedral') || text.includes('chapel') || text.includes('temple')) return <Church {...iconProps} />;
  if (text.includes('castle') || text.includes('palace') || text.includes('fort') || text.includes('tower')) return <Castle {...iconProps} />;
  if (text.includes('monument') || text.includes('memorial') || text.includes('statue') || text.includes('landmark')) return <Landmark {...iconProps} />;
  
  // Entertainment
  if (text.includes('theater') || text.includes('theatre') || text.includes('opera') || 
      text.includes('concert') || text.includes('show')) return <Theater {...iconProps} />;
  if (text.includes('music') || text.includes('jazz') || text.includes('band') || text.includes('symphony')) return <Music {...iconProps} />;
  
  // Shopping
  if (text.includes('shop') || text.includes('store') || text.includes('market') || 
      text.includes('boutique') || text.includes('mall')) return <ShoppingBag {...iconProps} />;
  if (text.includes('souvenir') || text.includes('gift')) return <Gift {...iconProps} />;
  
  // Transportation
  if (text.includes('train') || text.includes('subway') || text.includes('metro') || text.includes('railway')) return <Train {...iconProps} />;
  if (text.includes('taxi') || text.includes('uber') || text.includes('drive') || text.includes('car')) return <Car {...iconProps} />;
  if (text.includes('flight') || text.includes('airport') || text.includes('plane')) return <Plane {...iconProps} />;
  if (text.includes('boat') || text.includes('ferry') || text.includes('cruise') || text.includes('ship')) return <Ship {...iconProps} />;
  
  // Accommodation
  if (text.includes('hotel') || text.includes('hostel') || text.includes('accommodation') || 
      text.includes('check-in') || text.includes('check-out')) return <Hotel {...iconProps} />;
  
  // Activities & Attractions
  if (text.includes('tour') || text.includes('guide') || text.includes('visit') || text.includes('explore')) return <Binoculars {...iconProps} />;
  if (text.includes('ticket') || text.includes('entry') || text.includes('admission')) return <Ticket {...iconProps} />;
  if (text.includes('photo') || text.includes('picture') || text.includes('photography') || 
      text.includes('viewpoint') || text.includes('observation')) return <Camera {...iconProps} />;
  if (text.includes('group') || text.includes('meeting') || text.includes('social') || text.includes('people')) return <Users {...iconProps} />;
  
  // Experiences
  if (text.includes('experience') || text.includes('special') || text.includes('unique') || text.includes('highlight')) return <Star {...iconProps} />;
  if (text.includes('romantic') || text.includes('couple') || text.includes('love')) return <Heart {...iconProps} />;
  
  // Fallback based on activity type
  if (activity.type) {
    switch (activity.type) {
      case 'sightseeing': return <Camera {...iconProps} />;
      case 'adventure': return <Mountain {...iconProps} />;
      case 'cultural': return <Building2 {...iconProps} />;
      case 'entertainment': return <Music {...iconProps} />;
      case 'dining': return <UtensilsCrossed {...iconProps} />;
      case 'shopping': return <ShoppingBag {...iconProps} />;
      case 'relaxation': return <Waves {...iconProps} />;
    }
  }
  
  return <MapPin {...iconProps} />;
};

/**
 * Get activity color based on content and type
 * Shared utility to avoid duplication across TimelineItem and MapScreen
 */
export const getActivityColor = (activity: ActivityLike): string => {
  const text = `${activity.name} ${activity.description || ''} ${activity.location || ''}`.toLowerCase();
  
  // Food & Dining colors
  if (text.includes('breakfast') || text.includes('brunch')) return '#D4A574'; // Coffee brown
  if (text.includes('lunch') || text.includes('dinner') || text.includes('restaurant') || 
      text.includes('cafe') || text.includes('bistro') || text.includes('brasserie')) return '#E67E22'; // Orange
  if (text.includes('bar') || text.includes('wine') || text.includes('cocktail') || text.includes('pub')) return '#8E44AD'; // Purple
  
  // Nature & Parks colors
  if (text.includes('park') || text.includes('garden') || text.includes('forest') || text.includes('tree')) return '#27AE60'; // Green
  if (text.includes('beach') || text.includes('ocean') || text.includes('sea') || 
      text.includes('lake') || text.includes('river')) return '#3498DB'; // Blue
  if (text.includes('mountain') || text.includes('hill') || text.includes('hiking') || text.includes('trek')) return '#7F8C8D'; // Gray
  
  // Culture & History colors
  if (text.includes('museum') || text.includes('gallery') || text.includes('art') || text.includes('exhibition')) return '#E91E63'; // Pink
  if (text.includes('church') || text.includes('cathedral') || text.includes('chapel') || text.includes('temple')) return '#795548'; // Brown
  if (text.includes('castle') || text.includes('palace') || text.includes('fort') || text.includes('tower')) return '#FF5722'; // Deep Orange
  if (text.includes('monument') || text.includes('memorial') || text.includes('statue') || text.includes('landmark')) return '#607D8B'; // Blue Gray
  
  // Entertainment colors
  if (text.includes('theater') || text.includes('theatre') || text.includes('opera') || 
      text.includes('concert') || text.includes('show')) return '#9C27B0'; // Purple
  if (text.includes('music') || text.includes('jazz') || text.includes('band') || text.includes('symphony')) return '#FF9800'; // Amber
  
  // Shopping colors
  if (text.includes('shop') || text.includes('store') || text.includes('market') || 
      text.includes('boutique') || text.includes('mall')) return '#E91E63'; // Pink
  if (text.includes('souvenir') || text.includes('gift')) return '#FFC107'; // Yellow
  
  // Transportation colors
  if (text.includes('train') || text.includes('subway') || text.includes('metro') || text.includes('railway')) return '#455A64'; // Dark Gray
  if (text.includes('taxi') || text.includes('uber') || text.includes('drive') || text.includes('car')) return '#FF5722'; // Deep Orange
  if (text.includes('flight') || text.includes('airport') || text.includes('plane')) return '#2196F3'; // Blue
  if (text.includes('boat') || text.includes('ferry') || text.includes('cruise') || text.includes('ship')) return '#00BCD4'; // Cyan
  
  // Accommodation colors
  if (text.includes('hotel') || text.includes('hostel') || text.includes('accommodation')) return '#795548'; // Brown
  
  // Activity colors
  if (text.includes('tour') || text.includes('guide') || text.includes('visit') || text.includes('explore')) return '#4CAF50'; // Light Green
  if (text.includes('ticket') || text.includes('entry') || text.includes('admission')) return '#FF9800'; // Amber
  if (text.includes('photo') || text.includes('picture') || text.includes('photography') || 
      text.includes('viewpoint') || text.includes('observation')) return '#9E9E9E'; // Gray
  if (text.includes('group') || text.includes('meeting') || text.includes('social') || text.includes('people')) return '#FF5722'; // Deep Orange
  
  // Experience colors
  if (text.includes('experience') || text.includes('special') || text.includes('unique') || text.includes('highlight')) return '#FFD700'; // Gold
  if (text.includes('romantic') || text.includes('couple') || text.includes('love')) return '#E91E63'; // Pink
  
  // Generate a color based on activity name hash for consistency
  const hashCode = activity.name.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const colors = [
    '#4ECDC4', '#FF6B6B', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98FB98', '#F39C12', '#E74C3C', '#9B59B6',
    '#1ABC9C', '#2ECC71', '#3498DB', '#F1C40F', '#E67E22'
  ];
  
  return colors[Math.abs(hashCode) % colors.length];
};

// Re-export commonly used icons for convenience
export { 
  MapPin, Clock, DollarSign 
} from 'lucide-react-native';