import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
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
import { Typography, Surface, AILoadingAnimation } from '../ui/atoms';
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
  const { theme, colorScheme } = useTheme();

  return (
    <TouchableOpacity
      className={`mb-4 ${isPremiumLocked ? 'opacity-70' : ''}`}
      style={{ width: cardWidth }}
      onPress={() => onPress(persona)}
      disabled={isPremiumLocked}
    >
      <Surface
        className={`rounded-2xl min-h-[180px] justify-center items-center p-4 shadow-md ${
          isPremiumLocked
            ? colorScheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
            : colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <View className="relative mb-3">
          <Typography variant="h1" className="text-5xl leading-[56px] text-center">
            {persona.icon}
          </Typography>
          {isPremiumLocked && (
            <Typography variant="bodyMd" className="absolute -top-2 -right-2 text-base">
              🔒
            </Typography>
          )}
          {isFavorite && !isPremiumLocked && (
            <Typography variant="bodyMd" className="absolute -top-2 -left-2 text-base">
              ❤️
            </Typography>
          )}
        </View>
        
        <Typography
          variant="h6"
          weight="semibold"
          className={`text-center mb-2 ${
            isPremiumLocked
              ? colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              : colorScheme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}
        >
          {persona.display_name}
        </Typography>
        
        {persona.description && (
          <Typography
            variant="caption"
            className={`text-center mt-1 mb-2 ${
              colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
            numberOfLines={2}
          >
            {persona.description}
          </Typography>
        )}
        
        <Typography
          variant="bodySm"
          className={`text-center mt-1 ${
            colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {persona.default_model}
        </Typography>
        
        {isPremiumLocked && (
          <Typography
            variant="bodySm"
            className="text-brand-500 text-center mt-1 font-semibold"
          >
            Premium
          </Typography>
        )}
      </Surface>
    </TouchableOpacity>
  );
};

export const PersonaPickerScreen = ({ navigation }: any) => {
  const { theme, colorScheme } = useTheme();
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
    
    // Block access if persona requires premium
    if (personaRequiresPremium) {
      navigation.navigate('Paywall');
      return;
    }
    
    // Block access if model requires premium
    if (modelRequiresPremium) {
      navigation.navigate('Paywall');
      return;
    }
    
    // Block access if using free model but no tokens
    if (!modelIsPremium && remainingTokens <= 0) {
      navigation.navigate('Paywall');
      return;
    }

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
      className={`flex-row items-center px-4 py-2 rounded-full border min-h-[40px] mr-2 shadow-sm ${
        selectedCategory === category.id
          ? 'bg-brand-500 border-brand-500'
          : colorScheme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
      }`}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Typography variant="bodyMd" className="text-base mr-2">
        {category.icon}
      </Typography>
      <Typography
        variant="bodySm"
        weight="medium"
        className={selectedCategory === category.id 
          ? 'text-white' 
          : colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}
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
      <SafeAreaView className={`flex-1 ${
        colorScheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <View className="flex-1 justify-center items-center">
          <AILoadingAnimation size={100} />
          <Typography 
            variant="bodyLg" 
            className={`mt-4 ${
              colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Loading personas...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${
      colorScheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <View className="flex-1 p-4 pb-0">
        {/* Search Bar */}
        <View className={`flex-row items-center border rounded-xl px-4 py-3 mb-4 mt-2 ${
          colorScheme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <Typography variant="bodyLg" className="mr-2">🔍</Typography>
          <TextInput
            className={`flex-1 text-base ${
              colorScheme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
            placeholder="Search personas..."
            placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-3 mb-5">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-3 px-4 bg-brand-500 rounded-xl"
            onPress={handleCreatePersona}
          >
            <Typography variant="bodyMd" className="text-base mr-1.5">✨</Typography>
            <Typography variant="bodyMd" weight="semibold" className="text-white">
              Create Custom
            </Typography>
          </TouchableOpacity>
          
          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl border ${
              showFavorites
                ? 'bg-brand-100 border-brand-500'
                : colorScheme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
            }`}
            onPress={() => setShowFavorites(!showFavorites)}
          >
            <Typography variant="bodyMd" className="text-base mr-1.5">
              {showFavorites ? '❤️' : '🤍'}
            </Typography>
            <Typography
              variant="bodyMd"
              weight="medium"
              className={showFavorites 
                ? 'text-brand-500' 
                : colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}
            >
              Favorites
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6 max-h-[60px]"
          contentContainerClassName="px-1 py-2 items-center"
        >
          {allCategories.map(renderCategoryTab)}
        </ScrollView>

        {/* Recent Personas (only show if not searching and on 'all' category) */}
        {!searchQuery && selectedCategory === 'all' && recentPersonas.length > 0 && (
          <View className="mb-5">
            <Typography
              variant="h6"
              weight="semibold"
              className={`mb-3 ${
                colorScheme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              Recently Used
            </Typography>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="px-0 gap-3"
            >
              {recentPersonas.slice(0, 5).map((persona) => (
                <TouchableOpacity
                  key={persona.id}
                  className={`p-3 rounded-xl items-center w-20 ${
                    colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'
                  }`}
                  onPress={() => handlePersonaPress(persona)}
                >
                  <Typography variant="h4" className="text-2xl mb-1.5">
                    {persona.icon}
                  </Typography>
                  <Typography
                    variant="caption"
                    weight="medium"
                    className={`text-center ${
                      colorScheme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
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
          contentContainerClassName="pb-10 pt-1"
          columnWrapperClassName="justify-between mb-4"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-12 px-6">
              <Typography variant="h1" className="text-6xl mb-4">
                {showFavorites ? '🤍' : '🔍'}
              </Typography>
              <Typography
                variant="h6"
                weight="semibold"
                className={`mb-2 text-center ${
                  colorScheme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {showFavorites 
                  ? 'No favorites yet' 
                  : searchQuery 
                    ? 'No personas found' 
                    : 'No personas available'}
              </Typography>
              <Typography
                variant="bodyMd"
                className={`text-center mb-6 ${
                  colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {showFavorites 
                  ? 'Star personas to add them to favorites' 
                  : searchQuery 
                    ? 'Try a different search term' 
                    : 'Create your first custom persona'}
              </Typography>
              {!showFavorites && (
                <TouchableOpacity
                  className="flex-row items-center justify-center py-3 px-4 bg-brand-500 rounded-xl"
                  onPress={handleCreatePersona}
                >
                  <Typography variant="bodyMd" className="text-base mr-1.5">✨</Typography>
                  <Typography variant="bodyMd" weight="semibold" className="text-white">
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

// Styles are now handled by TailwindCSS