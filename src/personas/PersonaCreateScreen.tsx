import { useState, useRef, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { usePersona } from '../context/PersonaContext';
import { Typography, Card, AnimatedTouchable, TransitionView, LoadingStateManager, FadeInView } from '../ui/atoms';
import { ToolSelector } from '../components/ToolSelector';
import { ModelProviderLogo, getProviderFromModelId } from '../components/ModelProviderLogo';
import { ModelCapabilityIcons, detectModelCapabilities } from '../components/ModelCapabilityIcons';
import { supabase } from '../lib/supabase';
import { AI_MODELS } from '../config/models';
import { SuccessModal, SuccessModalRef } from '../components/SuccessModal';

interface PersonaTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  system_prompt: string;
  category_id: string;
  default_model: string;
}

const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    id: 'custom-blank',
    name: 'Blank Persona',
    icon: '🤖',
    description: 'Start from scratch with a completely custom persona',
    system_prompt: '',
    category_id: 'lifestyle',
    default_model: 'gpt-3.5-turbo',
  },
  {
    id: 'custom-assistant',
    name: 'Personal Assistant',
    icon: '🗂️',
    description: 'Helpful assistant for daily tasks and organization',
    system_prompt: 'You are a helpful personal assistant. You help with task organization, scheduling, reminders, and general productivity. Be concise, practical, and supportive.',
    category_id: 'productivity',
    default_model: 'gpt-3.5-turbo',
  },
  {
    id: 'custom-tutor',
    name: 'Subject Tutor',
    icon: '🎓',
    description: 'Tutor specialized in a specific subject',
    system_prompt: 'You are a patient and knowledgeable tutor. Break down complex concepts into simple explanations. Use examples and analogies. Always encourage learning and ask questions to check understanding.',
    category_id: 'learning',
    default_model: 'gpt-3.5-turbo',
  },
  {
    id: 'custom-creative',
    name: 'Creative Partner',
    icon: '🎨',
    description: 'Creative collaborator for artistic projects',
    system_prompt: 'You are a creative collaborator who inspires and supports artistic endeavors. You help brainstorm ideas, provide feedback, and encourage creative exploration across all mediums.',
    category_id: 'creative',
    default_model: 'gpt-3.5-turbo',
  },
];

const EMOJI_SUGGESTIONS = [
  '🤖', '🎯', '💡', '📚', '🎨', '💼', '🏋️', '🍳', '🌟', '⚡',
  '🧠', '💻', '🎭', '🔬', '📈', '🎵', '🏃', '✍️', '🔧', '🎪',
  '👨‍💼', '👩‍🏫', '👨‍⚕️', '👩‍🍳', '👨‍🎨', '👩‍💻', '🧙‍♂️', '🦸‍♀️'
];

export const PersonaCreateScreen = ({ navigation }: any) => {
  console.log('🎭 PersonaCreateScreen rendering');
  const { theme } = useTheme();
  const { categories, refreshPersonaData } = usePersona();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<PersonaTemplate | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [icon, setIcon] = useState('🤖');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [categoryId, setCategoryId] = useState('lifestyle');
  const [defaultModel, setDefaultModel] = useState('gpt-3.5-turbo');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [step, setStep] = useState<'template' | 'details' | 'tools' | 'prompt'>('template');
  const [displayStep, setDisplayStep] = useState<'template' | 'details' | 'tools' | 'prompt'>('template');

  const scrollViewRef = useRef<ScrollView>(null);
  const successModalRef = useRef<SuccessModalRef>(null);
  
  const animateStepTransition = (newStep: 'template' | 'details' | 'tools' | 'prompt') => {
    setStep(newStep);
    setDisplayStep(newStep);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBack = () => {
    if (step === 'prompt') {
      animateStepTransition('tools');
    } else if (step === 'tools') {
      animateStepTransition('details');
    } else if (step === 'details') {
      animateStepTransition('template');
    }
  };

  // Configure navigation header with custom back button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={step === 'template' ? () => navigation.goBack() : handleBack}
          style={{ marginLeft: 16 }}
        >
          <Typography variant="h4" color={theme.colors.textPrimary}>←</Typography>
        </TouchableOpacity>
      ),
    });
  }, [navigation, step, theme.colors.textPrimary, handleBack]);

  const handleTemplateSelect = (template: PersonaTemplate) => {
    setSelectedTemplate(template);
    setDisplayName(template.name);
    setIcon(template.icon);
    setDescription(template.description);
    setSystemPrompt(template.system_prompt);
    setCategoryId(template.category_id);
    setDefaultModel(template.default_model);
    setSelectedTools([]);
  };

  const handleNext = () => {
    if (step === 'details') {
      if (!displayName.trim()) {
        Alert.alert('Error', 'Please enter a name for your persona');
        return;
      }
      animateStepTransition('tools');
    } else if (step === 'tools') {
      animateStepTransition('prompt');
    }
  };

  const handleCreate = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a name for your persona');
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        Alert.alert('Error', 'You must be logged in to create a persona');
        return;
      }

      // Generate a unique ID
      const personaId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      const { error } = await supabase
        .from('personas')
        .insert({
          id: personaId,
          display_name: displayName.trim(),
          icon: icon,
          description: description.trim() || null,
          system_prompt: systemPrompt.trim(),
          default_model: defaultModel,
          requires_premium: false,
          category_id: categoryId,
          created_by_user_id: user.user.id,
          is_template: false,
          tags: [],
          usage_count: 0,
          is_featured: false,
          tool_ids: selectedTools.length > 0 ? selectedTools : null,
        });

      if (error) {
        console.error('Error creating persona:', error);
        Alert.alert('Error', 'Failed to create persona. Please try again.');
        return;
      }

      // Refresh persona data
      await refreshPersonaData();

      // Show success modal
      successModalRef.current?.present();
    } catch (error) {
      console.error('Error creating persona:', error);
      Alert.alert('Error', 'Failed to create persona. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderTemplateCard = (template: PersonaTemplate) => (
    <TouchableOpacity
      key={template.id}
      onPress={() => handleTemplateSelect(template)}
      activeOpacity={0.8}
      style={{ marginBottom: 16 }}
    >
      <Card
        variant={selectedTemplate?.id === template.id ? "floating" : "elevated"}
        padding="lg"
        borderRadius="2xl"
        glow={selectedTemplate?.id === template.id}
        style={{
          borderWidth: 2,
          borderColor: selectedTemplate?.id === template.id
            ? theme.colors.brand['500']
            : theme.colors.border,
          backgroundColor: selectedTemplate?.id === template.id
            ? theme.colors.brand['50']
            : theme.colors.surface,
        }}
      >
        <Typography 
          variant="h2" 
          style={{ 
            fontSize: 48, 
            textAlign: 'center', 
            marginBottom: 12 
          }}
        >
          {template.icon}
        </Typography>
        <Typography
          variant="h6"
          weight="semibold"
          color={theme.colors.textPrimary}
          style={{ textAlign: 'center', marginBottom: 8 }}
        >
          {template.name}
        </Typography>
        <Typography
          variant="bodySm"
          color={theme.colors.textSecondary}
          style={{ textAlign: 'center', lineHeight: 18 }}
        >
          {template.description}
        </Typography>
      </Card>
    </TouchableOpacity>
  );

  const renderEmojiPicker = () => (
    <Card
      variant="glass"
      padding="md"
      borderRadius="xl"
      style={{ marginTop: 8 }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {EMOJI_SUGGESTIONS.map((emoji, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              setIcon(emoji);
              setShowEmojiPicker(false);
            }}
            activeOpacity={0.7}
          >
            <Card
              variant="elevated"
              padding="sm"
              borderRadius="lg"
              style={{
                minWidth: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h4" style={{ fontSize: 24 }}>
                {emoji}
              </Typography>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Card>
  );

  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* Progress Indicator */}
        <Card
          variant="glass"
          padding="md"
          style={{ marginHorizontal: 16, marginVertical: 8 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            {['template', 'details', 'tools', 'prompt'].map((stepName, index) => {
              const isActive = step === stepName;
              const isCompleted = index < ['template', 'details', 'tools', 'prompt'].indexOf(step);
              
              return (
                <View key={stepName} style={{ flex: 1, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: isActive || isCompleted
                        ? theme.colors.brand['500']
                        : theme.colors.gray['300'],
                      marginBottom: 4,
                    }}
                  />
                  <Typography
                    variant="caption"
                    weight={isActive ? 'semibold' : 'regular'}
                    color={isActive 
                      ? theme.colors.brand['500'] 
                      : theme.colors.textTertiary
                    }
                    style={{ textAlign: 'center' }}
                  >
                    {stepName === 'template' ? 'Template' : 
                     stepName === 'details' ? 'Details' : 
                     stepName === 'tools' ? 'Tools' : 'Prompt'}
                  </Typography>
                </View>
              );
            })}
          </View>
        </Card>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <TransitionView
            visible={true}
            type="fade"
            duration={300}
          >
          {displayStep === 'template' && (
            <View>
              <Card
                variant="floating"
                padding="lg"
                borderRadius="2xl"
                glow
                style={{
                  marginBottom: 24,
                  backgroundColor: theme.colors.brand['50'],
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Typography
                    variant="h1"
                    style={{ fontSize: 32, marginRight: 12 }}
                  >
                    🎭
                  </Typography>
                  <Typography
                    variant="h5"
                    weight="bold"
                    color={theme.colors.brand['700']}
                  >
                    Choose a Starting Template
                  </Typography>
                </View>
                <Typography
                  variant="bodyMd"
                  color={theme.colors.brand['600']}
                  style={{ lineHeight: 22 }}
                >
                  Select a template to get started quickly, or choose blank to create from scratch. Each template provides a foundation you can customize.
                </Typography>
              </Card>

              <View style={styles.templatesGrid}>
                {PERSONA_TEMPLATES.map(renderTemplateCard)}
              </View>
            </View>
          )}

          {displayStep === 'details' && (
            <View>
              <Card
                variant="floating"
                padding="lg"
                borderRadius="2xl"
                glow
                style={{
                  marginBottom: 24,
                  backgroundColor: theme.colors.accent['50'],
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Typography
                    variant="h1"
                    style={{ fontSize: 32, marginRight: 12 }}
                  >
                    ✨
                  </Typography>
                  <Typography
                    variant="h5"
                    weight="bold"
                    color={theme.colors.accent['700']}
                  >
                    Persona Details
                  </Typography>
                </View>
                <Typography
                  variant="bodyMd"
                  color={theme.colors.accent['600']}
                  style={{ lineHeight: 22 }}
                >
                  Customize your persona's appearance, name, and basic information. This helps users identify and connect with your AI assistant.
                </Typography>
              </Card>

              {/* Icon Selection */}
              <View style={styles.fieldContainer}>
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color={theme.colors.textPrimary}
                  style={styles.fieldLabel}
                >
                  Icon
                </Typography>
                <AnimatedTouchable
                  onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                  animationType="scale"
                  scaleValue={0.98}
                  hapticFeedback={true}
                >
                  <Card
                    variant="outlined"
                    padding="lg"
                    borderRadius="xl"
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 100,
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Typography variant="h1" style={{ fontSize: 48, marginBottom: 8 }}>
                      {icon}
                    </Typography>
                    <Typography variant="bodyMd" color={theme.colors.textSecondary}>
                      Tap to change
                    </Typography>
                  </Card>
                </AnimatedTouchable>
                {showEmojiPicker && renderEmojiPicker()}
              </View>

              {/* Name */}
              <View style={styles.fieldContainer}>
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color={theme.colors.textPrimary}
                  style={styles.fieldLabel}
                >
                  Name *
                </Typography>
                <Card
                  variant="outlined"
                  padding="none"
                  borderRadius="xl"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}
                >
                  <TextInput
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: theme.colors.textPrimary,
                      minHeight: 48,
                    }}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter persona name"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </Card>
              </View>

              {/* Description */}
              <View style={styles.fieldContainer}>
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color={theme.colors.textPrimary}
                  style={styles.fieldLabel}
                >
                  Description
                </Typography>
                <Card
                  variant="outlined"
                  padding="none"
                  borderRadius="xl"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}
                >
                  <TextInput
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: theme.colors.textPrimary,
                      minHeight: 80,
                    }}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Brief description of your persona"
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    textAlignVertical="top"
                  />
                </Card>
              </View>

              {/* Category */}
              <View style={styles.fieldContainer}>
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color={theme.colors.textPrimary}
                  style={styles.fieldLabel}
                >
                  Category
                </Typography>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryContainer}
                >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => setCategoryId(category.id)}
                      activeOpacity={0.8}
                      style={{ marginRight: 8 }}
                    >
                      <Card
                        variant={categoryId === category.id ? "floating" : "outlined"}
                        padding="sm"
                        borderRadius="2xl"
                        glow={categoryId === category.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: categoryId === category.id
                            ? theme.colors.brand['500']
                            : theme.colors.surface,
                          borderColor: categoryId === category.id
                            ? theme.colors.brand['500']
                            : theme.colors.border,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          gap: 6,
                        }}
                      >
                        <Typography variant="bodyMd" style={{ fontSize: 16 }}>
                          {category.icon}
                        </Typography>
                        <Typography
                          variant="bodySm"
                          weight="medium"
                          color={categoryId === category.id ? '#FFFFFF' : theme.colors.textPrimary}
                        >
                          {category.name}
                        </Typography>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Default Model */}
              <View style={styles.fieldContainer}>
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color={theme.colors.textPrimary}
                  style={styles.fieldLabel}
                >
                  Default AI Model
                </Typography>
                {AI_MODELS.map((model) => (
                  <TouchableOpacity
                    key={model.id}
                    onPress={() => setDefaultModel(model.id)}
                    activeOpacity={0.8}
                    style={{ marginBottom: 8 }}
                  >
                    <Card
                      variant={defaultModel === model.id ? "floating" : "outlined"}
                      padding="md"
                      borderRadius="xl"
                      glow={defaultModel === model.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: defaultModel === model.id
                          ? theme.colors.brand['100']
                          : theme.colors.surface,
                        borderColor: defaultModel === model.id
                          ? theme.colors.brand['500']
                          : theme.colors.border,
                        borderWidth: 2,
                      }}
                    >
                      <ModelProviderLogo
                        provider={getProviderFromModelId(model.id)}
                        size={24}
                        style={{ marginRight: 12 }}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Typography
                            variant="bodySm"
                            weight="semibold"
                            color={theme.colors.textPrimary}
                          >
                            {model.name}
                          </Typography>
                          <ModelCapabilityIcons
                            capabilities={detectModelCapabilities(model.id, model.capabilities)}
                            iconSize={14}
                            maxIcons={3}
                          />
                        </View>
                        <Typography
                          variant="caption"
                          color={theme.colors.textSecondary}
                          style={{ marginTop: 2 }}
                        >
                          {model.description}
                        </Typography>
                      </View>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: defaultModel === model.id
                            ? theme.colors.brand['500']
                            : theme.colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {defaultModel === model.id && (
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: theme.colors.brand['500'],
                            }}
                          />
                        )}
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {displayStep === 'tools' && (
            <View>
              <Card
                variant="floating"
                padding="lg"
                borderRadius="2xl"
                glow
                style={{
                  marginBottom: 24,
                  backgroundColor: theme.colors.brand['50'],
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Typography
                    variant="h1"
                    style={{ fontSize: 32, marginRight: 12 }}
                  >
                    🛠️
                  </Typography>
                  <Typography
                    variant="h5"
                    weight="bold"
                    color={theme.colors.brand['700']}
                  >
                    Tools & Capabilities
                  </Typography>
                </View>
                <Typography
                  variant="bodyMd"
                  color={theme.colors.brand['600']}
                  style={{ lineHeight: 22 }}
                >
                  Choose which tools your persona can access during conversations. Tools enable web search, weather information, and specialized functions.
                </Typography>
              </Card>

              <ToolSelector
                selectedTools={selectedTools}
                onToolsChange={setSelectedTools}
                disabled={loading}
              />
            </View>
          )}

          {displayStep === 'prompt' && (
            <View>
              <Card
                variant="floating"
                padding="lg"
                borderRadius="2xl"
                glow
                style={{
                  marginBottom: 24,
                  backgroundColor: theme.colors.accent['50'],
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Typography
                    variant="h1"
                    style={{ fontSize: 32, marginRight: 12 }}
                  >
                    🧠
                  </Typography>
                  <Typography
                    variant="h5"
                    weight="bold"
                    color={theme.colors.accent['700']}
                  >
                    System Prompt
                  </Typography>
                </View>
                <Typography
                  variant="bodyMd"
                  color={theme.colors.accent['600']}
                  style={{ lineHeight: 22 }}
                >
                  Define how your persona should behave and respond. This is the most important part that shapes your AI's personality!
                  {selectedTools.length > 0 && (
                    `\n\n💡 Your persona has ${selectedTools.length} tool${selectedTools.length === 1 ? '' : 's'} available. Consider mentioning how they should use these capabilities in your prompt.`
                  )}
                </Typography>
              </Card>

              <View style={styles.fieldContainer}>
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color={theme.colors.textPrimary}
                  style={styles.fieldLabel}
                >
                  System Prompt
                </Typography>
                <Card
                  variant="outlined"
                  padding="none"
                  borderRadius="xl"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}
                >
                  <TextInput
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: theme.colors.textPrimary,
                      minHeight: 200,
                    }}
                    value={systemPrompt}
                    onChangeText={setSystemPrompt}
                    placeholder="Describe your persona's role, expertise, personality, and how it should interact..."
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    textAlignVertical="top"
                  />
                </Card>
              </View>

              {/* Prompt Tips */}
              <Card
                variant="gradient"
                padding="lg"
                borderRadius="xl"
                style={{
                  marginTop: 16,
                  backgroundColor: theme.colors.brand['50'] || '#f0f7ff',
                }}
              >
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color={theme.colors.brand['700']}
                  style={{ marginBottom: 8 }}
                >
                  💡 Prompt Tips
                </Typography>
                <Typography
                  variant="bodySm"
                  color={theme.colors.brand['600']}
                  style={{ lineHeight: 18 }}
                >
                  • Start with "You are..." to define the role{'\n'}
                  • Include expertise areas and background{'\n'}
                  • Define personality traits and communication style{'\n'}
                  • Specify how to handle different types of questions{'\n'}
                  • Be specific but not overly restrictive
                </Typography>
              </Card>
            </View>
          )}
          </TransitionView>
        </ScrollView>

        {/* Footer */}
        <Card
          variant="glass"
          padding="md"
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border + '30',
          }}
        >
          {step === 'template' ? (
            <TouchableOpacity
              onPress={selectedTemplate ? () => animateStepTransition('details') : () => handleTemplateSelect(PERSONA_TEMPLATES[0])}
              activeOpacity={0.8}
            >
              <Card
                variant="floating"
                padding="md"
                borderRadius="xl"
                glow
                style={{
                  backgroundColor: theme.colors.brand['500'],
                  alignItems: 'center',
                }}
              >
                <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
                  {selectedTemplate ? 'Next' : 'Start with Blank Template'}
                </Typography>
              </Card>
            </TouchableOpacity>
          ) : step === 'details' ? (
            <TouchableOpacity
              onPress={handleNext}
              disabled={!displayName.trim()}
              activeOpacity={0.8}
            >
              <Card
                variant="floating"
                padding="md"
                borderRadius="xl"
                glow={!!displayName.trim()}
                style={{
                  backgroundColor: displayName.trim() 
                    ? theme.colors.brand['500'] 
                    : theme.colors.gray['300'],
                  alignItems: 'center',
                  opacity: displayName.trim() ? 1 : 0.6,
                }}
              >
                <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
                  Continue to Tools
                </Typography>
              </Card>
            </TouchableOpacity>
          ) : step === 'tools' ? (
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Card
                variant="floating"
                padding="md"
                borderRadius="xl"
                glow
                style={{
                  backgroundColor: theme.colors.brand['500'],
                  alignItems: 'center',
                }}
              >
                <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
                  Continue to Prompt
                </Typography>
              </Card>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Card
                variant="floating"
                padding="md"
                borderRadius="xl"
                glow={!loading ? true : false}
                style={{
                  backgroundColor: !loading 
                    ? theme.colors.brand['500'] 
                    : theme.colors.gray['300'],
                  alignItems: 'center',
                  opacity: !loading ? 1 : 0.6,
                }}
              >
                <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
                  {loading ? 'Creating...' : 'Create Persona'}
                </Typography>
              </Card>
            </TouchableOpacity>
          )}
        </Card>
      </KeyboardAvoidingView>

      <SuccessModal
        ref={successModalRef}
        title="Persona Created! 🎉"
        message={`"${displayName}" has been successfully created and is ready to chat with you.`}
        buttonText="Start Chatting"
        icon="🎭"
        onButtonPress={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    gap: 30,
  },
  progressItem: {
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepTitle: {
    marginBottom: 8,
  },
  stepDescription: {
    marginBottom: 24,
    lineHeight: 20,
  },
  templatesGrid: {
    gap: 16,
  },
  templateCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  templateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  templateName: {
    marginBottom: 8,
  },
  templateDescription: {
    lineHeight: 18,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  iconSelector: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 8,
  },
  selectedIcon: {
    fontSize: 48,
  },
  emojiPicker: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  emojiGrid: {
    gap: 12,
  },
  emojiButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoryContainer: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryIcon: {
    fontSize: 16,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
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
  promptInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 200,
  },
  tipsContainer: {
    borderRadius: 12,
    marginTop: 16,
  },
  tipsTitle: {
    marginBottom: 8,
  },
  tipsText: {
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
