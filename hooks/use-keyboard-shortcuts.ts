'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutMap {
  /** Ctrl+N / Cmd+N — new chat */
  newChat?: () => void;
  /** Ctrl+U / Cmd+U — go to upload */
  upload?: () => void;
  /** Ctrl+L / Cmd+L — go to library */
  library?: () => void;
  /** Escape — close modals */
  close?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcutMap) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === 'n' && shortcuts.newChat) {
        e.preventDefault();
        shortcuts.newChat();
      }
      if (isMod && e.key === 'u' && shortcuts.upload) {
        e.preventDefault();
        shortcuts.upload();
      }
      if (isMod && e.key === 'l' && shortcuts.library) {
        e.preventDefault();
        shortcuts.library();
      }
      if (e.key === 'Escape' && shortcuts.close) {
        shortcuts.close();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
