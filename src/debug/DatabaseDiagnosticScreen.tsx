import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, PrimaryButton, Surface } from '../ui/atoms';
import { runDatabaseDiagnostics } from './testDatabaseTrigger';

interface TestResult {
  test: string;
  success: boolean;
  error?: string;
  data?: any;
}

export const DatabaseDiagnosticScreen = () => {
  const { theme } = useTheme();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    try {
      setIsRunning(true);
      console.log('Starting database diagnostics...');
      
      const testResults = await runDatabaseDiagnostics();
      setResults(testResults);
      
      const failedCount = testResults.filter(r => !r.success).length;
      
      if (failedCount === 0) {
        Alert.alert('✅ All Tests Passed', 'Database setup appears to be working correctly.');
      } else {
        Alert.alert(
          '⚠️ Issues Found', 
          `${failedCount} test(s) failed. Check the results below for details.`
        );
      }
    } catch (error: any) {
      console.error('Error running diagnostics:', error);
      Alert.alert('Error', `Failed to run diagnostics: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 16,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      color: theme.colors.textSecondary,
    },
    buttonContainer: {
      marginBottom: 24,
    },
    resultsContainer: {
      flex: 1,
    },
    resultItem: {
      marginBottom: 12,
      padding: 16,
      borderRadius: 8,
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    statusIcon: {
      marginRight: 8,
      fontSize: 16,
    },
    resultTitle: {
      flex: 1,
      fontWeight: '600',
    },
    resultError: {
      color: theme.colors.error,
      fontSize: 14,
      marginTop: 4,
    },
    resultData: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginTop: 4,
      fontStyle: 'italic',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2" style={styles.title}>
          Database Diagnostics
        </Typography>
        <Typography variant="body" style={styles.subtitle}>
          Test database setup to diagnose Apple OAuth "Database error saving new user" issue
        </Typography>
      </View>

      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Run Diagnostics"
          onPress={runTests}
          loading={isRunning}
          disabled={isRunning}
        />
      </View>

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <Typography variant="h3" style={[styles.title, { marginBottom: 16 }]}>
            Test Results
          </Typography>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {results.map((result, index) => (
              <Surface
                key={index}
                style={[
                  styles.resultItem,
                  { backgroundColor: result.success ? theme.colors.success + '20' : theme.colors.error + '20' }
                ]}
              >
                <View style={styles.resultHeader}>
                  <Text style={styles.statusIcon}>
                    {result.success ? '✅' : '❌'}
                  </Text>
                  <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
                    {result.test}
                  </Text>
                </View>
                
                {result.error && (
                  <Text style={styles.resultError}>
                    Error: {result.error}
                  </Text>
                )}
                
                {result.data && (
                  <Text style={styles.resultData}>
                    {result.data}
                  </Text>
                )}
              </Surface>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};
