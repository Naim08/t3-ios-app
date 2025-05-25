
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, TextField, Surface } from '../ui/atoms';
import { MessageBubble } from './MessageBubble';
import { EmptyState } from './EmptyState';
import { Message, mockMessages } from './types';
import { SimpleModelPicker } from '../models/SimpleModelPicker';
import { useEntitlements } from '../hooks/useEntitlements';
import { useTranslation } from 'react-i18next';

interface ChatScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { remainingTokens } = useEntitlements();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputText, setInputText] = useState('');
  const [isModelPickerVisible, setIsModelPickerVisible] = useState(false);
  const [currentModel, setCurrentModel] = useState('gpt-3.5');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(() => {
    if (inputText.trim().length === 0) return;

    const newMessage: Message = {
      id: `m${Date.now()}`,
      role: 'user',
      text: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Auto-scroll to bottom (newest messages)
    global.setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate AI response (optional - for demo purposes)
    global.setTimeout(() => {
      const aiResponse: Message = {
        id: `m${Date.now() + 1}`,
        role: 'assistant',
        text: `I received your message: "${newMessage.text}". This is a mock response from ${currentModel}.`,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiResponse]);
      
      global.setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  }, [inputText, currentModel]);

  const renderMessage: ListRenderItem<Message> = ({ item }) => (
    <MessageBubble message={item} />
  );

  const renderEmptyState = () => <EmptyState />;
  
  const handleModelSelect = (modelId: string) => {
    console.log(`Selected model: ${modelId}`);
    setCurrentModel(modelId);
  };
  
  const handleNavigateToPaywall = () => {
    navigation.navigate('Paywall');
  };

  // Debug model selection state
  React.useEffect(() => {
    console.log(`ModelPicker visibility: ${isModelPickerVisible}`);
    console.log(`Current model: ${currentModel}`);
  }, [isModelPickerVisible, currentModel]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <Surface elevation={1} style={styles.header}>
          <Typography
            variant="h4"
            weight="semibold"
            align="center"
            style={styles.headerTitle}
          >
            AI Assistant
          </Typography>
          <TouchableOpacity 
            onPress={() => {
              console.log('Opening model picker...');
              setIsModelPickerVisible(true);
            }}
            style={[styles.modelSelector, {
              backgroundColor: theme.colors.brand['100'],
              borderColor: theme.colors.brand['300'],
              borderWidth: 1,
            }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('models.selectModel')}
            accessibilityHint={t('models.selectModelHint')}
          >
            <Typography
              variant="bodySm"
              color={theme.colors.brand['600']}
              align="center"
              weight="semibold"
            >
              {currentModel} ▼
            </Typography>
          </TouchableOpacity>
        </Surface>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyContent,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onLayout={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        {/* Input Bar */}
        <Surface elevation={3} style={styles.inputBar}>
          <View style={styles.inputContainer}>
            <TextField
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              multiline
              numberOfLines={3}
              style={styles.textInput}
              inputStyle={styles.textInputStyle}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim().length > 0
                    ? theme.colors.brand['500']
                    : theme.colors.gray['300'],
                },
              ]}
              onPress={handleSend}
              disabled={inputText.trim().length === 0}
              activeOpacity={0.7}
            >
              <Typography
                variant="bodyMd"
                color="#FFFFFF"
                align="center"
              >
                ➤
              </Typography>
            </TouchableOpacity>
          </View>
        </Surface>
      </KeyboardAvoidingView>
      
      {/* ModelPickerSheet rendered outside of KeyboardAvoidingView */}
      {isModelPickerVisible && (
        <SimpleModelPicker
          isVisible={true}
          onClose={() => {
            console.log('Closing model picker...');
            setIsModelPickerVisible(false);
          }}
          onSelect={(modelId: string) => {
            console.log(`Selected model: ${modelId}`);
            handleModelSelect(modelId);
          }}
          onNavigateToPaywall={handleNavigateToPaywall}
          remainingTokens={remainingTokens}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  headerTitle: {
    marginBottom: 4,
  },
  modelSelector: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
  },
  textInputStyle: {
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4, // Align with text input bottom
  },
});
