import React, { useState } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from './ThemeProvider';
import { 
  Typography, 
  Card, 
  EnhancedButton,
  PrimaryButton,
  SkeletonLoader,
  SkeletonText,
  SkeletonCard,
  LoadingStateManager,
  PulseLoader,
  ProgressiveLoader,
  TransitionView,
  AnimatedTouchable,
  FadeInView,
  SlideInView,
  StaggeredView
} from '../ui/atoms';
import { Palette, Star, Heart, Zap } from 'lucide-react-native';

interface StyleGuideProps {
  navigation?: {
    goBack: () => void;
  };
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { theme } = useTheme();
  
  return (
    <View style={{ marginBottom: 32 }}>
      <Typography
        variant="h6"
        weight="bold"
        color={theme.colors.textPrimary}
        style={{ marginBottom: 16 }}
      >
        {title}
      </Typography>
      {children}
    </View>
  );
};

const ColorSwatch = ({ color, name }: { color: string; name: string }) => {
  const { theme } = useTheme();
  
  return (
    <View style={{ alignItems: 'center', margin: 8 }}>
      <View
        style={{
          width: 48,
          height: 48,
          backgroundColor: color,
          borderRadius: 24,
          marginBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      />
      <Typography
        variant="caption"
        color={theme.colors.textSecondary}
        style={{ textAlign: 'center' }}
      >
        {name}
      </Typography>
    </View>
  );
};

export const StyleGuide: React.FC<StyleGuideProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [showLoadingDemo, setShowLoadingDemo] = useState(false);
  const [showTransitionDemo, setShowTransitionDemo] = useState(true);
  const [progressiveStage, setProgressiveStage] = useState<string>('connecting');

  const toggleLoadingDemo = () => {
    setShowLoadingDemo(!showLoadingDemo);
    setTimeout(() => setShowLoadingDemo(false), 3000);
  };

  const toggleTransitionDemo = () => {
    setShowTransitionDemo(!showTransitionDemo);
  };

  const cycleProgressiveStage = () => {
    const stages = ['connecting', 'processing', 'generating', 'completing'];
    const currentIndex = stages.indexOf(progressiveStage);
    const nextIndex = (currentIndex + 1) % stages.length;
    setProgressiveStage(stages[nextIndex]);
  };

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: theme.colors.background 
    }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: 20,
          paddingVertical: 20,
          paddingBottom: 40 
        }}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView visible={true}>
          <Typography
            variant="h2"
            weight="bold"
            color={theme.colors.textPrimary}
            style={{ marginBottom: 8 }}
          >
            Style Guide
          </Typography>
          <Typography
            variant="bodyMd"
            color={theme.colors.textSecondary}
            style={{ marginBottom: 32 }}
          >
            Complete documentation of the modern design system components and patterns
          </Typography>
        </FadeInView>

        {/* Typography Section */}
        <Section title="Typography">
          <Card style={{ padding: 20, marginBottom: 16 }}>
            <Typography variant="h1" style={{ marginBottom: 8 }}>Heading 1</Typography>
            <Typography variant="h2" style={{ marginBottom: 8 }}>Heading 2</Typography>
            <Typography variant="h3" style={{ marginBottom: 8 }}>Heading 3</Typography>
            <Typography variant="h4" style={{ marginBottom: 8 }}>Heading 4</Typography>
            <Typography variant="h5" style={{ marginBottom: 8 }}>Heading 5</Typography>
            <Typography variant="h6" style={{ marginBottom: 8 }}>Heading 6</Typography>
            <Typography variant="bodyLg" style={{ marginBottom: 8 }}>Body Large</Typography>
            <Typography variant="bodyMd" style={{ marginBottom: 8 }}>Body Medium</Typography>
            <Typography variant="bodySm" style={{ marginBottom: 8 }}>Body Small</Typography>
            <Typography variant="caption">Caption Text</Typography>
          </Card>
        </Section>

        {/* Color Palette Section */}
        <Section title="Color Palette">
          <Card style={{ padding: 20, marginBottom: 16 }}>
            <Typography variant="bodyMd" style={{ marginBottom: 16 }}>Brand Colors</Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              <ColorSwatch color={theme.colors.brand['400']} name="Brand 400" />
              <ColorSwatch color={theme.colors.brand['500']} name="Brand 500" />
              <ColorSwatch color={theme.colors.brand['600']} name="Brand 600" />
              <ColorSwatch color={theme.colors.accent['500']} name="Accent 500" />
              <ColorSwatch color={theme.colors.accent['600']} name="Accent 600" />
            </View>
            
            <Typography variant="bodyMd" style={{ marginTop: 24, marginBottom: 16 }}>Semantic Colors</Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              <ColorSwatch color={theme.colors.success['500']} name="Success" />
              <ColorSwatch color={theme.colors.warning['500']} name="Warning" />
              <ColorSwatch color={theme.colors.danger['500']} name="Danger" />
              <ColorSwatch color={theme.colors.info['500']} name="Info" />
            </View>
          </Card>
        </Section>

        {/* Buttons Section */}
        <Section title="Buttons">
          <Card style={{ padding: 20, marginBottom: 16 }}>
            <View style={{ gap: 12 }}>
              <EnhancedButton title="Enhanced Primary" onPress={() => {}} variant="primary" />
              <EnhancedButton title="Enhanced Gradient" onPress={() => {}} variant="gradient" />
              <EnhancedButton title="Enhanced Secondary" onPress={() => {}} variant="secondary" />
              <EnhancedButton title="Enhanced Outline" onPress={() => {}} variant="outline" />
              <EnhancedButton title="Enhanced Ghost" onPress={() => {}} variant="ghost" />
              
              <View style={{ marginTop: 16 }}>
                <Typography variant="bodyMd" style={{ marginBottom: 12 }}>With Icons</Typography>
                <EnhancedButton 
                  title="With Icon" 
                  onPress={() => {}} 
                  variant="gradient"
                  icon={<Star size={16} color="#FFFFFF" />}
                  iconPosition="left"
                />
              </View>
              
              <View style={{ marginTop: 16 }}>
                <Typography variant="bodyMd" style={{ marginBottom: 12 }}>Sizes</Typography>
                <View style={{ gap: 8 }}>
                  <EnhancedButton title="Small" onPress={() => {}} size="small" />
                  <EnhancedButton title="Medium" onPress={() => {}} size="medium" />
                  <EnhancedButton title="Large" onPress={() => {}} size="large" />
                </View>
              </View>
            </View>
          </Card>
        </Section>

        {/* Loading States Section */}
        <Section title="Loading States">
          <Card style={{ padding: 20, marginBottom: 16 }}>
            <View style={{ gap: 16 }}>
              <EnhancedButton 
                title="Toggle Loading Demo" 
                onPress={toggleLoadingDemo}
                variant="outline"
              />
              
              <LoadingStateManager
                isLoading={showLoadingDemo}
                type="skeleton-text"
                skeletonCount={3}
                style={{ minHeight: 100 }}
              >
                <Typography variant="bodyMd">Content appears here when not loading</Typography>
              </LoadingStateManager>

              <Typography variant="bodyMd" style={{ marginTop: 16 }}>Skeleton Components</Typography>
              <SkeletonText lines={2} />
              <SkeletonLoader width="60%" height={20} />
              <SkeletonCard height={80} />

              <Typography variant="bodyMd" style={{ marginTop: 16 }}>Progressive Loading</Typography>
              <EnhancedButton 
                title="Cycle Progressive Stage" 
                onPress={cycleProgressiveStage}
                variant="ghost"
                size="small"
              />
              <ProgressiveLoader
                isLoading={true}
                currentStage={progressiveStage}
                stages={[
                  { id: 'connecting', label: 'Connecting...' },
                  { id: 'processing', label: 'Processing...' },
                  { id: 'generating', label: 'Generating...' },
                  { id: 'completing', label: 'Completing...' },
                ]}
                compact={true}
              />

              <Typography variant="bodyMd" style={{ marginTop: 16 }}>Pulse Loaders</Typography>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 12 }}>
                <PulseLoader size={12} intensity="subtle" />
                <PulseLoader size={16} intensity="normal" />
                <PulseLoader size={20} intensity="strong" />
              </View>
            </View>
          </Card>
        </Section>

        {/* Transitions Section */}
        <Section title="Transitions & Animations">
          <Card style={{ padding: 20, marginBottom: 16 }}>
            <View style={{ gap: 16 }}>
              <EnhancedButton 
                title="Toggle Transition Demo" 
                onPress={toggleTransitionDemo}
                variant="outline"
              />
              
              <TransitionView
                visible={showTransitionDemo}
                type="fade"
                duration={300}
              >
                <View style={{ 
                  backgroundColor: theme.colors.brand['100'],
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center'
                }}>
                  <Typography variant="bodyMd">Fade Transition</Typography>
                </View>
              </TransitionView>

              <Typography variant="bodyMd" style={{ marginTop: 16 }}>Staggered Animation</Typography>
              <StaggeredView
                visible={showTransitionDemo}
                staggerDelay={100}
                type="slide-up"
              >
                <View style={{ 
                  backgroundColor: theme.colors.success['100'],
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 8
                }}>
                  <Typography variant="bodySm">Item 1</Typography>
                </View>
                <View style={{ 
                  backgroundColor: theme.colors.warning['100'],
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 8
                }}>
                  <Typography variant="bodySm">Item 2</Typography>
                </View>
                <View style={{ 
                  backgroundColor: theme.colors.info['100'],
                  padding: 12,
                  borderRadius: 8
                }}>
                  <Typography variant="bodySm">Item 3</Typography>
                </View>
              </StaggeredView>

              <Typography variant="bodyMd" style={{ marginTop: 16 }}>Micro-interactions</Typography>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <AnimatedTouchable
                  onPress={() => {}}
                  animationType="scale"
                  style={{
                    backgroundColor: theme.colors.brand['500'],
                    padding: 16,
                    borderRadius: 12,
                    flex: 1,
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="bodySm" color="#FFFFFF">Scale</Typography>
                </AnimatedTouchable>
                
                <AnimatedTouchable
                  onPress={() => {}}
                  animationType="bounce"
                  style={{
                    backgroundColor: theme.colors.purple['500'],
                    padding: 16,
                    borderRadius: 12,
                    flex: 1,
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="bodySm" color="#FFFFFF">Bounce</Typography>
                </AnimatedTouchable>
              </View>
            </View>
          </Card>
        </Section>

        {/* Cards Section */}
        <Section title="Cards & Surfaces">
          <View style={{ gap: 16 }}>
            <Card variant="elevated">
              <View style={{ padding: 20 }}>
                <Typography variant="h6" style={{ marginBottom: 8 }}>Elevated Card</Typography>
                <Typography variant="bodyMd" color={theme.colors.textSecondary}>
                  This card has elevation and shadow effects
                </Typography>
              </View>
            </Card>

            <Card variant="outlined">
              <View style={{ padding: 20 }}>
                <Typography variant="h6" style={{ marginBottom: 8 }}>Outlined Card</Typography>
                <Typography variant="bodyMd" color={theme.colors.textSecondary}>
                  This card has a border outline
                </Typography>
              </View>
            </Card>

            <Card variant="glass">
              <View style={{ padding: 20 }}>
                <Typography variant="h6" style={{ marginBottom: 8 }}>Glass Card</Typography>
                <Typography variant="bodyMd" color={theme.colors.textSecondary}>
                  This card has glassmorphism effects
                </Typography>
              </View>
            </Card>
          </View>
        </Section>

        {/* Best Practices Section */}
        <Section title="Best Practices">
          <Card style={{ padding: 20 }}>
            <Typography variant="h6" style={{ marginBottom: 12 }}>Design Principles</Typography>
            <View style={{ gap: 8 }}>
              <Typography variant="bodyMd">• Use consistent spacing (8px grid system)</Typography>
              <Typography variant="bodyMd">• Apply glassmorphism for modern surfaces</Typography>
              <Typography variant="bodyMd">• Implement smooth transitions between states</Typography>
              <Typography variant="bodyMd">• Use skeleton screens for better perceived performance</Typography>
              <Typography variant="bodyMd">• Add micro-interactions for user feedback</Typography>
              <Typography variant="bodyMd">• Maintain consistent brand colors throughout</Typography>
              <Typography variant="bodyMd">• Ensure proper accessibility labels</Typography>
            </View>
          </Card>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
};