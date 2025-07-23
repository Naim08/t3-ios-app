import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native';
import { useTheme } from '../../components/ThemeProvider';
import { Typography, Card } from '../../ui/atoms';
import {
  PartnerPersonaCustomization,
  PersonalityTrait,
  getTraitsByCategory,
} from '../../types/partnerPersona';

interface PartnerPersonaBuilderProps {
  customization: PartnerPersonaCustomization;
  onUpdate: (customization: PartnerPersonaCustomization) => void;
}

export const PartnerPersonaBuilder: React.FC<PartnerPersonaBuilderProps> = ({
  customization,
  onUpdate,
}) => {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState<'basic' | 'personality' | 'communication' | 'privacy'>('basic');

  // Helper to update customization
  const updateCustomization = (updates: Partial<PartnerPersonaCustomization>) => {
    onUpdate({ ...customization, ...updates });
  };

  // Helper to update trait intensity
  const updateTraitIntensity = (traitId: string, intensity: number) => {
    const updatedTraits = customization.personalityTraits.filter(t => t.traitId !== traitId);
    if (intensity > 0) {
      updatedTraits.push({ traitId, intensity });
    }
    updateCustomization({ personalityTraits: updatedTraits });
  };

  // Get current trait intensity (0-10)
  const getTraitIntensity = (traitId: string): number => {
    const trait = customization.personalityTraits.find(t => t.traitId === traitId);
    return trait?.intensity || 0;
  };

  // Section header component
  const SectionHeader = ({ title, icon, isActive, onPress }: {
    title: string;
    icon: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card
        variant={isActive ? "floating" : "outlined"}
        padding="md"
        borderRadius="xl"
        glow={isActive}
        style={[
          styles.sectionHeaderContainer,
          {
            backgroundColor: isActive ? theme.colors.brand['500'] : theme.colors.surface,
            borderColor: isActive ? theme.colors.brand['500'] : theme.colors.border,
          }
        ]}
      >
        <View style={styles.sectionHeaderContent}>
          <Typography variant="h5" style={styles.sectionHeaderIcon}>
            {icon}
          </Typography>
          <Typography
            variant="bodyMd"
            weight="semibold"
            color={isActive ? '#FFFFFF' : theme.colors.textPrimary}
          >
            {title}
          </Typography>
        </View>
      </Card>
    </TouchableOpacity>
  );

  // Trait intensity slider component
  const TraitSlider = ({ trait }: { trait: PersonalityTrait }) => {
    const intensity = getTraitIntensity(trait.id);
    
    return (
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Typography variant="bodyMd" style={{ fontSize: 16, marginRight: 4 }}>
            {trait.icon}
          </Typography>
          <Typography variant="bodyMd" weight="medium" color={theme.colors.textPrimary}>
            {trait.name}
          </Typography>
          <View style={{ flex: 1 }} />
          <Typography variant="bodySm" color={theme.colors.textSecondary}>
            {intensity}/10
          </Typography>
        </View>
        
        <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 12 }}>
          {trait.description}
        </Typography>

        {/* Intensity selector dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {Array.from({ length: 11 }, (_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => updateTraitIntensity(trait.id, i)}
              activeOpacity={0.7}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: i <= intensity ? theme.colors.brand['500'] : theme.colors.gray['200'],
                alignItems: 'center',
                justifyContent: 'center',
                marginHorizontal: 1,
              }}
            >
              <Typography
                variant="caption"
                weight="medium"
                color={i <= intensity ? '#FFFFFF' : theme.colors.textSecondary}
                style={{ fontSize: 11 }}
              >
                {i}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render basic relationship settings
  const renderBasicSettings = () => (
    <View>
      {/* Relationship Type */}
      <View style={{ marginBottom: 24 }}>
        <Typography
          variant="bodyMd"
          weight="semibold"
          color={theme.colors.textPrimary}
          style={{ marginBottom: 12 }}
        >
          Relationship Type
        </Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { type: 'girlfriend' as const, label: 'Girlfriend', icon: '🥰' },
            { type: 'boyfriend' as const, label: 'Boyfriend', icon: '🤗' },
            { type: 'romantic_friend' as const, label: 'Romantic Friend', icon: '😌' },
            { type: 'life_partner' as const, label: 'Life Partner', icon: '💑' },
          ].map((option) => (
            <TouchableOpacity
              key={option.type}
              onPress={() => updateCustomization({ relationshipType: option.type })}
              activeOpacity={0.8}
            >
              <Card
                variant={customization.relationshipType === option.type ? "floating" : "outlined"}
                padding="sm"
                borderRadius="xl"
                glow={customization.relationshipType === option.type}
                style={{
                  backgroundColor: customization.relationshipType === option.type
                    ? theme.colors.brand['500']
                    : theme.colors.surface,
                  borderColor: customization.relationshipType === option.type
                    ? theme.colors.brand['500']
                    : theme.colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Typography variant="bodyMd" style={{ fontSize: 16, marginRight: 6 }}>
                    {option.icon}
                  </Typography>
                  <Typography
                    variant="bodySm"
                    weight="medium"
                    color={customization.relationshipType === option.type ? '#FFFFFF' : theme.colors.textPrimary}
                  >
                    {option.label}
                  </Typography>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Intimacy Level */}
      <View style={{ marginBottom: 24 }}>
        <Typography
          variant="bodyMd"
          weight="semibold"
          color={theme.colors.textPrimary}
          style={{ marginBottom: 12 }}
        >
          Intimacy Level
        </Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { level: 'casual' as const, label: 'Casual', description: 'Light, friendly connection' },
            { level: 'romantic' as const, label: 'Romantic', description: 'Sweet, loving relationship' },
            { level: 'intimate' as const, label: 'Intimate', description: 'Deep emotional bond' },
            { level: 'deep' as const, label: 'Deep', description: 'Profound soul connection' },
          ].map((option) => (
            <TouchableOpacity
              key={option.level}
              onPress={() => updateCustomization({ intimacyLevel: option.level })}
              activeOpacity={0.8}
              style={{ flex: 1, minWidth: '45%' }}
            >
              <Card
                variant={customization.intimacyLevel === option.level ? "floating" : "outlined"}
                padding="sm"
                borderRadius="xl"
                glow={customization.intimacyLevel === option.level}
                style={{
                  backgroundColor: customization.intimacyLevel === option.level
                    ? theme.colors.brand['500']
                    : theme.colors.surface,
                  borderColor: customization.intimacyLevel === option.level
                    ? theme.colors.brand['500']
                    : theme.colors.border,
                  minHeight: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography
                  variant="bodySm"
                  weight="semibold"
                  color={customization.intimacyLevel === option.level ? '#FFFFFF' : theme.colors.textPrimary}
                  style={{ textAlign: 'center', marginBottom: 2 }}
                >
                  {option.label}
                </Typography>
                <Typography
                  variant="caption"
                  color={customization.intimacyLevel === option.level ? '#FFFFFF' : theme.colors.textSecondary}
                  style={{ textAlign: 'center' }}
                >
                  {option.description}
                </Typography>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // Render personality trait builder
  const renderPersonalityBuilder = () => (
    <View>
      <Typography
        variant="bodyMd"
        weight="semibold"
        color={theme.colors.textPrimary}
        style={{ marginBottom: 8 }}
      >
        Personality Traits
      </Typography>
      <Typography
        variant="bodySm"
        color={theme.colors.textSecondary}
        style={{ marginBottom: 20, lineHeight: 18 }}
      >
        Customize your partner's personality by adjusting trait intensities. Higher values mean stronger traits.
      </Typography>

      {/* Trait categories */}
      {(['emotional', 'communication', 'lifestyle', 'intimacy'] as const).map((category) => (
        <View key={category} style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Typography
              variant="bodyMd"
              weight="bold"
              color={theme.colors.textPrimary}
              style={{ textTransform: 'capitalize' }}
            >
              {category === 'emotional' ? '💝 Emotional' :
               category === 'communication' ? '💬 Communication' :
               category === 'lifestyle' ? '🌟 Lifestyle' :
               '💕 Intimacy'} Traits
            </Typography>
          </View>
          
          {getTraitsByCategory(category).map((trait) => (
            <TraitSlider key={trait.id} trait={trait} />
          ))}
        </View>
      ))}
    </View>
  );

  // Render communication preferences
  const renderCommunicationSettings = () => (
    <View>
      {/* Communication Style */}
      <View style={{ marginBottom: 24 }}>
        <Typography
          variant="bodyMd"
          weight="semibold"
          color={theme.colors.textPrimary}
          style={{ marginBottom: 12 }}
        >
          Communication Style
        </Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { style: 'playful' as const, label: 'Playful', icon: '😄' },
            { style: 'caring' as const, label: 'Caring', icon: '🤗' },
            { style: 'flirty' as const, label: 'Flirty', icon: '😘' },
            { style: 'serious' as const, label: 'Serious', icon: '🧐' },
            { style: 'balanced' as const, label: 'Balanced', icon: '😌' },
          ].map((option) => (
            <TouchableOpacity
              key={option.style}
              onPress={() => updateCustomization({ communicationStyle: option.style })}
              activeOpacity={0.8}
            >
              <Card
                variant={customization.communicationStyle === option.style ? "floating" : "outlined"}
                padding="sm"
                borderRadius="xl"
                glow={customization.communicationStyle === option.style}
                style={{
                  backgroundColor: customization.communicationStyle === option.style
                    ? theme.colors.brand['500']
                    : theme.colors.surface,
                  borderColor: customization.communicationStyle === option.style
                    ? theme.colors.brand['500']
                    : theme.colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Typography variant="bodyMd" style={{ fontSize: 16, marginRight: 6 }}>
                    {option.icon}
                  </Typography>
                  <Typography
                    variant="bodySm"
                    weight="medium"
                    color={customization.communicationStyle === option.style ? '#FFFFFF' : theme.colors.textPrimary}
                  >
                    {option.label}
                  </Typography>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pet Names */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Typography
            variant="bodyMd"
            weight="semibold"
            color={theme.colors.textPrimary}
          >
            Use Pet Names
          </Typography>
          <Switch
            value={customization.communicationPreferences.usesPetNames}
            onValueChange={(value) => 
              updateCustomization({
                communicationPreferences: {
                  ...customization.communicationPreferences,
                  usesPetNames: value,
                },
              })
            }
            trackColor={{ false: theme.colors.gray['300'], true: theme.colors.brand['200'] }}
            thumbColor={customization.communicationPreferences.usesPetNames ? theme.colors.brand['500'] : theme.colors.gray['500']}
          />
        </View>
        
        {customization.communicationPreferences.usesPetNames && (
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
              value={customization.communicationPreferences.preferredPetNames.join(', ')}
              onChangeText={(text) => 
                updateCustomization({
                  communicationPreferences: {
                    ...customization.communicationPreferences,
                    preferredPetNames: text.split(',').map(s => s.trim()).filter(s => s),
                  },
                })
              }
              placeholder="sweetheart, babe, love, honey..."
              placeholderTextColor={theme.colors.textSecondary}
            />
          </Card>
        )}
      </View>

      {/* Conversation Depth */}
      <View style={{ marginBottom: 24 }}>
        <Typography
          variant="bodyMd"
          weight="semibold"
          color={theme.colors.textPrimary}
          style={{ marginBottom: 12 }}
        >
          Preferred Conversation Depth
        </Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { depth: 'light' as const, label: 'Light & Fun', description: 'Casual, easy topics' },
            { depth: 'moderate' as const, label: 'Moderate', description: 'Mix of light and deeper' },
            { depth: 'deep' as const, label: 'Deep', description: 'Meaningful discussions' },
            { depth: 'philosophical' as const, label: 'Philosophical', description: 'Complex ideas' },
          ].map((option) => (
            <TouchableOpacity
              key={option.depth}
              onPress={() => 
                updateCustomization({
                  communicationPreferences: {
                    ...customization.communicationPreferences,
                    conversationDepth: option.depth,
                  },
                })
              }
              activeOpacity={0.8}
              style={{ flex: 1, minWidth: '45%' }}
            >
              <Card
                variant={customization.communicationPreferences.conversationDepth === option.depth ? "floating" : "outlined"}
                padding="sm"
                borderRadius="xl"
                glow={customization.communicationPreferences.conversationDepth === option.depth}
                style={{
                  backgroundColor: customization.communicationPreferences.conversationDepth === option.depth
                    ? theme.colors.brand['500']
                    : theme.colors.surface,
                  borderColor: customization.communicationPreferences.conversationDepth === option.depth
                    ? theme.colors.brand['500']
                    : theme.colors.border,
                  minHeight: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography
                  variant="bodySm"
                  weight="semibold"
                  color={customization.communicationPreferences.conversationDepth === option.depth ? '#FFFFFF' : theme.colors.textPrimary}
                  style={{ textAlign: 'center', marginBottom: 2 }}
                >
                  {option.label}
                </Typography>
                <Typography
                  variant="caption"
                  color={customization.communicationPreferences.conversationDepth === option.depth ? '#FFFFFF' : theme.colors.textSecondary}
                  style={{ textAlign: 'center' }}
                >
                  {option.description}
                </Typography>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // Render privacy settings
  const renderPrivacySettings = () => (
    <View>
      <Typography
        variant="bodyMd"
        weight="semibold"
        color={theme.colors.textPrimary}
        style={{ marginBottom: 8 }}
      >
        Privacy & Memory Settings
      </Typography>
      <Typography
        variant="bodySm"
        color={theme.colors.textSecondary}
        style={{ marginBottom: 20, lineHeight: 18 }}
      >
        Control how your partner persona handles memories and personal data.
      </Typography>

      {/* Memory Settings */}
      <View style={{ marginBottom: 20 }}>
        {[
          { key: 'rememberPersonalDetails', label: 'Remember Personal Details', description: 'Store details about your life, preferences, and experiences' },
          { key: 'rememberConversations', label: 'Remember Conversations', description: 'Keep context from previous chats' },
          { key: 'rememberMilestones', label: 'Remember Milestones', description: 'Track important dates and relationship moments' },
          { key: 'autoExtractMemories', label: 'Auto-Extract Memories', description: 'Automatically identify and save important moments' },
        ].map((setting) => (
          <View key={setting.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Typography
                variant="bodyMd"
                weight="medium"
                color={theme.colors.textPrimary}
                style={{ marginBottom: 2 }}
              >
                {setting.label}
              </Typography>
              <Typography
                variant="caption"
                color={theme.colors.textSecondary}
              >
                {setting.description}
              </Typography>
            </View>
            <Switch
              value={customization.memoryPreferences[setting.key as keyof typeof customization.memoryPreferences] as boolean}
              onValueChange={(value) => 
                updateCustomization({
                  memoryPreferences: {
                    ...customization.memoryPreferences,
                    [setting.key]: value,
                  },
                })
              }
              trackColor={{ false: theme.colors.gray['300'], true: theme.colors.brand['200'] }}
              thumbColor={customization.memoryPreferences[setting.key as keyof typeof customization.memoryPreferences] ? theme.colors.brand['500'] : theme.colors.gray['500']}
            />
          </View>
        ))}
      </View>

      {/* Privacy Controls */}
      <View>
        {[
          { key: 'conversationEncryption', label: 'End-to-End Encryption', description: 'Encrypt all conversations for maximum privacy' },
          { key: 'allowAnalytics', label: 'Anonymous Analytics', description: 'Help improve the service with usage data' },
          { key: 'shareWithAITraining', label: 'AI Training Data', description: 'Allow conversations to improve AI models' },
        ].map((setting) => (
          <View key={setting.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Typography
                variant="bodyMd"
                weight="medium"
                color={theme.colors.textPrimary}
                style={{ marginBottom: 2 }}
              >
                {setting.label}
              </Typography>
              <Typography
                variant="caption"
                color={theme.colors.textSecondary}
              >
                {setting.description}
              </Typography>
            </View>
            <Switch
              value={customization.privacySettings[setting.key as keyof typeof customization.privacySettings] as boolean}
              onValueChange={(value) => 
                updateCustomization({
                  privacySettings: {
                    ...customization.privacySettings,
                    [setting.key]: value,
                  },
                })
              }
              trackColor={{ false: theme.colors.gray['300'], true: theme.colors.brand['200'] }}
              thumbColor={customization.privacySettings[setting.key as keyof typeof customization.privacySettings] ? theme.colors.brand['500'] : theme.colors.gray['500']}
            />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Section Navigation */}
      <View style={{ marginBottom: 20 }}>
        <SectionHeader
          title="Basic Settings"
          icon="💕"
          isActive={activeSection === 'basic'}
          onPress={() => setActiveSection('basic')}
        />
        <SectionHeader
          title="Personality Builder"
          icon="✨"
          isActive={activeSection === 'personality'}
          onPress={() => setActiveSection('personality')}
        />
        <SectionHeader
          title="Communication"
          icon="💬"
          isActive={activeSection === 'communication'}
          onPress={() => setActiveSection('communication')}
        />
        <SectionHeader
          title="Privacy & Memory"
          icon="🔒"
          isActive={activeSection === 'privacy'}
          onPress={() => setActiveSection('privacy')}
        />
      </View>

      {/* Active Section Content */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {activeSection === 'basic' && renderBasicSettings()}
        {activeSection === 'personality' && renderPersonalityBuilder()}
        {activeSection === 'communication' && renderCommunicationSettings()}
        {activeSection === 'privacy' && renderPrivacySettings()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeaderContainer: {
    marginBottom: 12,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  traitContainer: {
    marginBottom: 24,
  },
  traitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  traitIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  flex1: {
    flex: 1,
  },
  traitDescription: {
    marginBottom: 12,
  },
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
}); 