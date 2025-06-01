import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { usePersona, Persona } from '../context/PersonaContext';
import { useEntitlements } from '../hooks/useEntitlements';
import { Typography, Surface } from '../ui/atoms';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

interface PersonaCardProps {
  persona: Persona;
  onPress: (persona: Persona) => void;
  isPremiumLocked: boolean;
}

const PersonaCard = ({ persona, onPress, isPremiumLocked }: PersonaCardProps) => {
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
        </View>
        
        <Typography
          variant="h6"
          weight="semibold"
          color={isPremiumLocked ? theme.colors.textSecondary : theme.colors.textPrimary}
          align="center"
          style={styles.title}
        >
          {persona.display_name}
        </Typography>
        
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
  const { setCurrentPersona } = usePersona();
  const { isSubscriber, hasCustomKey } = useEntitlements();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .order('created_at', { ascending: true });

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
  };

  const handlePersonaPress = (persona: Persona) => {
    const isPremiumLocked = persona.requires_premium && !isSubscriber && !hasCustomKey;

    if (isPremiumLocked) {
      navigation.navigate('Paywall');
      return;
    }

    setCurrentPersona(persona);
    navigation.navigate('Chat', { persona });
    
  };

  const renderPersonaCard = ({ item }: { item: Persona }) => {
    const isPremiumLocked = item.requires_premium && !isSubscriber && !hasCustomKey;
    
    return (
      <PersonaCard
        persona={item}
        onPress={handlePersonaPress}
        isPremiumLocked={isPremiumLocked}
      />
    );
  };

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
        <View style={styles.header}>
          <Typography
            variant="h2"
            weight="bold"
            color={theme.colors.textPrimary}
            align="center"
            style={styles.title}
          >
            Choose Your Assistant
          </Typography>
          <Typography
            variant="bodyLg"
            color={theme.colors.textSecondary}
            align="center"
            style={styles.subtitle}
          >
            Select a persona to get started with your conversation
          </Typography>
        </View>

        <FlatList
          data={personas}
          renderItem={renderPersonaCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 32,
    paddingTop: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 0,
  },
  grid: {
    paddingBottom: 32,
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
    minHeight: 160,
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
  model: {
    marginTop: 4,
  },
  premiumText: {
    marginTop: 4,
    fontWeight: '600',
  },
});