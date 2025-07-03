import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const LoginRequired = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-orange-500/30 text-center max-w-sm">
        <h3 className="text-xl font-bold text-orange-200 mb-4">Login Required</h3>
        <p className="text-orange-300/70 mb-6">
          You must be logged in to create a poll
        </p>
        <Button 
          onClick={() => navigate('/auth')}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-medium"
        >
          Log In
        </Button>
      </div>
    </div>
  );
};

export default LoginRequired;