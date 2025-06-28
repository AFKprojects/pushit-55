
import { BarChart3, Globe, Clock, Trophy, TrendingUp, Users } from 'lucide-react';

const Statistics = () => {
  const stats = [
    {
      icon: Users,
      title: 'Community Members',
      value: '24,891',
      change: 'Total registered',
      color: 'from-orange-500 to-yellow-500'
    },
    {
      icon: Clock,
      title: 'Button Presses (24h)',
      value: '12,847',
      change: '+2.3%',
      color: 'from-yellow-500 to-orange-600'
    },
    {
      icon: Trophy,
      title: 'Max Simultaneous Users',
      value: '1,247',
      change: 'All-time record',
      color: 'from-orange-600 to-red-500'
    },
    {
      icon: TrendingUp,
      title: 'Max Simultaneous Today',
      value: '892',
      change: 'Daily record',
      color: 'from-yellow-600 to-orange-500'
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
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-orange-400 mb-2">Community Statistics</h2>
          <p className="text-orange-200/70">Data from our global HIVE community</p>
        </div>

        {/* Key Stats */}
        <div className="space-y-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index}
                className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}>
                      <Icon size={20} className="text-black" />
                    </div>
                    <div>
                      <h3 className="text-orange-200 font-medium">{stat.title}</h3>
                      <p className="text-orange-300/60 text-sm">{stat.change}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-400">{stat.value}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Country Breakdown */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={20} className="text-orange-400" />
            <h3 className="text-orange-200 font-medium">By Country (24h)</h3>
          </div>
          
          <div className="space-y-3">
            {countryStats.map((country, index) => {
              const maxCount = Math.max(...countryStats.map(c => c.count));
              const percentage = (country.count / maxCount) * 100;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-200 text-sm">{country.country}</span>
                    <span className="text-orange-300/80 text-sm font-medium">
                      {country.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-400 to-yellow-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Activity */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20">
          <h3 className="text-orange-200 font-medium mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            Live Activity
          </h3>
          <div className="text-orange-300/70 text-sm space-y-1">
            <p>• Someone from Japan just held for 3 seconds</p>
            <p>• New poll created: "Best time to connect?"</p>
            <p>• Community milestone: 25K members reached!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
