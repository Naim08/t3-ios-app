import React, { forwardRef, useImperativeHandle, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Settings, Trash2, CreditCard, Cpu, Zap, Crown } from 'lucide-react-native';

// Conditional imports for gradients
let LinearGradient: any;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
} catch (error) {
  LinearGradient = ({ children, style, ...props }: any) => 
    React.createElement(View, { style, ...props }, children);
}

import { useTheme } from '../components/ThemeProvider';
import { Typography, Surface, Card } from '../ui/atoms';
import { AnimatedTouchable, FadeInView, SlideInView } from '../ui/atoms';
import { CreditsDisplay } from '../credits/CreditsDisplay';
import { AI_MODELS } from '../config/models';
import { ConversationService } from '../services/conversationService';

interface EnhancedChatSettingsModalProps {
  conversationId?: string;
  onDeleteConversation?: () => void;
  onNavigateToCredits?: () => void;
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
}

export interface EnhancedChatSettingsModalRef {
  present: () => void;
  dismiss: () => void;
}

const ModelCard = ({ 
  model, 
  isSelected, 
  onSelect, 
  disabled = false 
}: { 
  model: any; 
  isSelected: boolean; 
  onSelect: () => void;
  disabled?: boolean;
}) => {
  const { theme } = useTheme();
  
  const getModelIcon = () => {
    if (model.id.includes('gpt-4')) return <Cpu size={20} color={theme.colors.blue['600']} />;
    if (model.id.includes('claude')) return <Zap size={20} color={theme.colors.purple['600']} />;
    if (model.id.includes('gemini')) return <Crown size={20} color={theme.colors.green['600']} />;
    return <Cpu size={20} color={theme.colors.gray['600']} />;
  };

  const isPremium = model.category === 'premium';

  return (
    <AnimatedTouchable
      onPress={onSelect}
      disabled={disabled}
      animationType="scale"
      scaleValue={0.98}
      style={{
        marginBottom: 12,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Card
        variant={isSelected ? "elevated" : "outlined"}
        style={{
          backgroundColor: isSelected 
            ? theme.colors.brand['500'] + '15' 
            : theme.colors.surface,
          borderColor: isSelected 
            ? theme.colors.brand['500'] 
            : theme.colors.border + '60',
          borderWidth: 2,
          borderRadius: 16,
          padding: 16,
          shadowColor: isSelected ? theme.colors.brand['500'] : theme.colors.gray['500'],
          shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
          shadowOpacity: isSelected ? 0.2 : 0.1,
          shadowRadius: isSelected ? 8 : 4,
          elevation: isSelected ? 6 : 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.gray['100'],
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            {getModelIcon()}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Typography
                variant="bodyLg"
                weight="semibold"
                color={isSelected ? theme.colors.brand['700'] : theme.colors.textPrimary}
              >
                {model.name}
              </Typography>
              {isPremium && (
                <View style={{
                  backgroundColor: theme.colors.yellow['100'],
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                  marginLeft: 8,
                }}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.yellow['800']}
                  >
                    PRO
                  </Typography>
                </View>
              )}
            </View>
            <Typography
              variant="bodySm"
              color={theme.colors.textSecondary}
            >
              {model.description}
            </Typography>
          </View>
          <View style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: isSelected ? theme.colors.brand['500'] : theme.colors.gray['400'],
            backgroundColor: isSelected ? theme.colors.brand['500'] : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {isSelected && (
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#FFFFFF',
              }} />
            )}
          </View>
        </View>
        
        {model.capabilities && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {model.capabilities.slice(0, 3).map((capability: string, index: number) => (
              <View
                key={index}
                style={{
                  backgroundColor: theme.colors.gray['100'],
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginRight: 6,
                  marginBottom: 4,
                }}
              >
                <Typography
                  variant="caption"
                  color={theme.colors.textSecondary}
                  style={{ fontSize: 11 }}
                >
                  {capability}
                </Typography>
              </View>
            ))}
          </View>
        )}
      </Card>
    </AnimatedTouchable>
  );
};

export const EnhancedChatSettingsModal = forwardRef<EnhancedChatSettingsModalRef, EnhancedChatSettingsModalProps>(
  ({ conversationId, onDeleteConversation, onNavigateToCredits, currentModel = 'gpt-3.5-turbo', onModelChange }, ref) => {
    const { theme } = useTheme();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = ['75%'];
    const [selectedModel, setSelectedModel] = useState(currentModel);

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.expand(),
      dismiss: () => bottomSheetRef.current?.close(),
    }));

    const handleDeleteConversation = useCallback(async () => {
      if (!conversationId) return;

      ConversationService.deleteConversationWithConfirmation(
        conversationId,
        () => {
          bottomSheetRef.current?.close();
          onDeleteConversation?.();
        }
      );
    }, [conversationId, onDeleteConversation]);

    const handleCreditsPress = useCallback(() => {
      bottomSheetRef.current?.close();
      onNavigateToCredits?.();
    }, [onNavigateToCredits]);

    const handleModelSelect = useCallback((modelId: string) => {
      setSelectedModel(modelId);
      onModelChange?.(modelId);
    }, [onModelChange]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
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
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.gray['400'],
          width: 48,
          height: 4,
        }}
      >
        <BottomSheetScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <FadeInView visible={true}>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: 24,
              paddingTop: 8 
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.colors.brand['500'] + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Settings size={20} color={theme.colors.brand['600']} />
              </View>
              <Typography
                variant="h5"
                weight="bold"
                color={theme.colors.textPrimary}
              >
                Chat Settings
              </Typography>
            </View>
          </FadeInView>

          {/* Credits Section */}
          <SlideInView visible={true} direction="up" delay={100}>
            <Card
              variant="gradient"
              style={{
                borderRadius: 16,
                marginBottom: 24,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[
                  theme.colors.brand['400'],
                  theme.colors.brand['500'],
                  theme.colors.accent['600'],
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <CreditCard size={24} color="#FFFFFF" />
                  <Typography
                    variant="h6"
                    weight="semibold"
                    color="#FFFFFF"
                    style={{ marginLeft: 12 }}
                  >
                    Credits
                  </Typography>
                </View>
                <CreditsDisplay onPress={handleCreditsPress} />
              </LinearGradient>
            </Card>
          </SlideInView>

          {/* AI Model Selection */}
          <SlideInView visible={true} direction="up" delay={200}>
            <View style={{ marginBottom: 24 }}>
              <Typography
                variant="h6"
                weight="semibold"
                color={theme.colors.textPrimary}
                style={{ marginBottom: 16 }}
              >
                AI Model
              </Typography>
              <Typography
                variant="bodySm"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 16 }}
              >
                Choose the AI model for this conversation. Each model has different capabilities and costs.
              </Typography>
              
              {AI_MODELS.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selectedModel === model.id}
                  onSelect={() => handleModelSelect(model.id)}
                />
              ))}
            </View>
          </SlideInView>

          {/* Danger Zone */}
          {conversationId && (
            <SlideInView visible={true} direction="up" delay={300}>
              <View style={{ marginTop: 24 }}>
                <Typography
                  variant="h6"
                  weight="semibold"
                  color={theme.colors.textPrimary}
                  style={{ marginBottom: 16 }}
                >
                  Danger Zone
                </Typography>
                
                <AnimatedTouchable
                  onPress={handleDeleteConversation}
                  animationType="scale"
                  scaleValue={0.98}
                >
                  <Card
                    variant="outlined"
                    style={{
                      borderColor: theme.colors.red['300'],
                      backgroundColor: theme.colors.red['50'],
                      borderRadius: 16,
                      padding: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: theme.colors.red['100'],
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                        <Trash2 size={18} color={theme.colors.red['600']} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Typography
                          variant="bodyLg"
                          weight="semibold"
                          color={theme.colors.red['700']}
                        >
                          Delete Conversation
                        </Typography>
                        <Typography
                          variant="bodySm"
                          color={theme.colors.red['600']}
                        >
                          This action cannot be undone
                        </Typography>
                      </View>
                    </View>
                  </Card>
                </AnimatedTouchable>
              </View>
            </SlideInView>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

EnhancedChatSettingsModal.displayName = 'EnhancedChatSettingsModal';