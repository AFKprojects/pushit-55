import { useState, useCallback, useEffect } from 'react';

interface PollModalState {
  isOpen: boolean;
  pollId: string | null;
}

let modalState: PollModalState = {
  isOpen: false,
  pollId: null,
};

let listeners: Array<(state: PollModalState) => void> = [];

const notify = () => {
  listeners.forEach(listener => listener(modalState));
};

export const usePollModal = () => {
  const [state, setState] = useState(modalState);

  const openModal = useCallback((pollId: string) => {
    modalState = { isOpen: true, pollId };
    notify();
  }, []);

  const closeModal = useCallback(() => {
    modalState = { isOpen: false, pollId: null };
    notify();
  }, []);

  useEffect(() => {
    listeners.push(setState);
    setState(modalState); // Get current state
    
    return () => {
      listeners = listeners.filter(l => l !== setState);
    };
  }, []);

  return {
    isOpen: state.isOpen,
    pollId: state.pollId,
    openModal,
    closeModal,
  };
};