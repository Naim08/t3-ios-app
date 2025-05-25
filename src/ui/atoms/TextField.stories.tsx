import type { Meta, StoryObj } from '@storybook/react-native';
import { action } from '@storybook/addon-actions';
import React, { useState } from 'react';
import { View } from 'react-native';
import { TextField } from './TextField';

const meta = {
  title: 'Atoms/TextField',
  component: TextField,
  parameters: {
    layout: 'centered',
  },
  args: {
    onChangeText: action('text-changed'),
    onBlur: action('blurred'),
    onFocus: action('focused'),
  },
  argTypes: {
    label: {
      control: 'text',
    },
    placeholder: {
      control: 'text',
    },
    error: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    secureTextEntry: {
      control: 'boolean',
    },
    multiline: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, minWidth: 300 }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    secureTextEntry: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Field',
    placeholder: 'This field is disabled',
    disabled: true,
    value: 'Some value',
  },
};

export const Multiline: Story = {
  args: {
    label: 'Message',
    placeholder: 'Enter your message',
    multiline: true,
  },
};

export const Interactive: Story = {
  render: () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [emailError, setEmailError] = useState('');
    const [touched, setTouched] = useState(false);

    const handleEmailChange = (text: string) => {
      setEmail(text);
      if (touched && !text.includes('@')) {
        setEmailError('Please enter a valid email');
      } else {
        setEmailError('');
      }
    };

    const handleEmailBlur = () => {
      setTouched(true);
      if (!email.includes('@')) {
        setEmailError('Please enter a valid email');
      }
    };

    return (
      <View style={{ gap: 16 }}>
        <TextField
          label="Email"
          value={email}
          onChangeText={handleEmailChange}
          onBlur={handleEmailBlur}
          error={emailError}
          placeholder="Enter your email"
          keyboardType="email-address"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
        />
        <TextField
          label="Message"
          value={message}
          onChangeText={setMessage}
          placeholder="Enter your message"
          multiline
        />
      </View>
    );
  },
};
