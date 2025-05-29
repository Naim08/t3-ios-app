import React, { useState } from 'react';
import { SignInModal } from './SignInModal';
import { SignUpModal } from './SignUpModal';
import { MagicLinkModal } from './MagicLinkModal';

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

  return (
    <>
      <SignInModal
        visible={visible && currentMode === 'signin'}
        onClose={handleClose}
        onSuccess={handleSuccess}
        onSwitchMode={handleSwitchMode}
      />
      
      <SignUpModal
        visible={visible && currentMode === 'signup'}
        onClose={handleClose}
        onSuccess={handleSuccess}
        onSwitchMode={handleSwitchMode}
      />
      
      <MagicLinkModal
        visible={visible && currentMode === 'magic'}
        onClose={handleClose}
        onSuccess={handleSuccess}
        onSwitchMode={handleSwitchMode}
      />
    </>
  );
};