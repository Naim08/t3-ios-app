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
import { useTheme } from '../components/ThemeProvider';
import { usePersona } from '../context/PersonaContext';
import { Typography, AILoadingAnimation } from '../ui/atoms';
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
  const { theme } = useTheme();

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

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      style={styles.conversationItem}
      activeOpacity={0.9}
    >
      <View style={[styles.conversationSurface, {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
          },
          android: {
            elevation: 2,
          },
        }),
      }]}>
        <View style={styles.personaIconContainer}>
          <View style={[styles.personaIconBackground, { backgroundColor: theme.colors.brand['100'] }]}>
            <Typography variant="h4" style={styles.personaIconText}>
              {conversation.personas?.icon || '💬'}
            </Typography>
          </View>
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.conversationMeta}>
              {conversation.personas && (
                <Typography
                  variant="bodySm"
                  weight="semibold"
                  color={theme.colors.brand['600']}
                  style={styles.personaName}
                >
                  {conversation.personas.display_name}
                </Typography>
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
            <Typography
              variant="caption"
              color={theme.colors.textTertiary}
              style={styles.timestamp}
            >
              {formatDate(conversation.updated_at)}
            </Typography>
          </View>
          
          {conversation.last_message_preview && (
            <Typography
              variant="bodySm"
              color={theme.colors.textSecondary}
              numberOfLines={2}
              style={styles.lastMessage}
            >
              {conversation.last_message_preview}
            </Typography>
          )}
          
          <View style={styles.conversationFooter}>
            <Typography
              variant="caption"
              color={theme.colors.textTertiary}
              weight="medium"
            >
              {conversation.message_count} {conversation.message_count !== 1 ? 'messages' : 'message'}
            </Typography>
          </View>
        </View>
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
      <View style={styles.emptyIllustration}>
        <Typography variant="h1" style={styles.emptyIcon}>
          💭
        </Typography>
        <View style={styles.emptyBubbles}>
          <View style={[styles.chatBubble, styles.chatBubble1, { backgroundColor: theme.colors.gray['300'] }]} />
          <View style={[styles.chatBubble, styles.chatBubble2, { backgroundColor: theme.colors.gray['300'] }]} />
          <View style={[styles.chatBubble, styles.chatBubble3, { backgroundColor: theme.colors.gray['300'] }]} />
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
      <TouchableOpacity
        style={[styles.emptyCTA, { backgroundColor: theme.colors.brand['500'] }]}
        onPress={handleNewChat}
        activeOpacity={0.8}
      >
        <Typography
          variant="bodyMd"
          weight="semibold"
          color="#FFFFFF"
        >
          Start chatting
        </Typography>
      </TouchableOpacity>
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
    paddingVertical: 16,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  swipeContainer: {
    marginBottom: 8,
    marginHorizontal: 8,
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
    // marginBottom: 12, // moved to swipeContainer
  },
  conversationSurface: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  personaIconContainer: {
    marginRight: 12,
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
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  conversationMeta: {
    flex: 1,
  },
  personaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  personaIcon: {
    marginRight: 6,
  },
  personaName: {
    marginBottom: 2,
  },
  timestamp: {
    marginLeft: 12,
    textAlign: 'right',
  },
  conversationTitle: {
    marginBottom: 4,
  },
  lastMessage: {
    marginBottom: 8,
    lineHeight: 18,
  },
  conversationFooter: {
    marginTop: 4,
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
