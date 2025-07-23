import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../components/ThemeProvider';
import { usePersona, Persona, PersonaCategory } from '../context/PersonaContext';
import { useEntitlements } from '../hooks/useEntitlements';
import { ModelProviderLogo, getProviderFromModelId } from '../components/ModelProviderLogo';
import { PartnerPersonaIcon } from '../components/PartnerImages';
import { 
  Typography, 
  Surface, 
  Card, 
  AnimatedTouchable,
  FadeInView,
  SkeletonLoader
} from '../ui/atoms';
import { supabase } from '../lib/supabase';
import { isModelPremium } from '../config/models';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

interface PersonaCardProps {
  persona: Persona;
  onPress: (persona: Persona) => void;
  isPremiumLocked: boolean;
  isFavorite?: boolean;
}

const PersonaCard = ({ persona, onPress, isPremiumLocked, isFavorite = false }: PersonaCardProps) => {
  const themeContext = useTheme();
  
  // Safety check for undefined persona or theme
  if (!persona || !themeContext || !themeContext.theme) {
    return null;
  }
  
  const { theme } = themeContext;

  return (
    <AnimatedTouchable
      onPress={() => onPress(persona)}
      animationType="scale"
      scaleValue={0.97}
      hapticFeedback={true}
      style={{ 
        height: cardWidth * 1.5,
        opacity: isPremiumLocked ? 0.85 : 1,
      }}
    >
      <Card
        variant="glass"
        style={{
          height: '100%',
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: 20,
          borderRadius: 24,
          backgroundColor: isPremiumLocked 
            ? theme.colors.surface + 'B0' 
            : theme.colors.surface + 'F0',
          borderWidth: 1.5,
          borderColor: isPremiumLocked
            ? theme.colors.border + '60'
            : theme.colors.border + '80',
          shadowColor: isPremiumLocked ? theme.colors.gray['400'] : theme.colors.brand['500'],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isPremiumLocked ? 0.1 : 0.15,
          shadowRadius: 12,
          elevation: isPremiumLocked ? 3 : 6,
        }}
      >
        <View style={{ position: 'relative', marginBottom: 12 }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: theme.colors.brand['500'] + '15',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: theme.colors.brand['500'],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 3,
          }}>
            <PartnerPersonaIcon 
              icon={persona.icon}
              size={36}
            />
          </View>
          
          {isPremiumLocked && (
            <View style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: theme.colors.warning['500'],
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: theme.colors.warning['500'],
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}>
              <Typography variant="caption" style={{ fontSize: 12 }}>
                🔒
              </Typography>
            </View>
          )}
          
          {isFavorite && !isPremiumLocked && (
            <View style={{
              position: 'absolute',
              top: -4,
              left: -4,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: theme.colors.danger['500'],
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: theme.colors.danger['500'],
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}>
              <Typography variant="caption" style={{ fontSize: 12 }}>
                ❤️
              </Typography>
            </View>
          )}
        </View>
        
        <Typography
          variant="h6"
          weight="bold"
          color={isPremiumLocked ? theme.colors.textSecondary : theme.colors.textPrimary}
          style={{ 
            textAlign: 'center', 
            marginBottom: 8,
            fontSize: 16,
          }}
          numberOfLines={2}
        >
          {persona.display_name}
        </Typography>
        
        {persona.description && (
          <Typography
            variant="caption"
            color={theme.colors.textSecondary}
            style={{ 
              textAlign: 'center', 
              marginBottom: 12,
              lineHeight: 16,
              flex: 1,
            }}
            numberOfLines={3}
          >
            {persona.description}
          </Typography>
        )}
        
        {persona.default_model && (
          <View style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor: theme.colors.brand['500'] + '20',
            borderWidth: 1,
            borderColor: theme.colors.brand['500'] + '40',
            marginTop: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
            <ModelProviderLogo
              provider={getProviderFromModelId(persona.default_model)}
              size={14}
            />
            <Typography
              variant="caption"
              weight="semibold"
              color={theme.colors.brand['700']}
              style={{ 
                fontSize: 11,
              }}
            >
              {persona.default_model}
            </Typography>
          </View>
        )}
      </Card>
    </AnimatedTouchable>
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

  const renderSkeletonGrid = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingBottom: 40,
        paddingTop: 4,
      }}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <View
          key={index}
          style={{
            width: cardWidth,
            height: cardWidth * 1.5,
            marginBottom: 16,
          }}
        >
          <Card
            variant="outlined"
            style={{
              height: '100%',
              justifyContent: 'flex-start',
              alignItems: 'center',
              padding: 20,
              borderRadius: 24,
              backgroundColor: theme.colors.surface + 'E0',
              borderWidth: 1.5,
              borderColor: theme.colors.border + '40',
            }}
          >
            {/* Icon skeleton */}
            <View style={{
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <SkeletonLoader
                width={64}
                height={64}
                borderRadius={32}
                style={{ marginBottom: 16 }}
              />
            </View>
            
            {/* Title skeleton */}
            <View style={{ alignItems: 'center', marginBottom: 8, width: '100%' }}>
              <SkeletonLoader
                width="80%"
                height={16}
                borderRadius={8}
                style={{ marginBottom: 8 }}
              />
            </View>
            
            {/* Description skeleton */}
            <View style={{ alignItems: 'center', marginBottom: 12, width: '100%' }}>
              <SkeletonLoader
                width="100%"
                height={12}
                borderRadius={6}
                style={{ marginBottom: 4 }}
              />
              <SkeletonLoader
                width="90%"
                height={12}
                borderRadius={6}
                style={{ marginBottom: 4 }}
              />
              <SkeletonLoader
                width="70%"
                height={12}
                borderRadius={6}
              />
            </View>
            
            {/* Model badge skeleton */}
            <View style={{ 
              marginTop: 'auto',
              alignItems: 'center',
            }}>
              <SkeletonLoader
                width={80}
                height={24}
                borderRadius={16}
              />
            </View>
          </Card>
        </View>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${
        colorScheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <View className="flex-1 p-4 pb-0">
          {/* Search Bar Skeleton */}
          <View className={`flex-row items-center border rounded-xl px-4 py-3 mb-4 mt-2 ${
            colorScheme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <SkeletonLoader width={16} height={16} borderRadius={8} style={{ marginRight: 8 }} />
            <SkeletonLoader width="70%" height={16} borderRadius={8} />
          </View>

          {/* Quick Actions Skeleton */}
          <View className="flex-row gap-3 mb-5">
            <SkeletonLoader width="50%" height={48} borderRadius={12} />
            <SkeletonLoader width="50%" height={48} borderRadius={12} />
          </View>

          {/* Category Tabs Skeleton */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-6 max-h-[60px]"
            contentContainerClassName="px-1 py-2 items-center"
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonLoader
                key={index}
                width={80}
                height={40}
                borderRadius={20}
                style={{ marginRight: 8 }}
              />
            ))}
          </ScrollView>

          {/* Personas Grid Skeleton */}
          {renderSkeletonGrid()}
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
                  <View className="mb-1.5">
                    <PartnerPersonaIcon 
                      icon={persona.icon}
                      size={24}
                    />
                  </View>
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

        {/* Personas Grid with Staggered Animation */}
        {filteredPersonas.length > 0 ? (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              paddingBottom: 40,
              paddingTop: 4,
            }}
          >
            {filteredPersonas.filter(Boolean).map((persona, index) => {
              const isPremiumLocked = persona.requires_premium && !isSubscriber && !hasCustomKey;
              const isFavorite = favorites.some(f => f.id === persona.id);
              
              return (
                <FadeInView
                  key={persona.id}
                  visible={!loading}
                  delay={index * 50}
                  style={{
                    width: cardWidth,
                    marginBottom: 16,
                  }}
                >
                  <PersonaCard
                    persona={persona}
                    onPress={handlePersonaPress}
                    isPremiumLocked={isPremiumLocked}
                    isFavorite={isFavorite}
                  />
                </FadeInView>
              );
            })}
          </ScrollView>
        ) : !loading ? (
          <FadeInView visible={true} delay={300}>
            <View style={{ 
              alignItems: 'center', 
              paddingVertical: 48, 
              paddingHorizontal: 24 
            }}>
              <Typography 
                variant="h1" 
                style={{ fontSize: 72, marginBottom: 16 }}
              >
                {showFavorites ? '🤍' : '🔍'}
              </Typography>
              <Typography
                variant="h6"
                weight="semibold"
                color={theme.colors.textPrimary}
                style={{ marginBottom: 8, textAlign: 'center' }}
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
                style={{ textAlign: 'center', marginBottom: 24, lineHeight: 20 }}
              >
                {showFavorites 
                  ? 'Star personas to add them to favorites'
                  : searchQuery 
                    ? 'Try a different search term'
                    : 'Create your first custom persona'}
              </Typography>
              {!showFavorites && (
                <AnimatedTouchable
                  onPress={handleCreatePersona}
                  animationType="scale"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: theme.colors.brand['500'],
                    borderRadius: 24,
                    shadowColor: theme.colors.brand['500'],
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Typography 
                    variant="bodyMd" 
                    style={{ fontSize: 16, marginRight: 6 }}
                  >
                    ✨
                  </Typography>
                  <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
                    Create Custom Persona
                  </Typography>
                </AnimatedTouchable>
              )}
            </View>
          </FadeInView>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

// Styles are now handled by TailwindCSS