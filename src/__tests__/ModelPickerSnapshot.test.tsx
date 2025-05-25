import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { Typography } from '../ui/atoms';
import { ThemeProvider } from '../components/ThemeProvider';

// Import jest globals
import { describe, test, expect } from '@jest/globals';

describe('ModelPicker', () => {
  test('ModelPickerSnapshot', () => {
    const { toJSON } = render(
      <ThemeProvider>
        <View>
          <Typography variant="h3">Model Picker Test</Typography>
        </View>
      </ThemeProvider>
    );
    
    expect(toJSON()).toMatchSnapshot();
  });
});
