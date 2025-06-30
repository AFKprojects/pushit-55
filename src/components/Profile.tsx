
import { User, Settings, LogIn, Heart, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center max-w-sm">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-white" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Dołącz do społeczności</h3>
          <p className="text-white/70 text-sm mb-6">
            Utwórz konto aby tworzyć ankiety, śledzić innych i odblokować funkcje premium
          </p>
          
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-medium py-3 rounded-xl mb-3 flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            Zaloguj się / Zarejestruj
          </Button>
          
          <p className="text-white/50 text-xs">
            Kontynuuj jako gość aby używać podstawowych funkcji
          </p>
        </div>
      </div>
    );
  }

  // Logged in view
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={40} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Witaj ponownie!</h2>
          <p className="text-white/70">{user.email}</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 size={20} className="text-white" />
              <span className="text-white font-medium">Twoje statystyki</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">-</div>
                <div className="text-white/60 text-sm">Utworzone ankiety</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">-</div>
                <div className="text-white/60 text-sm">Oddane głosy</div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <Heart size={20} className="text-white" />
              <span className="text-white font-medium">Obserwowani</span>
            </div>
            <p className="text-white/70 text-sm">0 osób</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <Settings size={20} className="text-white" />
              <span className="text-white font-medium">Ustawienia</span>
            </div>
            <p className="text-white/70 text-sm">Zarządzaj swoim kontem</p>
          </div>

          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={18} className="mr-2" />
            Wyloguj się
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
