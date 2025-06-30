
import { useState, useRef } from 'react';
import { TrendingUp, Users, Clock, X, BookmarkPlus, ChevronLeft, ChevronRight } from 'lucide-react';

interface PollsProps {
  onNavigateToCreate?: () => void;
  onSavePollToVote?: (pollId: number) => void;
  onHidePoll?: (pollId: number) => void;
}

interface Poll {
  id: number;
  question: string;
  createdBy: string;
  options: Array<{
    text: string;
    votes: number;
    percentage: number;
  }>;
  totalVotes: number;
  timeLeft: string;
  hidden?: boolean;
}

const Polls = ({ onNavigateToCreate, onSavePollToVote, onHidePoll }: PollsProps) => {
  const [polls, setPolls] = useState<Poll[]>([
    {
      id: 1,
      question: "What's your favorite time to push the button?",
      createdBy: "WorldPusher",
      options: [
        { text: "Morning (6-12)", votes: 45, percentage: 32 },
        { text: "Afternoon (12-18)", votes: 62, percentage: 44 },
        { text: "Evening (18-24)", votes: 28, percentage: 20 },
        { text: "Night (0-6)", votes: 6, percentage: 4 }
      ],
      totalVotes: 141,
      timeLeft: "2 days left"
    },
    {
      id: 2,
      question: "How long do you usually hold?",
      createdBy: "ButtonMaster",
      options: [
        { text: "Just 3 seconds", votes: 34, percentage: 28 },
        { text: "5-10 seconds", votes: 51, percentage: 42 },
        { text: "10-30 seconds", votes: 28, percentage: 23 },
        { text: "Over 30 seconds", votes: 9, percentage: 7 }
      ],
      totalVotes: 122,
      timeLeft: "13h left"
    }
  ]);

  const [draggedPoll, setDraggedPoll] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent, pollId: number) => {
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
        onSavePollToVote?.(draggedPoll);
        console.log(`Poll ${draggedPoll} saved to "To Vote"`);
      } else {
        onHidePoll?.(draggedPoll);
        setPolls(prev => prev.map(poll => 
          poll.id === draggedPoll ? { ...poll, hidden: true } : poll
        ));
        console.log(`Poll ${draggedPoll} hidden`);
      }
    }
    
    setDraggedPoll(null);
    setDragOffset(0);
    isDragging.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent, pollId: number) => {
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
        onSavePollToVote?.(draggedPoll);
        console.log(`Poll ${draggedPoll} saved to "To Vote"`);
      } else {
        onHidePoll?.(draggedPoll);
        setPolls(prev => prev.map(poll => 
          poll.id === draggedPoll ? { ...poll, hidden: true } : poll
        ));
        console.log(`Poll ${draggedPoll} hidden`);
      }
    }
    
    setDraggedPoll(null);
    setDragOffset(0);
    isDragging.current = false;
  };

  const visiblePolls = polls.filter(poll => !poll.hidden);

  return (
    <div className="flex-1 px-6 py-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent mb-2">
            Vote on the subjects that matter to you
          </h1>
          <p className="text-gray-300">
            Swipe right to save for later, left to dismiss
          </p>
        </div>

        {/* Swipe hint */}
        {showSwipeHint && visiblePolls.length > 0 && (
          <div className="flex items-center justify-center mb-4 animate-pulse">
            <ChevronLeft className="text-red-400" size={20} />
            <span className="text-gray-400 text-sm mx-2">Swipe to interact</span>
            <ChevronRight className="text-green-400" size={20} />
          </div>
        )}

        <div className="space-y-6">
          {visiblePolls.map((poll) => (
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
                  <BookmarkPlus className="text-green-400" size={24} />
                  <span className="text-green-400 font-medium">Save for later</span>
                </div>
                <div className={`flex items-center gap-2 transition-opacity duration-200 ${draggedPoll === poll.id && dragOffset < -50 ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-red-400 font-medium">Don't show again</span>
                  <X className="text-red-400" size={24} />
                </div>
              </div>

              <div
                className={`bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 cursor-grab active:cursor-grabbing transition-all duration-200 relative z-10 ${
                  draggedPoll === poll.id ? 'select-none' : ''
                }`}
                style={{
                  transform: draggedPoll === poll.id ? `translateX(${dragOffset}px) scale(${1 - Math.abs(dragOffset) * 0.0005})` : 'translateX(0)',
                  backgroundColor: draggedPoll === poll.id && Math.abs(dragOffset) > 50 
                    ? (dragOffset > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)') 
                    : undefined
                }}
                onTouchStart={(e) => handleTouchStart(e, poll.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={(e) => handleMouseDown(e, poll.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-200 mb-2">
                      {poll.question}
                    </h3>
                    <p className="text-blue-300/60 text-sm">created by {poll.createdBy}</p>
                  </div>
                  <div className="flex items-center text-blue-300/70 text-sm">
                    <Clock size={16} className="mr-1" />
                    {poll.timeLeft}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {poll.options.map((option, index) => (
                    <div
                      key={index}
                      className="bg-black/20 rounded-lg p-3 cursor-pointer hover:bg-black/40 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-blue-200">{option.text}</span>
                        <span className="text-blue-300/80 text-sm">{option.percentage}%</span>
                      </div>
                      <div className="bg-black/40 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-cyan-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${option.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-blue-300/70 text-sm">
                  <div className="flex items-center">
                    <Users size={16} className="mr-1" />
                    {poll.totalVotes} votes
                  </div>
                  <div className="flex items-center">
                    <TrendingUp size={16} className="mr-1" />
                    Active
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={onNavigateToCreate}
            className="bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-blue-500/30 text-blue-200 font-medium transition-colors"
          >
            Create Your Subject
          </button>
        </div>
      </div>
    </div>
  );
};

export default Polls;
