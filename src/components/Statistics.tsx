
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CountryStats {
  country: string;
  users: number;
  flag: string;
}

interface ActivityStats {
  date: string;
  polls: number;
  votes: number;
}

const Statistics = () => {
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalUsers: 0,
    totalPolls: 0,
    totalVotes: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const countryFlags: { [key: string]: string } = {
    'Poland': '🇵🇱',
    'United States': '🇺🇸',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'United Kingdom': '🇬🇧',
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'Japan': '🇯🇵',
    'Brazil': '🇧🇷',
    'India': '🇮🇳',
    'China': '🇨🇳',
    'Russia': '🇷🇺',
    'Netherlands': '🇳🇱',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Finland': '🇫🇮',
    'Unknown': '🌍'
  };

  const colors = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

  useEffect(() => {
    fetchStatistics();

    // Set up real-time subscription
    const channel = supabase
      .channel('statistics-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        fetchStatistics();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'polls'
      }, () => {
        fetchStatistics();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_votes'
      }, () => {
        fetchStatistics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      // Get country statistics from profiles table
      const { data: profiles } = await supabase
        .from('profiles')
        .select('country');

      if (profiles) {
        const countryCounts = profiles.reduce((acc: { [key: string]: number }, profile) => {
          const country = profile.country || 'Unknown';
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        }, {});

        const countryStatsData = Object.entries(countryCounts)
          .map(([country, users]) => ({
            country,
            users: users as number,
            flag: countryFlags[country] || '🌍'
          }))
          .sort((a, b) => b.users - a.users)
          .slice(0, 10);

        setCountryStats(countryStatsData);
      }

      // Get total statistics
      const { data: pollsData } = await supabase
        .from('polls')
        .select('id, total_votes');

      const { data: usersData } = await supabase
        .from('profiles')
        .select('id');

      if (pollsData && usersData) {
        const totalVotes = pollsData.reduce((sum, poll) => sum + (poll.total_votes || 0), 0);
        
        setTotalStats({
          totalUsers: usersData.length,
          totalPolls: pollsData.length,
          totalVotes
        });
      }

      // Get activity stats for the last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const activityData = await Promise.all(
        last7Days.map(async (date) => {
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);
          
          const { data: pollsCount } = await supabase
            .from('polls')
            .select('id')
            .gte('created_at', date)
            .lt('created_at', nextDate.toISOString().split('T')[0]);

          const { data: votesCount } = await supabase
            .from('user_votes')
            .select('id')
            .gte('voted_at', date)
            .lt('voted_at', nextDate.toISOString().split('T')[0]);

          return {
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            polls: pollsCount?.length || 0,
            votes: votesCount?.length || 0
          };
        })
      );

      setActivityStats(activityData);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-orange-200">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent mb-2">
            Platform Statistics
          </h1>
          <p className="text-gray-300">
            Global community insights and activity
          </p>
        </div>

        {/* Total Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {totalStats.totalUsers.toLocaleString()}
              </div>
              <div className="text-orange-200">Total Users</div>
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {totalStats.totalPolls.toLocaleString()}
              </div>
              <div className="text-orange-200">Total Polls</div>
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {totalStats.totalVotes.toLocaleString()}
              </div>
              <div className="text-orange-200">Total Votes</div>
            </div>
          </div>
        </div>

        {/* Country Distribution */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30 mb-8">
          <h2 className="text-xl font-semibold text-orange-200 mb-6">Users by Country</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {countryStats.map((stat, index) => (
                <div key={stat.country} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{stat.flag}</span>
                    <span className="text-orange-200">{stat.country}</span>
                  </div>
                  <div className="text-orange-300/80">
                    {stat.users} {stat.users === 1 ? 'user' : 'users'}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={countryStats.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#f97316"
                    dataKey="users"
                    label={({ country, percent }) => `${country} ${(percent * 100).toFixed(0)}%`}
                  >
                    {countryStats.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
          <h2 className="text-xl font-semibold text-orange-200 mb-6">Activity (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityStats}>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#fed7aa' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#fed7aa' }}
              />
              <Bar dataKey="polls" fill="#f97316" name="Polls Created" />
              <Bar dataKey="votes" fill="#fb923c" name="Votes Cast" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center mt-4 space-x-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
              <span className="text-orange-200 text-sm">Polls Created</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-400 rounded mr-2"></div>
              <span className="text-orange-200 text-sm">Votes Cast</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
