
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LoginRequired from './create/LoginRequired';
import CreatePollForm from './create/CreatePollForm';

const Create = () => {
  const { user } = useAuth();

  // Listen for navigation event
  useEffect(() => {
    const handleNavigate = () => {
      // This will be handled by the parent component
    };
    
    window.addEventListener('navigate-to-polls', handleNavigate);
    return () => window.removeEventListener('navigate-to-polls', handleNavigate);
  }, []);

  if (!user) {
    return <LoginRequired />;
  }

  return <CreatePollForm />;
};

export default Create;
