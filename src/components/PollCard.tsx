
import { useState } from 'react';
import { TrendingUp, Users, Clock, BookmarkPlus, EyeOff, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PollOption {
  id: string;
  option_text: string;
  votes: number;
  percentage: number;
}

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    creator_username: string;
    status: 'active' | 'archived';
    total_votes: number;
    expires_at: string;
    created_at: string;
    options: PollOption[];
    timeLeft: string;
    hasVoted?: boolean;
    userVote?: string;
  };
  onVote?: (pollId: string, optionIndex: number) => void;
  onSave?: (pollId: string) => void;
  onHide?: (pollId: string) => void;
  onRemove?: (pollId: string) => void;
  votingState?: {
    pollId: string;
    optionIndex: number;
    progress: number;
    countdown: number;
  } | null;
  onVoteEnd?: () => void;
  showActions?: boolean;
  expandable?: boolean;
  alwaysExpanded?: boolean;
  canVote?: boolean;
}

const PollCard = ({
  poll,
  onVote,
  onSave,
  onHide,
  onRemove,
  votingState,
  onVoteEnd,
  showActions = true,
  expandable = false,
  alwaysExpanded = false,
  canVote = true
}: PollCardProps) => {
  const [isExpanded, setIsExpanded] = useState(alwaysExpanded);

  const handleVoteStart = (optionIndex: number) => {
    if (!canVote || poll.hasVoted || !onVote) return;
    onVote(poll.id, optionIndex);
  };

  const isVoting = votingState?.pollId === poll.id;

  const renderCollapsedView = () => (
    <div 
      className="cursor-pointer flex items-center justify-between"
      onClick={() => setIsExpanded(true)}
    >
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-orange-200 mb-1">
          {poll.question}
        </h3>
        <div className="flex items-center text-orange-300/70 text-sm space-x-4">
          <div className="flex items-center">
            <Users size={14} className="mr-1" />
            {poll.total_votes} votes
          </div>
          <div className="flex items-center">
            <TrendingUp size={14} className="mr-1" />
            {poll.hasVoted ? 'Voted' : 'Active'}
          </div>
        </div>
      </div>
      <ChevronDown size={20} className="text-orange-300/70" />
    </div>
  );

  const renderExpandedView = () => (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-orange-200 mb-2">
            {poll.question}
          </h3>
          {expandable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-orange-300/70 hover:text-orange-300 p-0 h-auto"
            >
              <ChevronUp size={16} className="mr-1" />
              Collapse
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-orange-300/70 text-sm">
            <Clock size={16} className="mr-1" />
            {poll.timeLeft}
          </div>
          {showActions && (
            <div className="flex gap-2">
              {onSave && !poll.hasVoted && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSave(poll.id)}
                  className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                >
                  <BookmarkPlus size={16} />
                </Button>
              )}
              {onHide && !poll.hasVoted && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onHide(poll.id)}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                >
                  <EyeOff size={16} />
                </Button>
              )}
              {onRemove && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemove(poll.id)}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {poll.options.map((option, index) => {
          const isVotingThisOption = isVoting && votingState?.optionIndex === index;
          const isUserVote = poll.hasVoted && poll.userVote === option.id;
          return (
            <div
              key={option.id}
              className={`bg-black/20 rounded-lg p-3 transition-colors relative overflow-hidden ${
                canVote && !poll.hasVoted ? 'cursor-pointer hover:bg-black/40' : 'cursor-default'
              } ${isUserVote ? 'ring-2 ring-orange-400' : ''}`}
              onMouseDown={() => canVote && handleVoteStart(index)}
              onMouseUp={onVoteEnd}
              onMouseLeave={onVoteEnd}
              onTouchStart={() => canVote && handleVoteStart(index)}
              onTouchEnd={onVoteEnd}
            >
              {isVotingThisOption && (
                <>
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-yellow-500/20 transition-all duration-100"
                    style={{ width: `${votingState?.progress || 0}%` }}
                  />
                  {votingState && votingState.countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold animate-pulse">
                        {votingState.countdown}
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

      <div className="flex items-center justify-between text-orange-300/70 text-sm">
        <div className="flex items-center">
          <Users size={16} className="mr-1" />
          {poll.total_votes} votes
        </div>
        <div className="flex items-center">
          <TrendingUp size={16} className="mr-1" />
          {poll.hasVoted ? 'Voted' : 'Active'}
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
      {expandable && !isExpanded ? renderCollapsedView() : renderExpandedView()}
    </div>
  );
};

export default PollCard;
