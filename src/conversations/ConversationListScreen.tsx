import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../components/ThemeProvider';
import { usePersona } from '../context/PersonaContext';
import { Typography, AILoadingAnimation, Card } from '../ui/atoms';
import { ConversationService, ConversationWithPersona } from '../services/conversationService';

// Use the centralized Conversation interface
export type Conversation = ConversationWithPersona;

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
  onDelete: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25; // 25% of screen width

const SwipeableConversationItem = ({ conversation, onPress, onDelete }: ConversationItemProps) => {
  const translateX = new Animated.Value(0);
  const { theme } = useTheme();

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const handleStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // If swiped far enough or with enough velocity, trigger delete
      if (Math.abs(translationX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 500) {
        // Animate to fully swiped state
        Animated.timing(translateX, {
          toValue: translationX > 0 ? screenWidth : -screenWidth,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // Show delete confirmation
          Alert.alert(
            'Delete Conversation',
            'Are you sure you want to delete this conversation? This action cannot be undone.',
            [
              { 
                text: 'Cancel', 
                style: 'cancel',
                onPress: () => {
                  // Reset position
                  Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                  }).start();
                }
              },
              { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: () => {
                  onDelete();
                  // Reset for next render
                  translateX.setValue(0);
                }
              },
            ]
          );
        });
      } else {
        // Snap back to original position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Delete background */}
      <View style={[styles.deleteBackground, { backgroundColor: theme.colors.danger['500'] }]}>
        <Typography variant="bodyMd" color="#FFFFFF" weight="semibold">
          🗑️ Delete
        </Typography>
      </View>
      
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View style={[styles.swipeableItem, { transform: [{ translateX }] }]}>
          <ConversationItem
            conversation={conversation}
            onPress={onPress}
            onDelete={onDelete}
          />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const ConversationItem = ({ conversation, onPress, onDelete }: ConversationItemProps) => {
  const { theme, colorScheme } = useTheme();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleLongPress = () => {
    const modelInfo = conversation.current_model ? `Model: ${conversation.current_model}` : 'No model info';
    Alert.alert(
      'Conversation Details',
      `${modelInfo}\n${conversation.message_count} ${conversation.message_count !== 1 ? 'messages' : 'message'}\n\nLast updated: ${formatDate(conversation.updated_at)}`,
      [
        { text: 'Delete', style: 'destructive', onPress: onDelete },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getPersonaGradient = (): [string, string] => {
    const colors: [string, string] = colorScheme === 'dark' 
      ? [theme.colors.brand['400'], theme.colors.brand['600']] 
      : [theme.colors.brand['300'], theme.colors.brand['500']];
    return colors;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      style={styles.conversationItem}
      activeOpacity={0.95}
    >
      <View style={styles.cardContainer}>
        {/* Clean Card with consistent styling */}
        <Card
          variant="elevated"
          style={{
            ...styles.modernCard,
            backgroundColor: colorScheme === 'dark' 
              ? theme.colors.surface
              : '#FFFFFF',
            borderWidth: 0.5,
            borderColor: colorScheme === 'dark'
              ? theme.colors.border + '40'
              : theme.colors.border + '60',
            ...Platform.select({
              ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: colorScheme === 'dark' ? 0.1 : 0.05,
                shadowRadius: 8,
              },
              android: {
                elevation: 3,
              },
            }),
          }}
        >
          <View style={styles.cardContent}>
            {/* Enhanced Persona Icon with gradient background */}
            <View style={styles.personaIconContainer}>
              <View style={styles.personaIconWrapper}>
                <LinearGradient
                  colors={getPersonaGradient()}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.personaIconGradient}
                >
                  <View style={[
                    styles.personaIconInner,
                    {
                      backgroundColor: colorScheme === 'dark' 
                        ? theme.colors.surface + 'CC' 
                        : '#FFFFFF' + 'DD',
                    }
                  ]}>
                    <Typography variant="h4" style={styles.personaEmoji}>
                      {conversation.personas?.icon || '💬'}
                    </Typography>
                  </View>
                </LinearGradient>
                
                {/* Remove the floating activity indicator */}
              </View>
            </View>

            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <View style={styles.conversationMeta}>
                  {conversation.personas && (
                    <View style={styles.personaNameContainer}>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        style={{
                          ...styles.personaName,
                          color: colorScheme === 'dark' 
                            ? theme.colors.brand['400'] 
                            : theme.colors.brand['600'],
                        }}
                      >
                        {conversation.personas.display_name}
                      </Typography>
                      <View style={[
                        styles.personaBadge,
                        {
                          backgroundColor: colorScheme === 'dark' 
                            ? theme.colors.brand['500'] + '20' 
                            : theme.colors.brand['400'] + '15',
                        }
                      ]} />
                    </View>
                  )}
                  <Typography
                    variant="bodyMd"
                    weight="semibold"
                    color={theme.colors.textPrimary}
                    numberOfLines={1}
                    style={styles.conversationTitle}
                  >
                    {conversation.title}
                  </Typography>
                </View>
                <View style={styles.timestampContainer}>
                  <Typography
                    variant="caption"
                    weight="medium"
                    style={{
                      ...styles.timestamp,
                      color: colorScheme === 'dark' 
                        ? theme.colors.textTertiary 
                        : theme.colors.textSecondary,
                    }}
                  >
                    {formatDate(conversation.updated_at)}
                  </Typography>
                </View>
              </View>
              
              {conversation.last_message_preview && (
                <Typography
                  variant="bodySm"
                  numberOfLines={2}
                  style={{
                    ...styles.lastMessage,
                    color: colorScheme === 'dark' 
                      ? theme.colors.textSecondary 
                      : theme.colors.textTertiary,
                  }}
                >
                  {conversation.last_message_preview}
                </Typography>
              )}
              
              <View style={styles.conversationFooter}>
                <View style={styles.messageCountContainer}>
                  <View style={[
                    styles.messageCountBadge,
                    {
                      backgroundColor: colorScheme === 'dark' 
                        ? theme.colors.brand['600'] + '25' 
                        : theme.colors.brand['400'] + '20',
                    }
                  ]}>
                    <Typography
                      variant="caption"
                      weight="semibold"
                      style={{
                        ...styles.messageCountText,
                        color: colorScheme === 'dark' 
                          ? theme.colors.brand['400'] 
                          : theme.colors.brand['600'],
                      }}
                    >
                      {conversation.message_count}
                    </Typography>
                  </View>
                  <Typography
                    variant="caption"
                    color={theme.colors.textTertiary}
                    weight="medium"
                    style={styles.messageLabel}
                  >
                    {conversation.message_count !== 1 ? 'messages' : 'message'}
                  </Typography>
                </View>
                
                {/* Modern visual indicator for active status */}
                <View style={styles.statusIndicators}>
                  <View style={[
                    styles.statusDot,
                    {
                      backgroundColor: theme.colors.brand['500'] + '40',
                    }
                  ]} />
                  <View style={[
                    styles.statusDot,
                    { 
                      backgroundColor: theme.colors.brand['500'] + '30',
                      transform: [{ scale: 0.7 }],
                    }
                  ]} />
                </View>
              </View>
            </View>
          </View>
        </Card>
      </View>
    </TouchableOpacity>
  );
};

export const ConversationListScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { } = usePersona();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const result = await ConversationService.fetchConversations();
      
      if (result.error) {
        ConversationService.handleError(result.error, 'loading conversations');
        return;
      }

      setConversations(result.data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Automatically refresh conversations when the screen comes into focus
  // This ensures the list is updated when returning from chat creation
  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  const handleNewChat = () => {
    navigation.navigate('PersonaPicker');
  };

  const handleConversationPress = async (conversation: Conversation) => {
    console.log('ConversationListScreen: navigating to conversation', conversation.id);
    
    // Navigate to ChatScreen with conversation ID
    // Don't clear persona - let ChatScreen handle persona loading from conversation data
    navigation.navigate('Chat', { 
      conversationId: conversation.id
    });
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const result = await ConversationService.deleteConversation(conversationId);
    
    if (result.success) {
      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } else if (result.error) {
      ConversationService.handleError(result.error, 'deleting conversation');
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <SwipeableConversationItem
      conversation={item}
      onPress={() => handleConversationPress(item)}
      onDelete={() => handleDeleteConversation(item.id)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Card 
        variant="glass"
        className="p-8 rounded-3xl items-center mx-4"
        style={{
          backgroundColor: theme.colors.surface + 'E8',
          borderWidth: 1,
          borderColor: theme.colors.border + '40',
        }}
      >
        <View style={styles.emptyIllustration}>
          <Typography variant="h1" style={styles.emptyIcon}>
            💭
          </Typography>
          <View style={styles.emptyBubbles}>
            <View style={[styles.chatBubble, styles.chatBubble1, { 
              backgroundColor: theme.colors.brand['500'] + '40' 
            }]} />
            <View style={[styles.chatBubble, styles.chatBubble2, { 
              backgroundColor: theme.colors.brand['400'] + '60' 
            }]} />
            <View style={[styles.chatBubble, styles.chatBubble3, { 
              backgroundColor: theme.colors.brand['500'] + '50' 
            }]} />
          </View>
        </View>
        <Typography
          variant="h3"
          weight="semibold"
          color={theme.colors.textPrimary}
          align="center"
          style={styles.emptyTitle}
        >
          Start your first chat
        </Typography>
        <Typography
          variant="bodyLg"
          color={theme.colors.textSecondary}
          align="center"
          style={styles.emptySubtitle}
        >
          Choose an AI assistant and begin a conversation
        </Typography>
        <Card
          variant="floating"
          className="px-6 py-4 rounded-2xl mt-4"
          style={{
            backgroundColor: theme.colors.brand['500'],
          }}
        >
          <TouchableOpacity
            onPress={handleNewChat}
            activeOpacity={0.8}
          >
            <Typography
              variant="bodyMd"
              weight="semibold"
              color="#FFFFFF"
            >
              ✨ Start chatting
            </Typography>
          </TouchableOpacity>
        </Card>
      </Card>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <AILoadingAnimation size={100} />
          <Typography variant="bodyLg" color={theme.colors.textSecondary} style={{ marginTop: 16 }}>
            Loading conversations...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Clean neutral background */}
      <View style={[styles.neutralBackground, { backgroundColor: theme.colors.background }]} />

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.emptyContent,
        ]}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.brand['500']}
            colors={[theme.colors.brand['500']]}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  neutralBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  swipeContainer: {
    position: 'relative',
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 4,
  },
  swipeableItem: {
    backgroundColor: 'transparent',
  },
  conversationItem: {
    marginBottom: 8,
  },
  cardContainer: {
    // Container for the card
  },
  modernCard: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 100, // Ensure consistent minimum height
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    minHeight: 100, // Match card minimum height
  },
  personaIconContainer: {
    marginRight: 16,
  },
  personaIconWrapper: {
    position: 'relative',
  },
  personaIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  personaIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personaEmoji: {
    fontSize: 20,
  },
  activityIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'space-between', // Distribute content evenly
    minHeight: 68, // Consistent content height
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  conversationMeta: {
    flex: 1,
  },
  personaNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  personaName: {
    fontSize: 12,
    marginRight: 6,
  },
  personaBadge: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  timestampContainer: {
    marginLeft: 12,
  },
  timestamp: {
    fontSize: 12,
  },
  conversationTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
    marginTop: 4,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    minWidth: 24,
    alignItems: 'center',
  },
  messageCountText: {
    fontSize: 11,
  },
  messageLabel: {
    fontSize: 11,
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: 4,
  },
  conversationSurface: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  personaIconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  personaIconText: {
    fontSize: 20,
  },
  personaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  personaIcon: {
    marginRight: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIllustration: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyBubbles: {
    position: 'absolute',
    top: 20,
    left: 80,
    width: 60,
    height: 40,
  },
  chatBubble: {
    position: 'absolute',
    borderRadius: 8,
  },
  chatBubble1: {
    width: 16,
    height: 12,
    top: 0,
    left: 0,
  },
  chatBubble2: {
    width: 20,
    height: 14,
    top: 8,
    left: 20,
  },
  chatBubble3: {
    width: 12,
    height: 10,
    top: 16,
    left: 8,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptySubtitle: {
    marginBottom: 24,
  },
  emptyCTA: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
