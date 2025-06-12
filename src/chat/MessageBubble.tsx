// src/chat/MessageBubble.tsx
import React, { useEffect, useRef, useState, memo } from 'react';
import { View, StyleSheet, ViewStyle, Animated, Platform, Image, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';
// Conditional imports for gradients
let LinearGradient;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
} catch (error) {
  console.warn('Gradient library not available, using fallback component');
  LinearGradient = ({ children, style, ...props }) => React.createElement(View, { style, ...props }, children);
}
import { useTheme } from '../components/ThemeProvider';
import { Surface, Typography, Avatar, AILoadingAnimation } from '../ui/atoms';
import { Message, TripPlannerResponse } from './types';
import { TripPlannerTool } from './components/TripPlannerTool';
import { FullScreenMapModal } from './components/FullScreenMapModal';
import { usePersona } from '../context/PersonaContext';
import { useProfile } from '../hooks/useProfile';

export interface MessageBubbleProps {
  message: Message;
  style?: ViewStyle;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  style,
}) => {
  const { theme } = useTheme();
  const { currentPersona } = usePersona();
  const { profile } = useProfile();
  const fadeAnim = useRef(new Animated.Value(1)).current; // Start at 1 to avoid flicker
  const slideAnim = useRef(new Animated.Value(0)).current; // Start at 0
  const [fullScreenMapData, setFullScreenMapData] = useState<TripPlannerResponse | null>(null);
  const [showFullScreenMap, setShowFullScreenMap] = useState(false);

  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleFullScreenMap = (data: TripPlannerResponse) => {
    setFullScreenMapData(data);
    setShowFullScreenMap(true);
  };

  const handleCloseFullScreenMap = () => {
    setShowFullScreenMap(false);
    setFullScreenMapData(null);
  };

  // Remove animation on mount to prevent issues
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getBubbleStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      marginBottom: 16,
      width: '100%',
      flexDirection: 'column',
    };

    return baseStyle;
  };

  const getSurfaceStyle = (): ViewStyle => {
    return isUser
      ? {
          backgroundColor: 'transparent',
          borderBottomRightRadius: 4,
        }
      : {
          backgroundColor: theme.colors.surface,
          borderBottomLeftRadius: 4,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
  };

  // Custom render rules to fix the key prop issue
  const renderRules = {
    image: (node: any, _children: any, _parent: any, _styles: any) => {
      const { src, alt } = node.attributes;
      return (
        <Image
          key={node.key}
          source={{ uri: src }}
          style={styles.image}
          accessible={true}
          accessibilityLabel={alt || 'Image'}
          resizeMode="contain"
        />
      );
    },
  };

  const getMarkdownStyles = () => ({
    body: {
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      fontSize: theme.typography.scale.bodyMd.fontSize,
      lineHeight: theme.typography.scale.bodyMd.lineHeight,
      fontFamily: theme.typography.fontFamily.regular,
      margin: 0,
    },
    heading1: {
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      fontSize: theme.typography.scale.h4.fontSize,
      fontWeight: theme.typography.weight.bold,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    heading2: {
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      fontSize: theme.typography.scale.h5.fontSize,
      fontWeight: theme.typography.weight.semibold,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    paragraph: {
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      fontSize: theme.typography.scale.bodyMd.fontSize,
      lineHeight: theme.typography.scale.bodyMd.lineHeight,
      marginBottom: theme.spacing.xs,
      marginTop: 0,
    },
    code_inline: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : theme.colors.gray['200'],
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: theme.typography.scale.bodySm.fontSize,
      fontFamily: 'Courier',
    },
    code_block: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : theme.colors.gray['100'],
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      padding: theme.spacing.sm,
      borderRadius: 8,
      fontSize: theme.typography.scale.bodySm.fontSize,
      fontFamily: 'Courier',
      marginVertical: theme.spacing.xs,
      overflow: 'hidden' as const, // Prevent content overflow
      flexShrink: 1, // Allow shrinking if needed
    },
    fence: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : theme.colors.gray['100'],
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      padding: theme.spacing.sm,
      borderRadius: 8,
      fontSize: theme.typography.scale.bodySm.fontSize,
      fontFamily: 'Courier',
      marginVertical: theme.spacing.xs,
      overflow: 'hidden' as const, // Prevent content overflow
      flexShrink: 1, // Allow shrinking if needed
    },
    list_item: {
      color: isUser ? '#FFFFFF' : theme.colors.textPrimary,
      fontSize: theme.typography.scale.bodyMd.fontSize,
      lineHeight: theme.typography.scale.bodyMd.lineHeight,
    },
    image: {
      width: undefined,
      maxWidth: undefined,
      height: 200,
      borderRadius: 8,
      marginVertical: theme.spacing.xs,
      resizeMode: 'contain' as any,
    },
  });

  // Check if we should show tool response
  const shouldShowToolResponse = () => {
    // Check for any new format toolResponse (any tool type)
    if (message.toolResponse) {
      return true;
    }

    // Check for any database tool_calls (even if content is empty)
    if (message.toolCalls && Object.keys(message.toolCalls).length > 0) {
      return true;
    }

    // Check for legacy tripplanner in text (keep existing tripplanner detection)
    if (!isUser && message.text && (
      message.text.includes('**Trip Plan:**') ||
      message.text.includes('**Day 1 -') ||
      message.text.includes('**Key Destinations:**') ||
      message.text.includes('destinations":[') ||
      message.text.includes('trip_summary') ||
      message.text.includes('"coordinates"') ||
      message.text.includes('"latitude"')
    )) {
      return true;
    }

    return false;
  };





  // Helper function to render different tool types with proper formatting
  const renderToolResponse = (toolType: string, toolData: any) => {
    const getToolIcon = (type: string) => {
      const icons: Record<string, string> = {
        weather: '🌤️',
        wiki: '📚',
        nutrition: '🥗',
        convert: '🔄',
        flights: '✈️',
        summarise: '📄',
        md2slides: '📊',
        moodmusic: '🎵',
        code_search: '💻',
      };
      return icons[type] || '🔧';
    };

    const getToolName = (type: string) => {
      const names: Record<string, string> = {
        weather: 'Weather',
        wiki: 'Wikipedia',
        nutrition: 'Nutrition',
        convert: 'Unit Converter',
        flights: 'Flight Search',
        summarise: 'Content Summary',
        md2slides: 'Slides Generator',
        moodmusic: 'Music Recommendations',
        code_search: 'Code Search',
      };
      return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
    };

    return (
      <View style={styles.toolResponseContainer}>
        <View style={{
          padding: 12,
          backgroundColor: theme.colors.surface,
          borderRadius: 8,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.brand['500']
        }}>
          <Typography variant="caption" color={theme.colors.brand['600']}>
            {getToolIcon(toolType)} {getToolName(toolType)}
          </Typography>
          {renderToolContent(toolType, toolData)}
        </View>
      </View>
    );
  };

  // Helper function to render tool-specific content
  const renderToolContent = (toolType: string, data: any) => {
    switch (toolType) {
      case 'wiki':
        return renderWikiContent(data);
      case 'weather':
        return renderWeatherContent(data);
      case 'convert':
        return renderConvertContent(data);
      case 'nutrition':
        return renderNutritionContent(data);
      case 'summarise':
        return renderSummariseContent(data);
      default:
        return (
          <Typography variant="bodySm" style={{ marginTop: 4, color: theme.colors.textPrimary }}>
            {typeof data === 'string' ? data : JSON.stringify(data, null, 2).substring(0, 300)}
            {typeof data !== 'string' && JSON.stringify(data, null, 2).length > 300 && '...'}
          </Typography>
        );
    }
  };
  // Wikipedia content renderer
  const renderWikiContent = (data: any) => {
    if (!data || !data.results || !Array.isArray(data.results)) {
      return (
        <Typography variant="bodySm" style={{ marginTop: 4, color: theme.colors.textSecondary }}>
          No Wikipedia results found.
        </Typography>
      );
    }

    return (
      <View style={{ marginTop: 8 }}>
        {data.results.slice(0, 2).map((result: any, index: number) => (
          <View key={index} style={{
            marginBottom: index < data.results.length - 1 ? 12 : 0,
            padding: 8,
            backgroundColor: theme.colors.background,
            borderRadius: 6,
          }}>
            <Typography variant="bodyMd" weight="semibold" color={theme.colors.textPrimary} style={{ marginBottom: 4 }}>
              {result.title}
            </Typography>
            <Typography variant="bodySm" color={theme.colors.textSecondary} style={{ lineHeight: 18 }}>
              {result.extract ? result.extract.substring(0, 200) + (result.extract.length > 200 ? '...' : '') : 'No description available.'}
            </Typography>
            {result.url && (
              <Typography variant="caption" color={theme.colors.brand['500']} style={{ marginTop: 4 }}>
                📖 Read more on Wikipedia
              </Typography>
            )}
          </View>
        ))}
        {data.total_results > 2 && (
          <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 8, fontStyle: 'italic' }}>
            +{data.total_results - 2} more results available
          </Typography>
        )}
      </View>
    );
  };

  // Weather content renderer
  const renderWeatherContent = (data: any) => {
    if (!data) {
      return (
        <Typography variant="bodySm" style={{ marginTop: 4, color: theme.colors.textSecondary }}>
          No weather data available.
        </Typography>
      );
    }

    return (
      <View style={{ marginTop: 8 }}>
        {data.location && (
          <Typography variant="bodyMd" weight="semibold" color={theme.colors.textPrimary} style={{ marginBottom: 8 }}>
            📍 {data.location}
          </Typography>
        )}

        {data.current && (
          <View style={{
            padding: 8,
            backgroundColor: theme.colors.background,
            borderRadius: 6,
            marginBottom: 8
          }}>
            <Typography variant="bodyLg" weight="semibold" color={theme.colors.textPrimary}>
              🌡️ {data.current.temperature}°{data.current.unit || 'C'}
            </Typography>
            <Typography variant="bodySm" color={theme.colors.textSecondary}>
              {data.current.condition || data.current.description}
            </Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
              {data.current.humidity && (
                <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginRight: 12 }}>
                  💧 Humidity: {data.current.humidity}%
                </Typography>
              )}
              {data.current.wind_speed && (
                <Typography variant="caption" color={theme.colors.textSecondary}>
                  💨 Wind: {data.current.wind_speed} km/h
                </Typography>
              )}
            </View>
          </View>
        )}

        {data.forecast && Array.isArray(data.forecast) && data.forecast.length > 0 && (
          <View>
            <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 4 }}>
              📅 Forecast:
            </Typography>
            {data.forecast.slice(0, 3).map((day: any, index: number) => (
              <View key={index} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 2
              }}>
                <Typography variant="caption" color={theme.colors.textPrimary}>
                  {day.date || `Day ${index + 1}`}
                </Typography>
                <Typography variant="caption" color={theme.colors.textSecondary}>
                  {day.high}°/{day.low}° {day.condition}
                </Typography>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Convert tool content renderer
  const renderConvertContent = (data: any) => {
    if (!data) {
      return (
        <Typography variant="bodySm" style={{ marginTop: 4, color: theme.colors.textSecondary }}>
          No conversion data available.
        </Typography>
      );
    }

    const getConversionIcon = (type: string) => {
      switch (type?.toLowerCase()) {
        case 'currency':
          return '💱';
        case 'temperature':
          return '🌡️';
        case 'weight':
          return '⚖️';
        case 'length':
        case 'distance':
          return '📏';
        case 'volume':
          return '🥤';
        default:
          return '🔄';
      }
    };

    const formatAmount = (amount: number, unit: string) => {
      // Format currency with proper symbols
      if (data.conversion_type === 'currency') {
        const currencySymbols: Record<string, string> = {
          'USD': '$',
          'EUR': '€',
          'GBP': '£',
          'JPY': '¥',
          'TRY': '₺',
          'CAD': 'C$',
          'AUD': 'A$',
        };
        const symbol = currencySymbols[unit] || unit;
        return `${symbol}${amount.toLocaleString()}`;
      }

      // Format other units
      return `${amount.toLocaleString()} ${unit}`;
    };

    return (
      <View style={{ marginTop: 8 }}>
        <View style={{
          padding: 12,
          backgroundColor: theme.colors.background,
          borderRadius: 8,
          alignItems: 'center'
        }}>
          <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 8 }}>
            {getConversionIcon(data.conversion_type)} {data.conversion_type?.charAt(0).toUpperCase() + data.conversion_type?.slice(1) || 'Unit'} Conversion
          </Typography>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Typography variant="bodyLg" weight="semibold" color={theme.colors.textPrimary}>
              {formatAmount(data.original_amount || 1, data.original_unit)}
            </Typography>
            <Typography variant="bodyMd" color={theme.colors.textSecondary} style={{ marginHorizontal: 12 }}>
              →
            </Typography>
            <Typography variant="bodyLg" weight="semibold" color={theme.colors.brand['600']}>
              {formatAmount(data.converted_amount, data.converted_unit)}
            </Typography>
          </View>

          {data.conversion_rate && (
            <Typography variant="caption" color={theme.colors.textSecondary}>
              Rate: 1 {data.original_unit} = {data.conversion_rate.toLocaleString()} {data.converted_unit}
            </Typography>
          )}

          {data.timestamp && (
            <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 4 }}>
              📅 {data.timestamp}
            </Typography>
          )}
        </View>
      </View>
    );
  };

  // Nutrition tool content renderer
  const renderNutritionContent = (data: any) => {
    if (!data) {
      return (
        <Typography variant="bodySm" style={{ marginTop: 4, color: theme.colors.textSecondary }}>
          No nutrition data available.
        </Typography>
      );
    }

    return (
      <View style={{ marginTop: 8 }}>
        {data.food_name && (
          <Typography variant="bodyMd" weight="semibold" color={theme.colors.textPrimary} style={{ marginBottom: 8 }}>
            🥗 {data.food_name}
          </Typography>
        )}

        <View style={{
          padding: 8,
          backgroundColor: theme.colors.background,
          borderRadius: 6,
          marginBottom: 8
        }}>
          {data.serving_size && (
            <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 4 }}>
              📏 Serving: {data.serving_size}
            </Typography>
          )}

          {data.calories && (
            <Typography variant="bodySm" color={theme.colors.textPrimary} style={{ marginBottom: 8 }}>
              🔥 Calories: {data.calories}
            </Typography>
          )}

          {/* Macronutrients Section */}
          {data.macronutrients && (
            <View style={{ marginBottom: 8 }}>
              <Typography variant="caption" weight="semibold" color={theme.colors.textPrimary} style={{ marginBottom: 4 }}>
                💪 Macronutrients:
              </Typography>
              <View style={{ paddingLeft: 8 }}>
                {data.macronutrients.protein && (
                  <Typography variant="caption" color={theme.colors.textSecondary}>
                    • Protein: {data.macronutrients.protein.amount}{data.macronutrients.protein.unit}
                  </Typography>
                )}
                {data.macronutrients.carbohydrates && (
                  <Typography variant="caption" color={theme.colors.textSecondary}>
                    • Carbs: {data.macronutrients.carbohydrates.amount}{data.macronutrients.carbohydrates.unit}
                  </Typography>
                )}
                {data.macronutrients.fat && (
                  <Typography variant="caption" color={theme.colors.textSecondary}>
                    • Fat: {data.macronutrients.fat.amount}{data.macronutrients.fat.unit}
                  </Typography>
                )}
                {data.macronutrients.fiber && data.macronutrients.fiber.amount > 0 && (
                  <Typography variant="caption" color={theme.colors.textSecondary}>
                    • Fiber: {data.macronutrients.fiber.amount}{data.macronutrients.fiber.unit}
                  </Typography>
                )}
              </View>
            </View>
          )}

          {/* Vitamins Section - Show top 3 */}
          {data.vitamins && data.vitamins.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Typography variant="caption" weight="semibold" color={theme.colors.textPrimary} style={{ marginBottom: 4 }}>
                🍊 Key Vitamins:
              </Typography>
              <View style={{ paddingLeft: 8 }}>
                {data.vitamins.slice(0, 3).map((vitamin: any, index: number) => (
                  <Typography key={index} variant="caption" color={theme.colors.textSecondary}>
                    • {vitamin.name}: {vitamin.amount}{vitamin.unit}
                  </Typography>
                ))}
              </View>
            </View>
          )}

          {/* Minerals Section - Show top 4 */}
          {data.minerals && data.minerals.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Typography variant="caption" weight="semibold" color={theme.colors.textPrimary} style={{ marginBottom: 4 }}>
                🧂 Key Minerals:
              </Typography>
              <View style={{ paddingLeft: 8 }}>
                {data.minerals.slice(0, 4).map((mineral: any, index: number) => (
                  <Typography key={index} variant="caption" color={theme.colors.textSecondary}>
                    • {mineral.name}: {mineral.amount}{mineral.unit}
                  </Typography>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Source */}
        {data.source && (
          <Typography variant="caption" color={theme.colors.textSecondary} style={{ fontStyle: 'italic', textAlign: 'center' }}>
            Source: {data.source}
          </Typography>
        )}
      </View>
    );
  };

  // Summarise tool content renderer
  const renderSummariseContent = (data: any) => {
    if (!data) {
      return (
        <Typography variant="bodySm" style={{ marginTop: 4, color: theme.colors.textSecondary }}>
          No summary available.
        </Typography>
      );
    }

    return (
      <View style={{ marginTop: 8 }}>
        {data.title && (
          <Typography variant="bodyMd" weight="semibold" color={theme.colors.textPrimary} style={{ marginBottom: 8 }}>
            📄 {data.title}
          </Typography>
        )}

        <View style={{
          padding: 8,
          backgroundColor: theme.colors.background,
          borderRadius: 6,
          marginBottom: 8
        }}>
          {data.summary && (
            <Typography variant="bodySm" color={theme.colors.textPrimary} style={{ lineHeight: 18 }}>
              {data.summary}
            </Typography>
          )}
        </View>

        {data.key_points && Array.isArray(data.key_points) && data.key_points.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 4 }}>
              🔑 Key Points:
            </Typography>
            {data.key_points.slice(0, 3).map((point: string, index: number) => (
              <Typography key={index} variant="caption" color={theme.colors.textPrimary} style={{ marginBottom: 2 }}>
                • {point}
              </Typography>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {data.word_count && (
            <Typography variant="caption" color={theme.colors.textSecondary}>
              📊 {data.word_count} words
            </Typography>
          )}
          {data.reading_time && (
            <Typography variant="caption" color={theme.colors.textSecondary}>
              ⏱️ {data.reading_time} min read
            </Typography>
          )}
        </View>

        {data.url && (
          <Typography variant="caption" color={theme.colors.brand['500']} style={{ marginTop: 4 }}>
            🔗 View original source
          </Typography>
        )}
      </View>
    );
  };

  // Get the message text to display
  const getDisplayText = () => {
    // For streaming messages that are still empty, show a space to maintain bubble
    if (isStreaming && (!message.text || message.text === '')) {
      return ' ';
    }

    // Return the actual text
    return message.text || '';
  };


  return (
    <Animated.View
      style={[
        styles.container,
        getBubbleStyle(),
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ] as any}
    >
      <View style={styles.messageColumn}>
        {/* Avatar with name for both user and assistant messages */}
        <View style={[styles.avatarWithName, { alignSelf: isUser ? 'flex-end' : 'flex-start' }]}>
          {isUser ? (
            /* User: Name on left, avatar on right */
            <View style={styles.userAvatarRow}>
              <Typography
                variant="caption"
                weight="semibold"
                color={theme.colors.textSecondary}
                style={styles.userName}
              >
                {profile?.display_name || 'You'}
              </Typography>
              <Avatar
                size={32}
                showBorder={true}
                accessibilityLabel="Your profile picture"
              />
            </View>
          ) : (
            /* Assistant: Avatar on left, name on right */
            <View style={styles.assistantAvatarRow}>
              <View style={styles.assistantAvatarContainer}>
                {currentPersona?.icon ? (
                  <View style={[styles.personaAvatar, { backgroundColor: theme.colors.surface }]}>
                    <Typography
                      variant="bodyLg"
                      style={styles.personaIcon}
                    >
                      {currentPersona.icon}
                    </Typography>
                  </View>
                ) : (
                  <LinearGradient
                    colors={[
                      theme.colors.accent['400'],
                      theme.colors.accent['600'],
                    ]}
                    style={[styles.avatar, { width: 32, height: 32, borderRadius: 16 }]}
                  >
                    <Typography
                      variant="bodySm"
                      weight="bold"
                      color="#FFFFFF"
                      align="center"
                    >
                      AI
                    </Typography>
                  </LinearGradient>
                )}
              </View>
              <Typography
                variant="caption"
                weight="semibold"
                color={theme.colors.textSecondary}
                style={styles.assistantName}
              >
                {currentPersona?.display_name || 'Assistant'}
              </Typography>
            </View>
          )}
        </View>

        {isUser ? (
          <View style={styles.userMessageContainer}>
            <LinearGradient
              colors={[
                theme.colors.brand['400'],
                theme.colors.brand['600'],
              ]}
              style={[
                styles.bubble,
                styles.userBubble,
                isStreaming && styles.streamingBubble,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
            <View style={styles.markdownContainer}>
              <Markdown style={getMarkdownStyles()} rules={renderRules}>
                {getDisplayText()}
              </Markdown>
            </View>

            {!isStreaming && (
              <Typography
                variant="caption"
                color="rgba(255,255,255,0.8)"
                align="right"
                style={styles.timestamp}
              >
                {timestamp}
              </Typography>
            )}
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.aiMessageContainer}>
            <Surface
              elevation={1}
              style={[
                styles.bubble,
                styles.aiBubble,
                getSurfaceStyle(),
                isStreaming && styles.streamingBubble,
              ] as any}
            >
                           {isStreaming && (!message.text || message.text === '') && (
                <View style={styles.aiLoadingContainer}>
                  <AILoadingAnimation size={24} />
                </View>
              )}
    {!shouldShowToolResponse() && (
                <View style={styles.markdownContainer}>
                  <Markdown style={getMarkdownStyles()} rules={renderRules}>
                   {getDisplayText()}
                  </Markdown>
                </View>
              )}

              {/* Tool Response Content */}
         {shouldShowToolResponse() && (() => {
                // Check for new format toolResponse (for real-time streaming messages)
                if (message.toolResponse?.type === 'tripplanner') {
                  return (
                <View style={styles.toolResponseContainer}>
                  <TripPlannerTool
                                          data={message.toolResponse.data as TripPlannerResponse}
                                                   compact={true}
                    onFullScreenMap={handleFullScreenMap}
                  />
                </View>
                   );
              }

                // Handle other tool types from toolResponse
                if (message.toolResponse && message.toolResponse.type !== 'tripplanner') {
                  return renderToolResponse(message.toolResponse.type, message.toolResponse.data);
                }

 if (message.toolCalls && message.toolCalls.tripplanner) {
                  const toolCall = message.toolCalls.tripplanner;
                  if (toolCall.success && toolCall.data) {
                    return (
                      <View style={styles.toolResponseContainer}>
                        <TripPlannerTool
                          data={toolCall.data as TripPlannerResponse}
                          compact={true}
                          onFullScreenMap={handleFullScreenMap}
                        />
                      </View>
                    );
                  }
                }

                // Handle other tool types from toolCalls
                if (message.toolCalls) {
                  const toolCallEntries = Object.entries(message.toolCalls);
                  const nonTripplannerTools = toolCallEntries.filter(([key]) => key !== 'tripplanner');

                  if (nonTripplannerTools.length > 0) {
                    return (
                      <View style={styles.toolResponseContainer}>
                        {nonTripplannerTools.map(([toolName, toolCall]: [string, any]) => {
                          if (toolCall.success && toolCall.data) {
                            return (
                              <View key={toolName} style={{ marginBottom: nonTripplannerTools.length > 1 ? 8 : 0 }}>
                                {renderToolResponse(toolName, toolCall.data)}
                              </View>
                            );
                          } else {
                            // Error case
                            return (
                              <View key={toolName} style={{
                                padding: 12,
                                backgroundColor: theme.colors.surface,
                                borderRadius: 8,
                                borderLeftWidth: 4,
                                borderLeftColor: theme.colors.danger['500'],
                                marginBottom: nonTripplannerTools.length > 1 ? 8 : 0
                              }}>
                                <Typography variant="caption" color={theme.colors.danger['600']}>
                                  🔧 {toolName.charAt(0).toUpperCase() + toolName.slice(1)} Tool (Error)
                                </Typography>
                                <Typography variant="bodySm" style={{ marginTop: 4, color: theme.colors.textPrimary }}>
                                  {toolCall.error || 'Tool execution failed'}
                                </Typography>
                              </View>
                            );
                          }
                        })}
                      </View>
                    );
                  }
                }

                // Check for legacy tripplanner responses in message text
                if (!isUser && message.text) {
                  // Try to extract structured data from text
                  try {
                    // Method 1: Try parsing the entire message as JSON
                    try {
                      const parsed = JSON.parse(message.text);
                      if (parsed.destinations && Array.isArray(parsed.destinations)) {
                        return (
                          <View style={styles.toolResponseContainer}>
                            <TripPlannerTool
                              data={parsed as TripPlannerResponse}
                              compact={true}
                              onFullScreenMap={handleFullScreenMap}
                            />
                          </View>
                        );
                      }
                    } catch (e) {
                      // Not pure JSON, try other methods
                    }

                    // Method 2: Look for JSON embedded in formatted text
                    const jsonMatch = message.text.match(/\{[\s\S]*"destinations"[\s\S]*\}/);
                    if (jsonMatch) {
                      const tripData = JSON.parse(jsonMatch[0]);
                      if (tripData.destinations && Array.isArray(tripData.destinations)) {
                        return (
                          <View style={styles.toolResponseContainer}>
                            <TripPlannerTool
                              data={tripData as TripPlannerResponse}
                              compact={true}
                              onFullScreenMap={handleFullScreenMap}
                            />
                          </View>
                        );
                      }
                    }
                  } catch (error) {
                    console.log('🗺️ Could not parse legacy tripplanner JSON:', error);
                  }

                  // If JSON parsing failed, show legacy indicator with the text content
                  return (
                    <>
                      <View style={styles.markdownContainer}>
                        <Markdown style={getMarkdownStyles()} rules={renderRules}>
                          {getDisplayText()}
                        </Markdown>
                      </View>
                      <View style={styles.toolResponseContainer}>
                        <View style={{ padding: 12, backgroundColor: theme.colors.surface, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: theme.colors.brand['500'] }}>
                          <Typography variant="caption" color={theme.colors.brand['600']}>
                            🗺️ Trip Plan (Legacy Format)
                          </Typography>
                          <Typography variant="bodySm" style={{ marginTop: 4, color: theme.colors.textSecondary }}>
                            This trip plan was created before the new map interface.
                          </Typography>
                        </View>
                      </View>
                    </>
                  );
                }

                // Handle other tool types
                if (message.toolResponse) {
                  return (
                    <View style={styles.toolResponseContainer}>
                      <View style={{ padding: 12, backgroundColor: theme.colors.surface, borderRadius: 8 }}>
                        <Typography variant="caption" color={theme.colors.textSecondary}>
                          Tool: {message.toolResponse.type}
                        </Typography>
                        <Typography variant="bodySm" style={{ marginTop: 4 }}>
                          {JSON.stringify(message.toolResponse.data, null, 2).substring(0, 200)}...
                        </Typography>
                      </View>
                    </View>
                  );
                }

                return null;
              })()}

              {!isStreaming && (
                <Typography
                  variant="caption"
                  color={theme.colors.textSecondary}
                  align="left"
                  style={styles.timestamp}
                >
                  {timestamp}
                </Typography>
              )}
            </Surface>
          </View>
        )}
      </View>

      {/* Full Screen Map Modal */}
      <FullScreenMapModal
        visible={showFullScreenMap}
        data={fullScreenMapData}
        onClose={handleCloseFullScreenMap}
      />
    </Animated.View>
  );
};

// Use memo with proper comparison
export const MessageBubble = memo(MessageBubbleComponent, (prevProps, nextProps) => {
  // Only re-render if the message data actually changed
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.message.role === nextProps.message.role
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: '100%',
    flexShrink: 0, // Prevent shrinking
    overflow: 'visible', // Allow content to be visible
    // Ensure minimum height
    minHeight: 60,
  },
  messageColumn: {
    flexDirection: 'column',
    width: '100%',
    flex: 1,
  },
  avatarWithName: {
    marginBottom: 8,
  },
  userAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assistantAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assistantAvatarContainer: {
    // Container for the persona avatar
  },
  personaAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  personaIcon: {
    fontSize: 18,
  },
  userName: {
    // User name styling
  },
  assistantName: {
    // Assistant name styling
  },
  avatarContainer: {
    marginBottom: 4,
  },
  userMessageContainer: {
    width: '100%',
    alignItems: 'flex-end', // Align user messages to the right
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    width: '100%',
    alignItems: 'flex-start', // Align AI messages to the left
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 50,
    width: '100%',
    flex: 1,
    flexShrink: 1,
    // Ensure minimum height
    minHeight: 40,
    // Better text wrapping
    overflow: 'hidden',
  },
  userBubble: {
    borderTopRightRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  aiBubble: {
    borderTopLeftRadius: 4,
  },
  streamingBubble: {
    minHeight: 40,
  },
  aiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
  markdownContainer: {
    flex: 1,
    maxWidth: '100%',
    minWidth: 0,

  },
  timestamp: {
    marginTop: 6,
    fontSize: 11,
  },
  toolResponseContainer: {
    maxWidth: '100%',
    marginTop: 0,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 8,
  },
});