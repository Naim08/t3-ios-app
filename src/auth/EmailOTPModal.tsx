import React, { useState } from 'react';
// Using new refactored components for testing
import { NewSignInModal } from './NewSignInModal';
import { NewSignUpModal } from './NewSignUpModal';
import { NewMagicLinkModal } from './NewMagicLinkModal';

interface EmailOTPModalProps {
  visible: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup' | 'magic';

export const EmailOTPModal: React.FC<EmailOTPModalProps> = ({ visible, onClose }) => {
  const [currentMode, setCurrentMode] = useState<AuthMode>('signin');

  const handleSuccess = () => {
    console.log('[EmailOTPModal] Authentication successful');
    onClose();
  };

  const handleSwitchMode = (mode: AuthMode) => {
    setCurrentMode(mode);
  };

  const handleClose = () => {
    // Reset to signin mode when closing
    setCurrentMode('signin');
    onClose();
  };

  // Only render the active modal to avoid animation conflicts
  if (!visible) return null;

  switch (currentMode) {
    case 'signin':
      return (
        <NewSignInModal
          visible={visible}
          onClose={handleClose}
          onSuccess={handleSuccess}
          onSwitchMode={handleSwitchMode}
        />
      );
    case 'signup':
      return (
        <NewSignUpModal
          visible={visible}
          onClose={handleClose}
          onSuccess={handleSuccess}
          onSwitchMode={handleSwitchMode}
        />
      );
    case 'magic':
      return (
        <NewMagicLinkModal
          visible={visible}
          onClose={handleClose}
          onSuccess={handleSuccess}
          onSwitchMode={handleSwitchMode}
        />
      );
    default:
      return null;
  }
};