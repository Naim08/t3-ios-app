import { useState, useCallback, useRef, useEffect } from 'react';
import * as Audio from 'expo-audio';
import { audioRecordingService, AudioRecordingOptions } from '../services/audio/AudioRecordingService';

export interface UseAudioRecordingOptions extends AudioRecordingOptions {
  onRecordingComplete?: (uri: string, duration: number) => void;
  onError?: (error: Error) => void;
}

export interface UseAudioRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

export const useAudioRecording = (options: UseAudioRecordingOptions = {}): UseAudioRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number | null>(null);

  // Use the expo-audio hook
  const audioRecorder = Audio.useAudioRecorder(Audio.RecordingPresets.HIGH_QUALITY);

  // Set audioRecorder in service on mount, but don't check permissions until needed
  useEffect(() => {
    audioRecordingService.setAudioRecorder(audioRecorder);
  }, [audioRecorder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const checkPermission = async () => {
    try {
      const { status } = await Audio.getRecordingPermissionsAsync();
      setHasPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error checking audio permissions:', error);
      return false;
    }
  };

  const requestPermission = useCallback(async () => {
    try {
      const granted = await audioRecordingService.requestPermissions();
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      options.onError?.(new Error('Failed to request permissions'));
      return false;
    }
  }, [options]);

  const startRecording = useCallback(async () => {
    try {
      // Request permission if not granted
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Audio recording permission denied');
        }
      }

      const success = await audioRecordingService.startRecording(options);
      if (success) {
        setIsRecording(true);
        setIsPaused(false);
        setDuration(0);
        startTime.current = Date.now();
        
        // Start duration timer
        durationInterval.current = setInterval(() => {
          if (startTime.current) {
            setDuration(Math.floor((Date.now() - startTime.current) / 1000));
          }
        }, 100);
      } else {
        throw new Error('Failed to start recording');
      }
    } catch (error) {
      console.error('Error in startRecording:', error);
      options.onError?.(error as Error);
      setIsRecording(false);
    }
  }, [hasPermission, options, requestPermission]);

  const stopRecording = useCallback(async () => {
    try {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      const result = await audioRecordingService.stopRecording();
      if (result) {
        options.onRecordingComplete?.(result.uri, result.duration);
      }
      
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      startTime.current = null;
    } catch (error) {
      console.error('Error in stopRecording:', error);
      options.onError?.(error as Error);
    }
  }, [options]);

  const pauseRecording = useCallback(async () => {
    try {
      const success = await audioRecordingService.pauseRecording();
      if (success) {
        setIsPaused(true);
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }
      }
    } catch (error) {
      console.error('Error in pauseRecording:', error);
      options.onError?.(error as Error);
    }
  }, [options]);

  const resumeRecording = useCallback(async () => {
    try {
      const success = await audioRecordingService.resumeRecording();
      if (success) {
        setIsPaused(false);
        // Resume duration timer
        durationInterval.current = setInterval(() => {
          if (startTime.current) {
            setDuration(Math.floor((Date.now() - startTime.current) / 1000));
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error in resumeRecording:', error);
      options.onError?.(error as Error);
    }
  }, [options]);

  const cancelRecording = useCallback(async () => {
    try {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Stop without calling the completion callback
      await audioRecordingService.stopRecording();
      
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      startTime.current = null;
    } catch (error) {
      console.error('Error in cancelRecording:', error);
      options.onError?.(error as Error);
    }
  }, [options]);

  return {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    hasPermission,
    requestPermission,
  };
};