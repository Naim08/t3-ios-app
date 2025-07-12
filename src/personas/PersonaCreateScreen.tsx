import React, { useState, useRef, useLayoutEffect } from 'react';
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
import { usePersona, PersonaCategory } from '../context/PersonaContext';
import { Typography, Surface } from '../ui/atoms';
import { ToolSelector } from '../components/ToolSelector';
import { supabase } from '../lib/supabase';
import { AI_MODELS } from '../config/models';

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
  const { theme, colorScheme } = useTheme();
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

  const scrollViewRef = useRef<ScrollView>(null);

  const handleBack = () => {
    if (step === 'prompt') {
      setStep('tools');
    } else if (step === 'tools') {
      setStep('details');
    } else if (step === 'details') {
      setStep('template');
    }
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
    setStep('details');
  };

  const handleNext = () => {
    if (step === 'details') {
      if (!displayName.trim()) {
        Alert.alert('Error', 'Please enter a name for your persona');
        return;
      }
      setStep('tools');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else if (step === 'tools') {
      setStep('prompt');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
      const personaId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

      Alert.alert(
        'Success!',
        'Your custom persona has been created.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
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
      className={`p-4 rounded-2xl border-2 mb-4 ${
        selectedTemplate?.id === template.id
          ? 'border-brand-500'
          : colorScheme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-200 bg-white'
      }`}
      onPress={() => handleTemplateSelect(template)}
    >
      <Typography variant="h2" className="text-4xl text-center mb-3">
        {template.icon}
      </Typography>
      <Typography
        variant="h6"
        weight="semibold"
        className={`text-center mb-2 ${
          colorScheme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}
      >
        {template.name}
      </Typography>
      <Typography
        variant="bodySm"
        className={`text-center ${
          colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        {template.description}
      </Typography>
    </TouchableOpacity>
  );

  const renderEmojiPicker = () => (
    <View className={`p-3 rounded-xl mt-2 ${
      colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'
    }`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {EMOJI_SUGGESTIONS.map((emoji, index) => (
          <TouchableOpacity
            key={index}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
            onPress={() => {
              setIcon(emoji);
              setShowEmojiPicker(false);
            }}
          >
            <Typography variant="h4" className="text-2xl">{emoji}</Typography>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${
      colorScheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* Progress Indicator */}
        <View className="flex-row justify-center items-center py-4 px-6">
          {['template', 'details', 'tools', 'prompt'].map((stepName, index) => (
            <View key={stepName} className="flex-1 items-center">
              <View
                className={`w-3 h-3 rounded-full ${
                  step === stepName || index < ['template', 'details', 'tools', 'prompt'].indexOf(step)
                    ? 'bg-brand-500'
                    : colorScheme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                }`}
              />
              <Typography
                variant="caption"
                className={`mt-1 text-center ${
                  step === stepName 
                    ? 'text-brand-500' 
                    : colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {stepName === 'template' ? 'Template' : 
                 stepName === 'details' ? 'Details' : 
                 stepName === 'tools' ? 'Tools' : 'Prompt'}
              </Typography>
            </View>
          ))}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {step === 'template' && (
            <View>
              <Typography
                variant="h6"
                weight="semibold"
                color={theme.colors.textPrimary}
                style={styles.stepTitle}
              >
                Choose a Starting Template
              </Typography>
              <Typography
                variant="bodyMd"
                color={theme.colors.textSecondary}
                style={styles.stepDescription}
              >
                Select a template to get started quickly, or choose blank to create from scratch
              </Typography>

              <View style={styles.templatesGrid}>
                {PERSONA_TEMPLATES.map(renderTemplateCard)}
              </View>
            </View>
          )}

          {step === 'details' && (
            <View>
              <Typography
                variant="h6"
                weight="semibold"
                color={theme.colors.textPrimary}
                style={styles.stepTitle}
              >
                Persona Details
              </Typography>
              <Typography
                variant="bodyMd"
                color={theme.colors.textSecondary}
                style={styles.stepDescription}
              >
                Customize your persona's appearance and basic information
              </Typography>

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
                <TouchableOpacity
                  style={[styles.iconSelector, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Typography variant="h1" style={styles.selectedIcon}>
                    {icon}
                  </Typography>
                  <Typography variant="bodyMd" color={theme.colors.textSecondary}>
                    Tap to change
                  </Typography>
                </TouchableOpacity>
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
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                  }]}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter persona name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
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
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                    minHeight: 80,
                  }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Brief description of your persona"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
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
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: categoryId === category.id
                            ? theme.colors.brand['500']
                            : theme.colors.surface,
                          borderColor: categoryId === category.id
                            ? theme.colors.brand['500']
                            : theme.colors.border,
                        }
                      ]}
                      onPress={() => setCategoryId(category.id)}
                    >
                      <Typography variant="bodyMd" style={styles.categoryIcon}>
                        {category.icon}
                      </Typography>
                      <Typography
                        variant="bodySm"
                        weight="medium"
                        color={categoryId === category.id ? '#FFFFFF' : theme.colors.textPrimary}
                      >
                        {category.name}
                      </Typography>
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
                    style={[
                      styles.modelOption,
                      {
                        backgroundColor: defaultModel === model.id
                          ? theme.colors.brand['100']
                          : theme.colors.surface,
                        borderColor: defaultModel === model.id
                          ? theme.colors.brand['500']
                          : theme.colors.border,
                      }
                    ]}
                    onPress={() => setDefaultModel(model.id)}
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
                          borderColor: defaultModel === model.id
                            ? theme.colors.brand['500']
                            : theme.colors.border,
                        }
                      ]}
                    >
                      {defaultModel === model.id && (
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
            </View>
          )}

          {step === 'tools' && (
            <View>
              <Typography
                variant="h6"
                weight="semibold"
                color={theme.colors.textPrimary}
                style={styles.stepTitle}
              >
                Tools & Capabilities
              </Typography>
              <Typography
                variant="bodyMd"
                color={theme.colors.textSecondary}
                style={styles.stepDescription}
              >
                Choose which tools your persona can access during conversations. Tools allow your persona to search the web, get weather information, and more.
              </Typography>

              <ToolSelector
                selectedTools={selectedTools}
                onToolsChange={setSelectedTools}
                disabled={loading}
              />
            </View>
          )}

          {step === 'prompt' && (
            <View>
              <Typography
                variant="h6"
                weight="semibold"
                color={theme.colors.textPrimary}
                style={styles.stepTitle}
              >
                System Prompt
              </Typography>
              <Typography
                variant="bodyMd"
                color={theme.colors.textSecondary}
                style={styles.stepDescription}
              >
                Define how your persona should behave and respond. This is the most important part!
                {selectedTools.length > 0 && (
                  `\n\n💡 Your persona has ${selectedTools.length} tool${selectedTools.length === 1 ? '' : 's'} available. Consider mentioning how they should use these capabilities in your prompt.`
                )}
              </Typography>

              <View style={styles.fieldContainer}>
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color={theme.colors.textPrimary}
                  style={styles.fieldLabel}
                >
                  System Prompt
                </Typography>
                <TextInput
                  style={[styles.promptInput, { 
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                  }]}
                  value={systemPrompt}
                  onChangeText={setSystemPrompt}
                  placeholder="Describe your persona's role, expertise, personality, and how it should interact..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Prompt Tips */}
              <Surface
                padding="lg"
                style={{
                  ...styles.tipsContainer,
                  backgroundColor: theme.colors.brand['50'] || '#f0f7ff'
                }}
              >
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color={theme.colors.brand['700']}
                  style={styles.tipsTitle}
                >
                  💡 Prompt Tips
                </Typography>
                <Typography
                  variant="bodySm"
                  color={theme.colors.brand['600']}
                  style={styles.tipsText}
                >
                  • Start with "You are..." to define the role{'\n'}
                  • Include expertise areas and background{'\n'}
                  • Define personality traits and communication style{'\n'}
                  • Specify how to handle different types of questions{'\n'}
                  • Be specific but not overly restrictive
                </Typography>
              </Surface>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          {step === 'template' ? (
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: theme.colors.brand['500'] }]}
              onPress={() => handleTemplateSelect(PERSONA_TEMPLATES[0])}
            >
              <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
                Start with Blank Template
              </Typography>
            </TouchableOpacity>
          ) : step === 'details' ? (
            <TouchableOpacity
              style={[
                styles.continueButton,
                {
                  backgroundColor: displayName.trim() 
                    ? theme.colors.brand['500'] 
                    : theme.colors.gray['300'],
                }
              ]}
              onPress={handleNext}
              disabled={!displayName.trim()}
            >
              <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
                Continue to Tools
              </Typography>
            </TouchableOpacity>
          ) : step === 'tools' ? (
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: theme.colors.brand['500'] }
              ]}
              onPress={handleNext}
            >
              <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
                Continue to Prompt
              </Typography>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.continueButton,
                {
                  backgroundColor: !loading 
                    ? theme.colors.brand['500'] 
                    : theme.colors.gray['300'],
                }
              ]}
              onPress={handleCreate}
              disabled={loading}
            >
              <Typography variant="bodyMd" weight="semibold" color="#FFFFFF">
                {loading ? 'Creating...' : 'Create Persona'}
              </Typography>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
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
