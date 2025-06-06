import React, { forwardRef, useImperativeHandle, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTheme } from '../components/ThemeProvider';
import { Typography, Surface } from '../ui/atoms';
import { CreditsDisplay } from '../credits/CreditsDisplay';
import { supabase } from '../lib/supabase';
import { AI_MODELS } from '../config/models';

interface ChatSettingsModalProps {
  conversationId?: string;
  onDeleteConversation?: () => void;
  onNavigateToCredits?: () => void;
}

export interface ChatSettingsModalRef {
  present: () => void;
  dismiss: () => void;
}

export const ChatSettingsModal = forwardRef<ChatSettingsModalRef, ChatSettingsModalProps>(
  ({ conversationId, onDeleteConversation, onNavigateToCredits }, ref) => {
    const { theme } = useTheme();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = ['65%'];
    const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.expand(),
      dismiss: () => bottomSheetRef.current?.close(),
    }));

    const handleDeleteConversation = useCallback(async () => {
      if (!conversationId) return;

      Alert.alert(
        'Delete Conversation',
        'Are you sure you want to delete this conversation? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from('conversations')
                  .delete()
                  .eq('id', conversationId);

                if (error) {
                  console.error('Error deleting conversation:', error);
                  Alert.alert('Error', 'Failed to delete conversation');
                  return;
                }

                bottomSheetRef.current?.close();
                onDeleteConversation?.();
              } catch (error) {
                console.error('Error deleting conversation:', error);
                Alert.alert('Error', 'Failed to delete conversation');
              }
            },
          },
        ]
      );
    }, [conversationId, onDeleteConversation]);

    const handleCreditsPress = useCallback(() => {
      bottomSheetRef.current?.close();
      onNavigateToCredits?.();
    }, [onNavigateToCredits]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.surface,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.gray['400'],
        }}
      >
        <BottomSheetScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Typography
            variant="h6"
            weight="semibold"
            color={theme.colors.textPrimary}
            style={styles.title}
          >
            Chat Settings
          </Typography>

          {/* Model Selection */}
          <View style={styles.section}>
            <Typography
              variant="bodyMd"
              weight="medium"
              color={theme.colors.textPrimary}
              style={styles.sectionTitle}
            >
              AI Model
            </Typography>
            {AI_MODELS.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelOption,
                  {
                    backgroundColor: selectedModel === model.id
                      ? theme.colors.brand['100']
                      : theme.colors.surface,
                    borderColor: selectedModel === model.id
                      ? theme.colors.brand['500']
                      : theme.colors.border,
                  }
                ]}
                onPress={() => setSelectedModel(model.id)}
              >
                <View style={styles.modelInfo}>
                  <Typography
                    variant="bodyMd"
                    weight="semibold"
                    color={theme.colors.textPrimary}
                  >
                    {model.name}
                  </Typography>
                  <Typography
                    variant="bodySm"
                    color={theme.colors.textSecondary}
                  >
                    {model.description}
                  </Typography>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    {
                      borderColor: selectedModel === model.id
                        ? theme.colors.brand['500']
                        : theme.colors.border,
                    }
                  ]}
                >
                  {selectedModel === model.id && (
                    <View
                      style={[
                        styles.radioButtonInner,
                        { backgroundColor: theme.colors.brand['500'] }
                      ]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Credits */}
          <View style={styles.section}>
            <Typography
              variant="bodyMd"
              weight="medium"
              color={theme.colors.textPrimary}
              style={styles.sectionTitle}
            >
              Credits
            </Typography>
            <TouchableOpacity onPress={handleCreditsPress}>
              <CreditsDisplay compact />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          {conversationId && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.deleteButton,
                  { backgroundColor: theme.colors.danger['50'], borderColor: theme.colors.danger['200'] }
                ]}
                onPress={handleDeleteConversation}
              >
                <Typography
                  variant="bodyMd"
                  weight="medium"
                  color={theme.colors.danger['600']}
                >
                  🗑️ Delete Conversation
                </Typography>
              </TouchableOpacity>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  actionsSection: {
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteButton: {
    // Styled via theme colors in the component
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  modelInfo: {
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
