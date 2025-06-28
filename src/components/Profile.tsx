
import { User, Settings, LogIn, Heart, BarChart3 } from 'lucide-react';

const Profile = () => {
  const isLoggedIn = false; // This would be managed by auth state

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center max-w-sm">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-white" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Join the Community</h3>
          <p className="text-white/70 text-sm mb-6">
            Create an account to make polls, follow others, and unlock premium features
          </p>
          
          <button className="w-full bg-white text-purple-600 font-medium py-3 rounded-xl mb-3 hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
            <LogIn size={18} />
            Sign In / Sign Up
          </button>
          
          <p className="text-white/50 text-xs">
            Continue as guest to use basic features
          </p>
        </div>
      </div>
    );
  }

  // Logged in view (for future implementation)
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={40} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Welcome back!</h2>
          <p className="text-white/70">@username</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 size={20} className="text-white" />
              <span className="text-white font-medium">Your Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">15</div>
                <div className="text-white/60 text-sm">Polls Created</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">342</div>
                <div className="text-white/60 text-sm">Total Votes</div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <Heart size={20} className="text-white" />
              <span className="text-white font-medium">Following</span>
            </div>
            <p className="text-white/70 text-sm">42 people</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
