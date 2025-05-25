import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { View } from 'react-native';
import { Surface } from './Surface';
import { Typography } from './Typography';

const meta = {
  title: 'Atoms/Surface',
  component: Surface,
  parameters: {
    layout: 'centered',
  },
  args: {
    children: null,
  },
  argTypes: {
    elevation: {
      control: 'select',
      options: [0, 1, 2, 3, 4],
    },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, minWidth: 200, minHeight: 100 }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Surface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <Typography variant="bodyMd">
        Default surface with no elevation
      </Typography>
    ),
    style: { padding: 16 },
  },
};

export const Elevation1: Story = {
  args: {
    elevation: 1,
    children: (
      <Typography variant="bodyMd">
        Surface with elevation level 1
      </Typography>
    ),
    style: { padding: 16 },
  },
};

export const Elevation2: Story = {
  args: {
    elevation: 2,
    children: (
      <Typography variant="bodyMd">
        Surface with elevation level 2
      </Typography>
    ),
    style: { padding: 16 },
  },
};

export const Elevation3: Story = {
  args: {
    elevation: 3,
    children: (
      <Typography variant="bodyMd">
        Surface with elevation level 3
      </Typography>
    ),
    style: { padding: 16 },
  },
};

export const Card: Story = {
  args: {
    elevation: 1,
    children: (
      <View>
        <Typography variant="h4" weight="semibold" style={{ marginBottom: 8 }}>
          Card Title
        </Typography>
        <Typography variant="bodyMd" style={{ marginBottom: 16 }}>
          This is a card component built using the Surface atom with elevation.
        </Typography>
        <Typography variant="bodySm" style={{ opacity: 0.7 }}>
          Card subtitle or metadata
        </Typography>
      </View>
    ),
    style: { padding: 16, borderRadius: 12 },
  },
};

export const AllElevations: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <Surface style={{ padding: 16, borderRadius: 8 }}>
        <Typography variant="bodyMd">Elevation 0 (Default)</Typography>
      </Surface>
      <Surface elevation={1} style={{ padding: 16, borderRadius: 8 }}>
        <Typography variant="bodyMd">Elevation 1</Typography>
      </Surface>
      <Surface elevation={2} style={{ padding: 16, borderRadius: 8 }}>
        <Typography variant="bodyMd">Elevation 2</Typography>
      </Surface>
      <Surface elevation={3} style={{ padding: 16, borderRadius: 8 }}>
        <Typography variant="bodyMd">Elevation 3</Typography>
      </Surface>
      <Surface elevation={4} style={{ padding: 16, borderRadius: 8 }}>
        <Typography variant="bodyMd">Elevation 4</Typography>
      </Surface>
    </View>
  ),
};
