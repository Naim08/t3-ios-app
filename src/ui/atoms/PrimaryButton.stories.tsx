import type { Meta, StoryObj } from '@storybook/react-native';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { View } from 'react-native';
import { PrimaryButton } from './PrimaryButton';

const meta = {
  title: 'Atoms/PrimaryButton',
  component: PrimaryButton,
  parameters: {
    layout: 'centered',
  },
  args: {
    title: 'Button',
    onPress: action('pressed'),
  },
  argTypes: {
    title: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    onPress: { action: 'pressed' },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, minWidth: 200 }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof PrimaryButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Primary Button',
  },
};

export const Loading: Story = {
  args: {
    title: 'Loading Button',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    title: 'Disabled Button',
    disabled: true,
  },
};

export const LongText: Story = {
  args: {
    title: 'Button with Very Long Text Content',
  },
};

export const AllStates: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <PrimaryButton
        title="Default State"
        onPress={action('default-pressed')}
      />
      <PrimaryButton
        title="Loading State"
        loading
        onPress={action('loading-pressed')}
      />
      <PrimaryButton
        title="Disabled State"
        disabled
        onPress={action('disabled-pressed')}
      />
    </View>
  ),
};
