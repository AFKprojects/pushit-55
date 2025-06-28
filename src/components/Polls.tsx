
import { useState } from 'react';
import { TrendingUp, Users, Clock } from 'lucide-react';

const Polls = () => {
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Community Polls
          </h1>
          <p className="text-gray-600">
            Share your thoughts with the holding community
          </p>
        </div>

        <div className="space-y-6">
          {polls.map((poll) => (
            <div
              key={poll.id}
              className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {poll.question}
                </h3>
                <div className="flex items-center text-white/70 text-sm">
                  <Clock size={16} className="mr-1" />
                  {poll.timeLeft}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {poll.options.map((option, index) => (
                  <div
                    key={index}
                    className="bg-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/20 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white">{option.text}</span>
                      <span className="text-white/80 text-sm">{option.percentage}%</span>
                    </div>
                    <div className="bg-white/20 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${option.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-white/70 text-sm">
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
          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30 text-white font-medium transition-colors">
            Create New Poll
          </button>
        </div>
      </div>
    </div>
  );
};

export default Polls;
