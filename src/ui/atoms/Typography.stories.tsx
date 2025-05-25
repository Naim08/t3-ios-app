import type { Meta, StoryObj } from '@storybook/react-native';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { View } from 'react-native';
import { Typography } from './Typography';

const meta = {
  title: 'Atoms/Typography',
  component: Typography,
  parameters: {
    layout: 'centered',
  },
  args: {
    children: 'Sample text',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'bodyLg', 'bodyMd', 'bodySm', 'caption'],
    },
    weight: {
      control: 'select',
      options: ['regular', 'medium', 'semibold', 'bold'],
    },
    align: {
      control: 'select',
      options: ['left', 'center', 'right', 'justify'],
    },
    children: {
      control: 'text',
    },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Typography>;

export default meta;

type Story = StoryObj<typeof meta>;

export const H1: Story = {
  args: {
    variant: 'h1',
    weight: 'bold',
    children: 'Heading 1',
  },
};

export const H2: Story = {
  args: {
    variant: 'h2',
    weight: 'semibold',
    children: 'Heading 2',
  },
};

export const H3: Story = {
  args: {
    variant: 'h3',
    weight: 'medium',
    children: 'Heading 3',
  },
};

export const BodyLarge: Story = {
  args: {
    variant: 'bodyLg',
    children: 'This is large body text for important content.',
  },
};

export const BodyMedium: Story = {
  args: {
    variant: 'bodyMd',
    children: 'This is medium body text for regular content.',
  },
};

export const BodySmall: Story = {
  args: {
    variant: 'bodySm',
    children: 'This is small body text for secondary content.',
  },
};

export const Caption: Story = {
  args: {
    variant: 'caption',
    children: 'This is caption text for labels and metadata.',
  },
};

export const Centered: Story = {
  args: {
    variant: 'bodyMd',
    align: 'center',
    children: 'This text is center aligned.',
  },
};

export const AllVariants: Story = {
  render: () => (
    <View>
      <Typography variant="h1" weight="bold">H1 Bold</Typography>
      <Typography variant="h2" weight="semibold">H2 Semibold</Typography>
      <Typography variant="h3" weight="medium">H3 Medium</Typography>
      <Typography variant="h4" weight="regular">H4 Regular</Typography>
      <Typography variant="bodyLg">Body Large</Typography>
      <Typography variant="bodyMd">Body Medium</Typography>
      <Typography variant="bodySm">Body Small</Typography>
      <Typography variant="caption">Caption</Typography>
    </View>
  ),
};
