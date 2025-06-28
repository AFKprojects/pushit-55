
import { BarChart3, Globe, Clock, Trophy, TrendingUp } from 'lucide-react';

const Statistics = () => {
  const stats = [
    {
      icon: Clock,
      title: 'Button Presses (24h)',
      value: '12,847',
      change: '+2.3%',
      gradient: 'from-indigo-blue to-sky-blue'
    },
    {
      icon: Trophy,
      title: 'Max Simultaneous Users',
      value: '1,247',
      change: 'All-time record',
      gradient: 'from-warm-coral to-soft-purple'
    },
    {
      icon: TrendingUp,
      title: 'Active Right Now',
      value: '89',
      change: 'Live count',
      gradient: 'from-mint-green to-sky-blue'
    }
  ];

  const countryStats = [
    { country: '🇺🇸 United States', count: 3247 },
    { country: '🇬🇧 United Kingdom', count: 2156 },
    { country: '🇨🇦 Canada', count: 1834 },
    { country: '🇩🇪 Germany', count: 1623 },
    { country: '🇫🇷 France', count: 1245 },
    { country: '🇯🇵 Japan', count: 987 },
    { country: '🇦🇺 Australia', count: 756 },
    { country: '🇧🇷 Brazil', count: 634 },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 bg-light-gray/30 dark:bg-dark-gray/30">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-dark-gray dark:text-light-gray mb-2">Global Statistics</h2>
          <p className="text-dark-gray/70 dark:text-light-gray/70">Real-time data from around the world</p>
        </div>

        {/* Key Stats */}
        <div className="space-y-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index}
                className="bg-white/80 dark:bg-dark-gray/60 backdrop-blur-sm rounded-2xl p-4 border border-indigo-blue/20 shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.gradient}`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-dark-gray dark:text-light-gray font-medium">{stat.title}</h3>
                      <p className="text-soft-purple text-sm">{stat.change}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-dark-gray dark:text-light-gray">{stat.value}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Country Breakdown */}
        <div className="bg-white/80 dark:bg-dark-gray/60 backdrop-blur-sm rounded-2xl p-4 border border-indigo-blue/20 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={20} className="text-indigo-blue" />
            <h3 className="text-dark-gray dark:text-light-gray font-medium">By Country (24h)</h3>
          </div>
          
          <div className="space-y-3">
            {countryStats.map((country, index) => {
              const maxCount = Math.max(...countryStats.map(c => c.count));
              const percentage = (country.count / maxCount) * 100;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-dark-gray dark:text-light-gray text-sm">{country.country}</span>
                    <span className="text-dark-gray/80 dark:text-light-gray/80 text-sm font-medium">
                      {country.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-light-gray/50 dark:bg-dark-gray/30 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-blue to-sky-blue h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Activity */}
        <div className="bg-white/80 dark:bg-dark-gray/60 backdrop-blur-sm rounded-2xl p-4 border border-mint-green/30 shadow-lg">
          <h3 className="text-dark-gray dark:text-light-gray font-medium mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-mint-green rounded-full animate-pulse" />
            Live Activity
          </h3>
          <div className="text-dark-gray/70 dark:text-light-gray/70 text-sm space-y-1">
            <p>• Someone from Japan just held for 3 seconds</p>
            <p>• 12 people from USA currently holding</p>
            <p>• New record set 2 hours ago: 1,247 simultaneous users</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
