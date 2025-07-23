import * as Audio from 'expo-audio';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export interface AudioRecordingOptions {
  maxDuration?: number; // in seconds
  sampleRate?: number;
  numberOfChannels?: 1 | 2;
  bitRate?: number;
}

// Since expo-audio is hook-based, we need to use a different approach
// This service will work with an AudioRecorder instance passed from a hook
export class AudioRecordingService {
  private audioRecorder: any = null; // AudioRecorder from useAudioRecorder hook
  private recordingStartTime: number | null = null;
  private hasPermission: boolean = false;

  // Set the AudioRecorder instance from the hook
  setAudioRecorder(audioRecorder: any) {
    this.audioRecorder = audioRecorder;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestRecordingPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  async startRecording(options: AudioRecordingOptions = {}): Promise<boolean> {
    try {
      if (!this.audioRecorder) {
        throw new Error('AudioRecorder not set. Call setAudioRecorder first.');
      }

      // Check permissions first
      if (!this.hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Audio recording permission denied');
        }
      }

      // Stop any existing recording
      await this.stopRecording();

      // Configure audio mode for recording - minimal configuration to avoid iOS conflicts
      const audioMode: any = {
        allowsRecording: true,
        playsInSilentMode: true,
      };
      
      if (Platform.OS === 'android') {
        audioMode.shouldDuckAndroid = true;
        audioMode.playThroughEarpieceAndroid = false;
      }
      
      await Audio.setAudioModeAsync(audioMode);

      // Prepare recording with the AudioRecorder from hook
      await this.audioRecorder.prepareToRecordAsync();
      this.audioRecorder.record();
      this.recordingStartTime = Date.now();

      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  async stopRecording(): Promise<{ uri: string; duration: number } | null> {
    try {
      if (!this.audioRecorder) {
        return null;
      }

      // Calculate duration
      const duration = this.recordingStartTime 
        ? (Date.now() - this.recordingStartTime) / 1000 
        : 0;

      // Stop recording
      await this.audioRecorder.stop();
      const uri = this.audioRecorder.uri;

      // Reset audio mode
      const resetMode: any = {
        allowsRecording: false,
        playsInSilentMode: true,
      };
      
      if (Platform.OS === 'android') {
        resetMode.shouldDuckAndroid = true;
        resetMode.playThroughEarpieceAndroid = false;
      }
      
      await Audio.setAudioModeAsync(resetMode);

      // Clear recording reference
      this.recordingStartTime = null;

      if (!uri) {
        throw new Error('No recording URI available');
      }

      return { uri, duration };
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.recordingStartTime = null;
      return null;
    }
  }

  async pauseRecording(): Promise<boolean> {
    try {
      if (!this.audioRecorder) {
        return false;
      }
      this.audioRecorder.pause();
      return true;
    } catch (error) {
      console.error('Error pausing recording:', error);
      return false;
    }
  }

  async resumeRecording(): Promise<boolean> {
    try {
      if (!this.audioRecorder) {
        return false;
      }
      this.audioRecorder.record();
      return true;
    } catch (error) {
      console.error('Error resuming recording:', error);
      return false;
    }
  }

  isRecording(): boolean {
    return this.audioRecorder !== null && this.audioRecorder.isRecording;
  }

  // Utility to convert audio file to base64 for API upload
  async audioToBase64(uri: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        // For web, fetch the blob and convert
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remove data:audio/webm;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // For native platforms, use expo-file-system
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }
    } catch (error) {
      console.error('Error converting audio to base64:', error);
      throw error;
    }
  }
}

// Singleton instance
export const audioRecordingService = new AudioRecordingService();