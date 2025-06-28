
import { useState } from 'react';
import { TrendingUp, Users, Clock } from 'lucide-react';

interface PollsProps {
  onNavigateToCreate?: () => void;
}

const Polls = ({ onNavigateToCreate }: PollsProps) => {
  const [polls] = useState([
    {
      id: 1,
      question: "What's your favorite time to hold the button?",
      options: [
        { text: "Morning (6-12)", votes: 45, percentage: 32 },
        { text: "Afternoon (12-18)", votes: 62, percentage: 44 },
        { text: "Evening (18-24)", votes: 28, percentage: 20 },
        { text: "Night (0-6)", votes: 6, percentage: 4 }
      ],
      totalVotes: 141,
      timeLeft: "2 days"
    },
    {
      id: 2,
      question: "How long do you usually hold?",
      options: [
        { text: "Just 3 seconds", votes: 34, percentage: 28 },
        { text: "5-10 seconds", votes: 51, percentage: 42 },
        { text: "10-30 seconds", votes: 28, percentage: 23 },
        { text: "Over 30 seconds", votes: 9, percentage: 7 }
      ],
      totalVotes: 122,
      timeLeft: "5 days"
    }
  ]);

  return (
    <div className="flex-1 px-6 py-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent mb-2">
            Community Polls
          </h1>
          <p className="text-gray-300">
            Share your thoughts with the HIVE community
          </p>
        </div>

        <div className="space-y-6">
          {polls.map((poll) => (
            <div
              key={poll.id}
              className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-orange-200 mb-2">
                  {poll.question}
                </h3>
                <div className="flex items-center text-orange-300/70 text-sm">
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
                      <span className="text-orange-200">{option.text}</span>
                      <span className="text-orange-300/80 text-sm">{option.percentage}%</span>
                    </div>
                    <div className="bg-black/40 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-orange-400 to-yellow-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${option.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-orange-300/70 text-sm">
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
          ))}
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={onNavigateToCreate}
            className="bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-orange-500/30 text-orange-200 font-medium transition-colors"
          >
            Create Your Poll
          </button>
        </div>
      </div>
    </div>
  );
};

export default Polls;
