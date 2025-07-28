import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Share2, Clock, Users, AlertTriangle } from "lucide-react";
import HoldButton from "@/components/HoldButton";
import { usePushSystem } from "@/hooks/usePushSystem";

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
  push_count: number;
  options: PollOption[];
  is_active: boolean;
  timeLeft?: string;
  userVote?: string;
  hasVoted?: boolean;
}

const PollView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { pushPoll } = usePushSystem();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [votingOption, setVotingOption] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(3);

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
    if (!id) return;

    try {
      setLoading(true);
      console.log("Fetching poll with ID:", id);

      // Fetch poll data
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select(`
          *,
          poll_options (
            id,
            option_text,
            vote_count
          )
        `)
        .eq("id", id)
        .single();

      console.log("Poll query result:", { pollData, pollError });

      if (pollError) {
        console.error("Error fetching poll:", pollError);
        console.log("Attempted poll ID:", id);
        toast({
          title: "Error",
          description: "Poll not found or has been deleted.",
          variant: "destructive",
        });
        return;
      }

      // Check if user voted
      let userVote = null;
      let hasVoted = false;

      if (user) {
        const { data: voteData } = await supabase
          .from("user_votes")
          .select("option_id, poll_options(option_text)")
          .eq("poll_id", id)
          .eq("user_id", user.id)
          .single();

        if (voteData) {
          userVote = voteData.poll_options?.option_text;
          hasVoted = true;
        }
      }

      // Calculate percentages
      const totalVotes = pollData.poll_options.reduce((sum: number, option: any) => sum + option.vote_count, 0);
      const optionsWithPercentage = pollData.poll_options.map((option: any) => ({
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
    } finally {
      setLoading(false);
    }
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
        title: "Vote Submitted!",
        description: "Your vote has been recorded.",
      });

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
    const url = `${window.location.origin}/poll/${id}`;
    
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

  const handlePush = async () => {
    if (!poll || !user) return;
    
    try {
      await pushPoll(poll.id);
      await fetchPoll(); // Refresh to get updated push count
    } catch (error) {
      console.error("Error pushing poll:", error);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [id, user]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading poll...</div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800/50 border-gray-700 p-8 text-center max-w-md w-full">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Poll Not Found</h1>
          <p className="text-gray-300 mb-6">
            This poll doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            className="text-white border-white/20 hover:bg-white/10"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Poll Card */}
        <Card className="bg-gray-800/50 border-gray-700 p-6 mb-6">
          {/* Poll Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {poll.is_active ? (
                <>
                  <Badge variant="secondary" className="bg-green-600 text-white">
                    Active
                  </Badge>
                  <div className="flex items-center text-gray-300 text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    {poll.timeLeft}
                  </div>
                </>
              ) : (
                <Badge variant="secondary" className="bg-red-600 text-white">
                  🛑 Ended
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-400">
              by {poll.creator_username}
            </div>
          </div>

          {/* Question */}
          <h1 className="text-2xl font-bold text-white mb-6">{poll.question}</h1>

          {/* Options */}
          <div className="space-y-4">
            {poll.options.map((option, index) => {
              const isUserVote = poll.userVote === option.option_text;
              const isVotingThis = votingOption === option.id;

              return (
                <div key={option.id} className="relative">
                  {/* Voting UI */}
                  {poll.is_active && !poll.hasVoted && (
                    <div className="mb-2">
                      <HoldButton
                        onHoldStart={() => handleVoteStart(option.id)}
                        onHoldEnd={handleVoteEnd}
                        globalHolders={0}
                        onActivationChange={() => {}}
                      />
                      {isVotingThis && (
                        <div className="mt-2 text-center">
                          <div className="text-white font-bold text-lg">
                            {countdownSeconds}
                          </div>
                          <div className="text-gray-300 text-sm">
                            Voting for: {option.option_text}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Option Display */}
                  <div className={`p-4 rounded-lg border transition-all ${
                    isUserVote 
                      ? 'bg-blue-600/30 border-blue-500 ring-2 ring-blue-500' 
                      : 'bg-gray-700/50 border-gray-600'
                  }`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium flex-1">
                        {option.option_text}
                        {isUserVote && (
                          <Badge className="ml-2 bg-blue-600 text-white text-xs">
                            Your vote
                          </Badge>
                        )}
                      </span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-300">
                          {option.vote_count} votes
                        </span>
                        {(poll.hasVoted || !poll.is_active) && (
                          <span className="text-white font-bold">
                            {option.percentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(poll.hasVoted || !poll.is_active) && (
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            isUserVote ? 'bg-blue-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${option.percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Poll Stats */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-600">
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {poll.total_votes} votes
              </div>
              {poll.push_count > 0 && (
                <div>🔥 {poll.push_count} boosts</div>
              )}
            </div>

            {/* Boost Button */}
            {poll.hasVoted && poll.is_active && user && (
              <Button
                onClick={handlePush}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
              >
                🔥 BOOST
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PollView;