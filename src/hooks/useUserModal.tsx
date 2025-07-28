import { useState, useCallback, useEffect } from 'react';

interface UserModalState {
  isOpen: boolean;
  username: string | null;
}

let modalState: UserModalState = {
  isOpen: false,
  username: null,
};

let listeners: Array<(state: UserModalState) => void> = [];

const notify = () => {
  listeners.forEach(listener => listener(modalState));
};

export const useUserModal = () => {
  const [state, setState] = useState(modalState);

  const openModal = useCallback((username: string) => {
    modalState = { isOpen: true, username };
    notify();
  }, []);

  const closeModal = useCallback(() => {
    modalState = { isOpen: false, username: null };
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
    username: state.username,
    openModal,
    closeModal,
  };
};