import { useState } from 'react';
import { TrendingUp, Users, Clock, BookmarkPlus, EyeOff, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PollOption {
  id: string;
  option_text: string;
  votes: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  creator_username: string;
  status: 'active' | 'archived';
  total_votes: number;
  push_count: number;
  expires_at: string;
  created_at: string;
  options: PollOption[];
  timeLeft: string;
  hasVoted?: boolean;
  userVote?: string;
  hotScore?: number;
}

interface PollCardProps {
  poll: Poll;
  user: any;
  isArchive?: boolean;
  votingOption: {pollId: string, optionIndex: number} | null;
  votingProgress: number;
  countdownSeconds: number;
  onVoteStart: (pollId: string, optionIndex: number) => void;
  onVoteEnd: () => void;
  onSavePoll: (pollId: string) => void;
  onHidePoll: (pollId: string) => void;
  onPushPoll: (pollId: string) => void;
  canPushPoll: (pollId: string, hasVoted: boolean) => boolean;
  hasPushedPoll: (pollId: string) => boolean;
}

const PollCard = ({ 
  poll, 
  user, 
  isArchive = false, 
  votingOption, 
  votingProgress, 
  countdownSeconds,
  onVoteStart,
  onVoteEnd,
  onSavePoll,
  onHidePoll,
  onPushPoll,
  canPushPoll,
  hasPushedPoll
}: PollCardProps) => {
  const isExpired = poll.timeLeft === "Ended";
  const canVote = !poll.hasVoted && user && !isArchive && !isExpired;
  const showPushButton = poll.hasVoted && !isArchive && !isExpired;
  const isPushed = hasPushedPoll(poll.id);
  const canPush = canPushPoll(poll.id, poll.hasVoted || false);

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-orange-200 mb-2">
            {poll.question}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-orange-300/70 text-sm">
            {isExpired ? (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                Ended
              </>
            ) : (
              <>
                <Clock size={16} className="mr-1" />
                {poll.timeLeft}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {poll.options.map((option, index) => {
          const isVoting = votingOption?.pollId === poll.id && votingOption?.optionIndex === index;
          const isUserVote = poll.hasVoted && poll.userVote === option.id;
          
          return (
            <div
              key={option.id}
              className={`bg-black/20 rounded-lg p-3 ${canVote ? 'cursor-pointer hover:bg-black/40' : 'cursor-default'} transition-colors relative overflow-hidden ${
                isUserVote ? 'ring-2 ring-orange-400' : ''
              }`}
              onMouseDown={() => canVote && onVoteStart(poll.id, index)}
              onMouseUp={onVoteEnd}
              onMouseLeave={onVoteEnd}
              onTouchStart={() => canVote && onVoteStart(poll.id, index)}
              onTouchEnd={onVoteEnd}
            >
              {isVoting && (
                <>
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-yellow-500/20 transition-all duration-100"
                    style={{ width: `${votingProgress}%` }}
                  />
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
                  <span className="text-orange-200">{option.option_text}</span>
                  <span className="text-orange-300/80 text-sm">{option.percentage}%</span>
                </div>
                <div className="bg-black/40 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-400 to-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Poll Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-orange-300/70 text-sm">
          <div className="flex items-center">
            <Users size={16} className="mr-1" />
            {poll.total_votes} votes
          </div>
          {poll.push_count > 0 && (
            <div className="flex items-center">
              <Rocket size={16} className="mr-1" />
              {poll.push_count} pushes
            </div>
          )}
          <div className="flex items-center">
            <TrendingUp size={16} className="mr-1" />
            {poll.hasVoted ? 'Voted' : isArchive ? 'Ended' : 'Active'}
          </div>
        </div>

        {user && !isArchive && (
          <div className="flex gap-2">
            {showPushButton && (
              <Button
                size="sm"
                variant={isPushed ? "secondary" : "default"}
                onClick={() => onPushPoll(poll.id)}
                disabled={!canPush}
                className={`${
                  isPushed 
                    ? "bg-orange-500/20 text-orange-300 border-orange-500/30" 
                    : "bg-orange-500 text-white hover:bg-orange-600"
                } transition-colors`}
              >
                <Rocket size={16} className="mr-1" />
                {isPushed ? 'Pushed' : 'Push'}
              </Button>
            )}
            {!poll.hasVoted && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSavePoll(poll.id)}
                className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
              >
                <BookmarkPlus size={16} />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onHidePoll(poll.id)}
              className="border-red-500/30 text-red-300 hover:bg-red-500/10"
            >
              <EyeOff size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PollCard;