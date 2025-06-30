import { useState, useRef } from 'react';
import { TrendingUp, Users, Clock, X, BookmarkPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePolls } from '@/hooks/usePolls';
import { useAuth } from '@/hooks/useAuth';

interface PollsProps {
  onNavigateToCreate?: () => void;
}

const Polls = ({ onNavigateToCreate }: PollsProps) => {
  const { polls, loading, voteOnPoll, savePoll, hidePoll } = usePolls();
  const { user } = useAuth();
  const [draggedPoll, setDraggedPoll] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [votingOption, setVotingOption] = useState<{pollId: string, optionIndex: number} | null>(null);
  const [votingProgress, setVotingProgress] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);
  const votingTimer = useRef<NodeJS.Timeout | null>(null);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-orange-200">Ładowanie ankiet...</div>
      </div>
    );
  }

  const handleVoteStart = (pollId: string, optionIndex: number) => {
    if (votingOption || !user) return;
    
    const poll = polls.find(p => p.id === pollId);
    if (poll?.hasVoted) return;
    
    setVotingOption({ pollId, optionIndex });
    setVotingProgress(0);
    setCountdownSeconds(3);
    
    const interval = setInterval(() => {
      setVotingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          handleVoteComplete(pollId, optionIndex);
          return 100;
        }
        return prev + (100 / 30);
      });
    }, 100);

    const countdownInterval = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    votingTimer.current = interval;
  };

  const handleVoteEnd = () => {
    if (votingTimer.current) {
      clearInterval(votingTimer.current);
      votingTimer.current = null;
    }
    setVotingOption(null);
    setVotingProgress(0);
    setCountdownSeconds(0);
  };

  const handleVoteComplete = async (pollId: string, optionIndex: number) => {
    const poll = polls.find(p => p.id === pollId);
    if (poll && poll.options[optionIndex]) {
      await voteOnPoll(pollId, poll.options[optionIndex].id);
    }
    handleVoteEnd();
  };

  const handleTouchStart = (e: React.TouchEvent, pollId: string) => {
    startX.current = e.touches[0].clientX;
    setDraggedPoll(pollId);
    setShowSwipeHint(false);
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || draggedPoll === null) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || draggedPoll === null) return;
    
    const threshold = 100;
    
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0) {
        savePoll(draggedPoll);
      } else {
        hidePoll(draggedPoll);
      }
    }
    
    setDraggedPoll(null);
    setDragOffset(0);
    isDragging.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent, pollId: string) => {
    startX.current = e.clientX;
    setDraggedPoll(pollId);
    setShowSwipeHint(false);
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || draggedPoll === null) return;
    
    const currentX = e.clientX;
    const diff = currentX - startX.current;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging.current || draggedPoll === null) return;
    
    const threshold = 100;
    
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0) {
        savePoll(draggedPoll);
      } else {
        hidePoll(draggedPoll);
      }
    }
    
    setDraggedPoll(null);
    setDragOffset(0);
    isDragging.current = false;
  };

  return (
    <div className="flex-1 px-6 py-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent mb-2">
            Głosuj na tematy które Cię interesują
          </h1>
          <p className="text-gray-300">
            Przesuń w prawo aby zapisać na później, w lewo aby odrzucić
          </p>
        </div>

        {!user && (
          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4 mb-6 text-center">
            <p className="text-orange-200">
              Zaloguj się aby głosować i tworzyć ankiety
            </p>
          </div>
        )}

        {showSwipeHint && polls.length > 0 && (
          <div className="flex items-center justify-center mb-4 animate-pulse">
            <ChevronLeft className="text-red-400" size={20} />
            <span className="text-gray-400 text-sm mx-2">Przesuń aby interakcji</span>
            <ChevronRight className="text-orange-400" size={20} />
          </div>
        )}

        <div className="space-y-6">
          {polls.map((poll) => (
            <div
              key={poll.id}
              className="relative overflow-hidden"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Swipe indicators */}
              <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none z-0">
                <div className={`flex items-center gap-2 transition-opacity duration-200 ${draggedPoll === poll.id && dragOffset > 50 ? 'opacity-100' : 'opacity-0'}`}>
                  <BookmarkPlus className="text-orange-400" size={24} />
                  <span className="text-orange-400 font-medium">Zapisz na później</span>
                </div>
                <div className={`flex items-center gap-2 transition-opacity duration-200 ${draggedPoll === poll.id && dragOffset < -50 ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-red-400 font-medium">Nie pokazuj więcej</span>
                  <X className="text-red-400" size={24} />
                </div>
              </div>

              <div
                className={`bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30 cursor-grab active:cursor-grabbing transition-all duration-200 relative z-10 ${
                  draggedPoll === poll.id ? 'select-none' : ''
                }`}
                style={{
                  transform: draggedPoll === poll.id ? `translateX(${dragOffset}px) scale(${1 - Math.abs(dragOffset) * 0.0005})` : 'translateX(0)',
                  backgroundColor: draggedPoll === poll.id && Math.abs(dragOffset) > 50 
                    ? (dragOffset > 0 ? 'rgba(251, 146, 60, 0.1)' : 'rgba(239, 68, 68, 0.1)') 
                    : undefined
                }}
                onTouchStart={(e) => handleTouchStart(e, poll.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={(e) => handleMouseDown(e, poll.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-orange-200 mb-2">
                      {poll.question}
                    </h3>
                    <p className="text-orange-300/60 text-sm">utworzone przez {poll.creator_username}</p>
                  </div>
                  <div className="flex items-center text-orange-300/70 text-sm">
                    <Clock size={16} className="mr-1" />
                    {poll.timeLeft}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {poll.options.map((option, index) => {
                    const isVoting = votingOption?.pollId === poll.id && votingOption?.optionIndex === index;
                    const isUserVote = poll.hasVoted && poll.userVote === option.id;
                    return (
                      <div
                        key={option.id}
                        className={`bg-black/20 rounded-lg p-3 cursor-pointer hover:bg-black/40 transition-colors relative overflow-hidden ${
                          poll.hasVoted ? 'cursor-default' : ''
                        } ${isUserVote ? 'ring-2 ring-orange-400' : ''}`}
                        onMouseDown={() => !poll.hasVoted && user && handleVoteStart(poll.id, index)}
                        onMouseUp={handleVoteEnd}
                        onMouseLeave={handleVoteEnd}
                        onTouchStart={() => !poll.hasVoted && user && handleVoteStart(poll.id, index)}
                        onTouchEnd={handleVoteEnd}
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

                <div className="flex items-center justify-between text-orange-300/70 text-sm">
                  <div className="flex items-center">
                    <Users size={16} className="mr-1" />
                    {poll.total_votes} głosów
                  </div>
                  <div className="flex items-center">
                    <TrendingUp size={16} className="mr-1" />
                    {poll.hasVoted ? 'Zagłosowano' : 'Aktywna'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {polls.length === 0 && (
          <div className="text-center py-12">
            <p className="text-orange-300/70 mb-4">Brak aktywnych ankiet</p>
            <button 
              onClick={onNavigateToCreate}
              className="bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-orange-500/30 text-orange-200 font-medium transition-colors"
            >
              Utwórz pierwszą ankietę
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <button 
            onClick={onNavigateToCreate}
            className="bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-orange-500/30 text-orange-200 font-medium transition-colors"
          >
            Utwórz swoją ankietę
          </button>
        </div>
      </div>
    </div>
  );
};

export default Polls;
