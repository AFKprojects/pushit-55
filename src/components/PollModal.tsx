import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Share2, Clock, Users, Rocket, BookmarkPlus, EyeOff, User } from "lucide-react";
import { usePushSystem } from "@/hooks/usePushSystem";
import { usePollModal } from "@/hooks/usePollModal";
import { useUserModal } from "@/hooks/useUserModal";

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
  percentage?: number;
}

interface Poll {
  id: string;
  question: string;
  creator_username: string;
  expires_at: string;
  created_at: string;
  total_votes: number;
  boost_count_cache: number;
  options: PollOption[];
  is_active: boolean;
  timeLeft?: string;
  userVote?: string;
  hasVoted?: boolean;
}

const PollModal = () => {
  const { isOpen, pollId, closeModal, openModal } = usePollModal();
  const { toast } = useToast();
  const { user } = useAuth();
  const { boostPoll } = usePushSystem();
  const { openModal: openUserModal } = useUserModal();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const [votingOption, setVotingOption] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const [savedPolls, setSavedPolls] = useState<string[]>([]);
  const [isEditingVote, setIsEditingVote] = useState(false);
  const [hasEditedVote, setHasEditedVote] = useState(false);

  const calculateTimeLeft = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  const fetchPoll = async () => {
    if (!pollId) return;

    try {
      setLoading(true);

      // Fetch poll data
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select(`
          *,
          poll_options (
            id,
            option_text
          )
        `)
        .eq("id", pollId)
        .single();

      if (pollError) {
        console.error("Error fetching poll:", pollError);
        toast({
          title: "Error",
          description: "Poll not found or has been deleted.",
          variant: "destructive",
        });
        closeModal();
        return;
      }

      // Check if user voted
      let userVote = null;
      let hasVoted = false;

      if (user) {
        const { data: voteData } = await supabase
          .from("user_votes")
          .select("option_id, poll_options(option_text)")
          .eq("poll_id", pollId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (voteData) {
          userVote = voteData.poll_options?.option_text;
          hasVoted = true;
        }
      }

      // Calculate vote counts and percentages
      const optionsWithCounts = await Promise.all(
        pollData.poll_options.map(async (option: any) => {
          const { count } = await supabase
            .from("user_votes")
            .select("*", { count: "exact", head: true })
            .eq("option_id", option.id);

          return {
            ...option,
            vote_count: count || 0,
          };
        })
      );

      const totalVotes = optionsWithCounts.reduce((sum: number, option: any) => sum + option.vote_count, 0);
      const optionsWithPercentage = optionsWithCounts.map((option: any) => ({
        ...option,
        percentage: totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0,
      }));

      const isActive = new Date(pollData.expires_at) > new Date();
      const timeLeft = calculateTimeLeft(pollData.expires_at);

      setPoll({
        ...pollData,
        options: optionsWithPercentage,
        total_votes: totalVotes,
        is_active: isActive,
        timeLeft,
        userVote,
        hasVoted,
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load poll.",
        variant: "destructive",
      });
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  const handleEditVote = () => {
    if (!user || !poll?.is_active || hasEditedVote) return;
    setIsEditingVote(true);
  };

  const handleVoteStart = (optionId: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to vote on polls.",
        variant: "destructive",
      });
      return;
    }

    if (!poll?.is_active) {
      toast({
        title: "Poll Ended",
        description: "This poll has already ended.",
        variant: "destructive",
      });
      return;
    }

    // Don't allow voting if already voted and not in edit mode
    if (poll.hasVoted && !isEditingVote) return;

    setVoting(true);
    setVotingOption(optionId);
    setCountdownSeconds(3);

    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleVoteComplete(optionId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVoteEnd = () => {
    setVoting(false);
    setVotingOption(null);
    setCountdownSeconds(3);
  };

  const handleVoteComplete = async (optionId: string) => {
    if (!user || !poll) return;

    try {
      // Delete existing vote if any
      await supabase
        .from("user_votes")
        .delete()
        .eq("poll_id", poll.id)
        .eq("user_id", user.id);

      // Insert new vote
      const { error: voteError } = await supabase
        .from("user_votes")
        .insert({
          poll_id: poll.id,
          user_id: user.id,
          option_id: optionId,
        });

      if (voteError) throw voteError;

      toast({
        title: isEditingVote ? "Vote Updated!" : "Vote Submitted!",
        description: isEditingVote ? "Your vote has been changed." : "Your vote has been recorded.",
      });

      // Mark as edited if was in edit mode
      if (isEditingVote) {
        setHasEditedVote(true);
        setIsEditingVote(false);
      }

      // Refresh poll data
      await fetchPoll();
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      handleVoteEnd();
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/poll/${pollId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: poll?.question,
          url: url,
        });
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link Copied!",
        description: "Poll link has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link.",
        variant: "destructive",
      });
    }
  };

  const handleBoost = async () => {
    if (!poll || !user) return;
    
    try {
      await boostPoll(poll.id);
      await fetchPoll(); // Refresh to get updated boost count
    } catch (error) {
      console.error("Error boosting poll:", error);
    }
  };

  const handleSavePoll = async () => {
    if (!poll || !user) return;
    
    try {
      const { error } = await supabase
        .from("saved_polls")
        .insert({
          user_id: user.id,
          poll_id: poll.id
        });
      
      if (error) throw error;
      
      setSavedPolls(prev => [...prev, poll.id]);
      toast({
        title: "Poll Saved!",
        description: "Poll has been added to your saved polls.",
      });
    } catch (error) {
      console.error("Error saving poll:", error);
      toast({
        title: "Error",
        description: "Failed to save poll.",
        variant: "destructive",
      });
    }
  };

  const handleHidePoll = async () => {
    if (!poll || !user) return;
    
    try {
      const { error } = await supabase
        .from("hidden_polls")
        .insert({
          user_id: user.id,
          poll_id: poll.id
        });
      
      if (error) throw error;
      
      toast({
        title: "Poll Hidden",
        description: "This poll has been hidden from your feed.",
      });
      closeModal();
    } catch (error) {
      console.error("Error hiding poll:", error);
      toast({
        title: "Error",
        description: "Failed to hide poll.",
        variant: "destructive",
      });
    }
  };

  // Load saved polls when modal opens
  useEffect(() => {
    if (isOpen && pollId && user) {
      const loadSavedPolls = async () => {
        const { data } = await supabase
          .from("saved_polls")
          .select("poll_id")
          .eq("user_id", user.id);
        
        if (data) {
          setSavedPolls(data.map(item => item.poll_id));
        }
      };
      
      loadSavedPolls();
    }
  }, [isOpen, pollId, user]);

  // Fetch poll when modal opens
  useEffect(() => {
    if (isOpen && pollId) {
      // Reset edit state for new poll
      setIsEditingVote(false);
      setHasEditedVote(false);
      fetchPoll();
    }
  }, [isOpen, pollId]);

  // Update URL when modal opens/closes and handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const pollMatch = path.match(/^\/poll\/([^\/]+)$/);
      if (pollMatch && !isOpen) {
        // If URL has poll ID but modal is closed, open it
        openModal(pollMatch[1]);
      } else if (!pollMatch && isOpen) {
        // If URL doesn't have poll ID but modal is open, close it
        closeModal();
      }
    };

    if (isOpen && pollId) {
      window.history.pushState(null, '', `/poll/${pollId}`);
    } else if (!isOpen && window.location.pathname.startsWith('/poll/')) {
      window.history.pushState(null, '', '/');
    }

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, pollId]);

  // Time countdown effect
  useEffect(() => {
    if (!poll?.is_active) return;

    const interval = setInterval(() => {
      setPoll(prev => prev ? {
        ...prev,
        timeLeft: calculateTimeLeft(prev.expires_at)
      } : null);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [poll?.is_active]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/90 backdrop-blur-sm rounded-2xl border border-orange-500/40 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-orange-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-orange-500/30">
          <h2 className="text-xl font-bold text-orange-200">Poll Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeModal}
            className="text-orange-300 hover:bg-orange-500/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 bg-gradient-to-br from-black via-gray-900/50 to-blue-900/30">
          {loading ? (
            <div className="text-center text-orange-300 py-8">Loading poll...</div>
          ) : poll ? (
            <>
              {/* Poll Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-orange-200 mb-2">{poll.question}</h1>
                  <p className="text-xs text-orange-300/60 mb-1">
                    ID: {poll.id.slice(0, 8)} | by <button 
                      onClick={() => openUserModal(poll.creator_username)}
                      className="text-blue-300 hover:text-blue-200 underline"
                    >
                      {poll.creator_username}
                    </button>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-orange-300/70 text-sm">
                    {poll.is_active ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                        <Clock className="w-4 h-4 mr-1" />
                        {poll.timeLeft}
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                        Ended
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {poll.options.map((option, index) => {
                  const isUserVote = poll.userVote === option.option_text && !isEditingVote;
                  const isVotingThis = votingOption === option.id;
                  const canVote = user && poll.is_active && (!poll.hasVoted || isEditingVote);

                  return (
                    <div
                      key={option.id}
                      className={`bg-black/30 rounded-lg p-4 relative overflow-hidden transition-all duration-200 ${
                        canVote ? 'cursor-pointer hover:bg-black/50 hover:border-orange-400/50' : 'cursor-default'
                      } ${isUserVote ? 'ring-2 ring-orange-400 bg-orange-900/20' : ''} border border-orange-500/20`}
                      onMouseDown={() => canVote && handleVoteStart(option.id)}
                      onMouseUp={handleVoteEnd}
                      onMouseLeave={handleVoteEnd}
                      onTouchStart={() => canVote && handleVoteStart(option.id)}
                      onTouchEnd={handleVoteEnd}
                    >
                      {isVotingThis && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-yellow-500/20 transition-all duration-100" />
                          {countdownSeconds > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                              <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold animate-pulse">
                                {countdownSeconds}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <div className="relative z-10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-orange-200 flex-1">
                            {option.option_text}
                            {isUserVote && (
                              <Badge className="ml-2 bg-orange-600 text-white text-xs">
                                Your vote
                              </Badge>
                            )}
                          </span>
                          <span className="text-orange-300/80 text-sm">{option.percentage}%</span>
                        </div>
                        
                        {(poll.hasVoted || !poll.is_active) && (
                          <div className="bg-black/60 rounded-full h-2 border border-orange-500/20">
                            <div
                              className="bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-500 h-2 rounded-full transition-all duration-500 shadow-sm shadow-orange-500/30"
                              style={{ width: `${option.percentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Poll Actions */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4 text-orange-300/70 text-sm">
                  <div className="flex items-center">
                    <User size={16} className="mr-1" />
                    {poll.total_votes} votes
                  </div>
                  {poll.boost_count_cache > 0 && (
                    <div className="flex items-center">
                      <Rocket size={16} className="mr-1" />
                      {poll.boost_count_cache} boosts
                    </div>
                  )}
                </div>

                {user && (
                  <div className="flex gap-2 flex-wrap">
                    {poll.hasVoted && !hasEditedVote && poll.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEditVote}
                        disabled={isEditingVote}
                        className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                      >
                        {isEditingVote ? 'Select new vote' : 'Edit Vote'}
                      </Button>
                    )}
                    {poll.hasVoted && poll.is_active && (
                      <Button
                        size="sm"
                        onClick={handleBoost}
                        className="bg-orange-500 text-white hover:bg-orange-600"
                      >
                        <Rocket size={16} className="mr-1" />
                        Boost
                      </Button>
                    )}
                    {!savedPolls.includes(poll.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSavePoll}
                        className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                      >
                        <BookmarkPlus size={16} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleHidePoll}
                      className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                    >
                      <EyeOff size={16} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Share Button */}
              <div className="flex justify-center pt-6 border-t border-orange-500/30">
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Poll
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center text-red-300 py-8">
              Poll not found or has been deleted.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollModal;