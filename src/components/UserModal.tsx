import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, User, BarChart3, Vote, UserPlus, UserMinus, Clock } from "lucide-react";
import { useUserModal } from "@/hooks/useUserModal";

interface UserProfile {
  username: string;
  email?: string;
  activePolls: number;
  createdPolls: number;
  votesCast: number;
  isFollowing?: boolean;
}

const UserModal = () => {
  const { isOpen, username, closeModal } = useUserModal();
  const { toast } = useToast();
  const { user } = useAuth();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(false);

  const fetchUserProfile = async () => {
    if (!username) return;

    try {
      setLoading(true);

      // Get user info by username from polls table (creator_username)
      const { data: pollData } = await supabase
        .from("polls")
        .select("created_by, creator_username")
        .eq("creator_username", username)
        .limit(1)
        .single();

      if (!pollData) {
        toast({
          title: "Error",
          description: "User not found.",
          variant: "destructive",
        });
        closeModal();
        return;
      }

      // Get user's poll statistics
      const { data: createdPolls } = await supabase
        .from("polls")
        .select("id, expires_at")
        .eq("created_by", pollData.created_by);

      const { data: votes } = await supabase
        .from("user_votes")
        .select("id")
        .eq("user_id", pollData.created_by);

      const activePolls = createdPolls?.filter(poll => 
        new Date(poll.expires_at) > new Date()
      ).length || 0;

      // Following functionality will be implemented later
      let isFollowing = false;

      setUserProfile({
        username: pollData.creator_username,
        email: undefined, // Email not available from polls table
        activePolls,
        createdPolls: createdPolls?.length || 0,
        votesCast: votes?.length || 0,
        isFollowing,
      });

      setFollowing(isFollowing);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load user profile.",
        variant: "destructive",
      });
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    // Following functionality will be implemented when user_follows table is created
    toast({
      title: "Coming Soon",
      description: "Following functionality will be available soon!",
    });
  };

  // Fetch user profile when modal opens
  useEffect(() => {
    if (isOpen && username) {
      fetchUserProfile();
    }
  }, [isOpen, username]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/90 backdrop-blur-sm rounded-2xl border border-blue-500/40 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl shadow-blue-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-500/30">
          <h2 className="text-xl font-bold text-blue-200">User Profile</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeModal}
            className="text-blue-300 hover:bg-blue-500/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 bg-gradient-to-br from-black via-gray-900/50 to-blue-900/30">
          {loading ? (
            <div className="text-center text-blue-300 py-8">Loading user profile...</div>
          ) : userProfile ? (
            <>
              {/* User Info */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={40} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-blue-200 mb-1">{userProfile.username}</h1>
                {userProfile.email && (
                  <p className="text-blue-300/60 text-sm">{userProfile.email}</p>
                )}
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock size={20} className="text-green-400" />
                  </div>
                  <div className="text-xl font-bold text-blue-200">{userProfile.activePolls}</div>
                  <div className="text-blue-300/70 text-xs">Active Polls</div>
                </div>
                
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BarChart3 size={20} className="text-blue-400" />
                  </div>
                  <div className="text-xl font-bold text-blue-200">{userProfile.createdPolls}</div>
                  <div className="text-blue-300/70 text-xs">Created Polls</div>
                </div>
                
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Vote size={20} className="text-purple-400" />
                  </div>
                  <div className="text-xl font-bold text-blue-200">{userProfile.votesCast}</div>
                  <div className="text-blue-300/70 text-xs">Votes Cast</div>
                </div>
              </div>

              {/* Follow Button */}
              {user && user.email !== userProfile.email && (
                <div className="flex justify-center mb-6">
                  <Button
                    onClick={handleFollow}
                    className={`${
                      following 
                        ? "bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30" 
                        : "bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30"
                    } border`}
                    variant="outline"
                  >
                    {following ? (
                      <>
                        <UserMinus size={16} className="mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} className="mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-red-300 py-8">
              User profile not found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserModal;