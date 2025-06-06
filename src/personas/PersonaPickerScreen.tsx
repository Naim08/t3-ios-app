import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../components/ThemeProvider';
import { usePersona, Persona, PersonaCategory } from '../context/PersonaContext';
import { useEntitlements } from '../hooks/useEntitlements';
import { Typography, Surface } from '../ui/atoms';
import { supabase } from '../lib/supabase';
import { isModelPremium } from '../utils/modelUtils';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

interface PersonaCardProps {
  persona: Persona;
  onPress: (persona: Persona) => void;
  isPremiumLocked: boolean;
  isFavorite?: boolean;
}

const PersonaCard = ({ persona, onPress, isPremiumLocked, isFavorite = false }: PersonaCardProps) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { width: cardWidth },
        isPremiumLocked && styles.lockedCard,
      ]}
      onPress={() => onPress(persona)}
      disabled={isPremiumLocked}
    >
      <Surface
        elevation={2}
        padding="lg"
        style={{
          ...styles.cardSurface,
          backgroundColor: isPremiumLocked ? theme.colors.gray['100'] : theme.colors.surface,
        }}
      >
        <View style={styles.iconContainer}>
          <Typography variant="h1" style={styles.icon}>
            {persona.icon}
          </Typography>
          {isPremiumLocked && (
            <Typography variant="bodyMd" style={styles.lockIcon}>
              🔒
            </Typography>
          )}
          {isFavorite && !isPremiumLocked && (
            <Typography variant="bodyMd" style={styles.favoriteIcon}>
              ❤️
            </Typography>
          )}
        </View>
        
        <Typography
          variant="h6"
          weight="semibold"
          color={isPremiumLocked ? theme.colors.textSecondary : theme.colors.textPrimary}
          align="center"
          style={styles.cardTitle}
        >
          {persona.display_name}
        </Typography>
        
        {persona.description && (
          <Typography
            variant="caption"
            color={theme.colors.textSecondary}
            align="center"
            numberOfLines={2}
            style={styles.description}
          >
            {persona.description}
          </Typography>
        )}
        
        <Typography
          variant="bodySm"
          color={theme.colors.textSecondary}
          align="center"
          style={styles.model}
        >
          {persona.default_model}
        </Typography>
        
        {isPremiumLocked && (
          <Typography
            variant="bodySm"
            color={theme.colors.brand['500']}
            align="center"
            style={styles.premiumText}
          >
            Premium
          </Typography>
        )}
      </Surface>
    </TouchableOpacity>
  );
};

export const PersonaPickerScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { setCurrentPersona, favorites, recentPersonas, categories } = usePersona();
  const { isSubscriber, hasCustomKey, remainingTokens } = useEntitlements();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);

  const fetchPersonas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) {
        console.error('Error fetching personas:', error);
        return;
      }

      setPersonas(data || []);
    } catch (error) {
      console.error('Error fetching personas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  // Refresh personas when screen comes into focus (e.g., after creating a new persona)
  useFocusEffect(
    useCallback(() => {
      fetchPersonas();
    }, [fetchPersonas])
  );

  const handlePersonaPress = (persona: Persona) => {
    const personaRequiresPremium = persona.requires_premium && !isSubscriber && !hasCustomKey;
    const modelIsPremium = isModelPremium(persona.default_model);
    const modelRequiresPremium = modelIsPremium && !isSubscriber && !hasCustomKey;
    
    // Check if user has tokens for free models
    const hasTokensForFreeModel = !modelIsPremium && remainingTokens > 0;
    
    console.log('🔍 PERSONA ACCESS CHECK:', {
      personaName: persona.display_name,
      defaultModel: persona.default_model,
      personaRequiresPremium,
      modelIsPremium,
      modelRequiresPremium,
      remainingTokens,
      hasTokensForFreeModel,
      isSubscriber,
      hasCustomKey
    });

    // Block access if persona requires premium
    if (personaRequiresPremium) {
      console.log('❌ PAYWALL: Persona requires premium');
      navigation.navigate('Paywall');
      return;
    }
    
    // Block access if model requires premium
    if (modelRequiresPremium) {
      console.log('❌ PAYWALL: Model requires premium');
      navigation.navigate('Paywall');
      return;
    }
    
    // Block access if using free model but no tokens
    if (!modelIsPremium && remainingTokens <= 0) {
      console.log('❌ PAYWALL: No tokens for free model');
      navigation.navigate('Paywall');
      return;
    }

    console.log('✅ ACCESS GRANTED: Proceeding to chat with persona');
    setCurrentPersona(persona);
    navigation.navigate('Chat', { persona });
  };

  const handleCreatePersona = () => {
    navigation.navigate('PersonaCreate');
  };

  const filteredPersonas = personas.filter(persona => {
    const matchesSearch = persona.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         persona.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || persona.category_id === selectedCategory;
    const matchesFavorites = !showFavorites || favorites.some(f => f.id === persona.id);
    
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  const renderPersonaCard = ({ item }: { item: Persona }) => {
    const isPremiumLocked = item.requires_premium && !isSubscriber && !hasCustomKey;
    const isFavorite = favorites.some(f => f.id === item.id);
    
    return (
      <PersonaCard
        persona={item}
        onPress={handlePersonaPress}
        isPremiumLocked={isPremiumLocked}
        isFavorite={isFavorite}
      />
    );
  };

  const renderCategoryTab = (category: PersonaCategory | { id: string, name: string, icon: string }) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryTab,
        {
          backgroundColor: selectedCategory === category.id 
            ? theme.colors.brand['500'] 
            : theme.colors.surface,
          borderColor: selectedCategory === category.id 
            ? theme.colors.brand['500'] 
            : theme.colors.border,
        }
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Typography variant="bodyMd" style={styles.categoryIcon}>
        {category.icon}
      </Typography>
      <Typography
        variant="bodySm"
        weight="medium"
        color={selectedCategory === category.id 
          ? '#FFFFFF' 
          : theme.colors.textPrimary}
      >
        {category.name}
      </Typography>
    </TouchableOpacity>
  );

  const allCategories = [
    { id: 'all', name: 'All', icon: '🌟' },
    ...categories
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Typography variant="bodyLg" color={theme.colors.textSecondary}>
            Loading personas...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { borderColor: theme.colors.border }]}>
          <Typography variant="bodyLg" style={styles.searchIcon}>🔍</Typography>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search personas..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.colors.brand['500'] }]}
            onPress={handleCreatePersona}
          >
            <Typography variant="bodyMd" style={styles.createIcon}>✨</Typography>
            <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
              Create Custom
            </Typography>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.favoritesButton,
              {
                backgroundColor: showFavorites ? theme.colors.brand['100'] : theme.colors.surface,
                borderColor: showFavorites ? theme.colors.brand['500'] : theme.colors.border,
              }
            ]}
            onPress={() => setShowFavorites(!showFavorites)}
          >
            <Typography variant="bodyMd" style={styles.favoritesIcon}>
              {showFavorites ? '❤️' : '🤍'}
            </Typography>
            <Typography
              variant="bodyMd"
              weight="medium"
              color={showFavorites ? theme.colors.brand['500'] : theme.colors.textPrimary}
            >
              Favorites
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {allCategories.map(renderCategoryTab)}
        </ScrollView>

        {/* Recent Personas (only show if not searching and on 'all' category) */}
        {!searchQuery && selectedCategory === 'all' && recentPersonas.length > 0 && (
          <View style={styles.sectionContainer}>
            <Typography
              variant="h6"
              weight="semibold"
              color={theme.colors.textPrimary}
              style={styles.sectionTitle}
            >
              Recently Used
            </Typography>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentContainer}
            >
              {recentPersonas.slice(0, 5).map((persona) => (
                <TouchableOpacity
                  key={persona.id}
                  style={[styles.recentCard, { backgroundColor: theme.colors.surface }]}
                  onPress={() => handlePersonaPress(persona)}
                >
                  <Typography variant="h4" style={styles.recentIcon}>
                    {persona.icon}
                  </Typography>
                  <Typography
                    variant="caption"
                    weight="medium"
                    color={theme.colors.textPrimary}
                    numberOfLines={1}
                  >
                    {persona.display_name}
                  </Typography>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Personas Grid */}
        <FlatList
          data={filteredPersonas}
          renderItem={renderPersonaCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Typography variant="h1" style={styles.emptyIcon}>
                {showFavorites ? '🤍' : '🔍'}
              </Typography>
              <Typography
                variant="h6"
                weight="semibold"
                color={theme.colors.textPrimary}
                style={styles.emptyTitle}
              >
                {showFavorites 
                  ? 'No favorites yet' 
                  : searchQuery 
                    ? 'No personas found' 
                    : 'No personas available'}
              </Typography>
              <Typography
                variant="bodyMd"
                color={theme.colors.textSecondary}
                align="center"
                style={styles.emptySubtitle}
              >
                {showFavorites 
                  ? 'Star personas to add them to favorites' 
                  : searchQuery 
                    ? 'Try a different search term' 
                    : 'Create your first custom persona'}
              </Typography>
              {!showFavorites && (
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: theme.colors.brand['500'] }]}
                  onPress={handleCreatePersona}
                >
                  <Typography variant="bodyMd" style={styles.createIcon}>✨</Typography>
                  <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
                    Create Custom Persona
                  </Typography>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 0, // Remove bottom padding since FlatList handles its own
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    marginTop: 8, // Add top margin for proper spacing from navigation
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20, // Increased margin for better separation
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  createIcon: {
    fontSize: 16,
  },
  favoritesButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  favoritesIcon: {
    fontSize: 16,
  },
  categoriesContainer: {
    marginBottom: 24, // Reduced margin for better spacing
    maxHeight: 60, // Set a fixed height to prevent overlap
  },
  categoriesContent: {
    paddingHorizontal: 4,
    paddingVertical: 8, // Slightly increased padding
    alignItems: 'center',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10, // Slightly reduced padding
    borderRadius: 25,
    borderWidth: 1,
    gap: 8,
    minHeight: 40, // Reduced height to prevent overlap
    marginRight: 8,
    // Add shadow for better visibility
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIcon: {
    fontSize: 16, // Slightly smaller icon
  },
  sectionContainer: {
    marginBottom: 20, // Reduced margin
  },
  sectionTitle: {
    marginBottom: 12,
  },
  recentContainer: {
    paddingHorizontal: 0,
    gap: 12,
  },
  recentCard: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    width: 80,
    gap: 6,
  },
  recentIcon: {
    fontSize: 24,
  },
  grid: {
    paddingBottom: 40,
    paddingTop: 4, // Reduced top padding
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardSurface: {
    borderRadius: 16,
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedCard: {
    opacity: 0.7,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  icon: {
    fontSize: 48,
    lineHeight: 56,
  },
  lockIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    fontSize: 16,
  },
  favoriteIcon: {
    position: 'absolute',
    top: -8,
    left: -8,
    fontSize: 16,
  },
  description: {
    marginTop: 4,
    marginBottom: 8,
  },
  model: {
    marginTop: 4,
  },
  premiumText: {
    marginTop: 4,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 8,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptySubtitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
});