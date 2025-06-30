
import { BarChart3, Globe, Clock, Trophy, TrendingUp, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StatData {
  totalUsers: number;
  buttonPresses24h: number;
  maxSimultaneous24h: number;
  allTimeRecord: number;
  totalPolls: number;
  totalVotes: number;
}

const Statistics = () => {
  const [stats, setStats] = useState<StatData>({
    totalUsers: 0,
    buttonPresses24h: 0,
    maxSimultaneous24h: 0,
    allTimeRecord: 0,
    totalPolls: 0,
    totalVotes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total users count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get button presses in last 24h
        const { count: buttonPresses } = await supabase
          .from('button_holds')
          .select('*', { count: 'exact', head: true })
          .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        // Get total polls
        const { count: pollsCount } = await supabase
          .from('polls')
          .select('*', { count: 'exact', head: true });

        // Get total votes
        const { count: votesCount } = await supabase
          .from('user_votes')
          .select('*', { count: 'exact', head: true });

        // Get current active holds
        const { count: activeHolds } = await supabase
          .from('button_holds')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Calculate all-time record by finding the maximum number of simultaneous active holds
        // This is a simplified approach - in production you'd want to track this more precisely
        const { data: allHolds } = await supabase
          .from('button_holds')
          .select('started_at, ended_at')
          .order('started_at', { ascending: true });

        let maxSimultaneous = 0;
        let currentSimultaneous = 0;
        
        if (allHolds) {
          // Simple calculation - in reality you'd need more sophisticated tracking
          const events: Array<{time: Date, type: 'start' | 'end'}> = [];
          
          allHolds.forEach(hold => {
            events.push({ time: new Date(hold.started_at), type: 'start' });
            if (hold.ended_at) {
              events.push({ time: new Date(hold.ended_at), type: 'end' });
            }
          });
          
          events.sort((a, b) => a.time.getTime() - b.time.getTime());
          
          events.forEach(event => {
            if (event.type === 'start') {
              currentSimultaneous++;
              maxSimultaneous = Math.max(maxSimultaneous, currentSimultaneous);
            } else {
              currentSimultaneous--;
            }
          });
        }

        setStats({
          totalUsers: usersCount || 0,
          buttonPresses24h: buttonPresses || 0,
          maxSimultaneous24h: activeHolds || 0,
          allTimeRecord: Math.max(maxSimultaneous, activeHolds || 0),
          totalPolls: pollsCount || 0,
          totalVotes: votesCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up real-time updates
    const channel = supabase
      .channel('stats-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'button_holds'
      }, fetchStats)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'polls'
      }, fetchStats)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_votes'
      }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statsData = [
    {
      icon: Users,
      title: 'Community Members',
      value: loading ? '-' : stats.totalUsers.toLocaleString(),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Clock,
      title: 'Button Presses (24h)',
      value: loading ? '-' : stats.buttonPresses24h.toLocaleString(),
      color: 'from-cyan-500 to-blue-600'
    },
    {
      icon: TrendingUp,
      title: 'Max Simultaneous (24h)',
      value: loading ? '-' : stats.maxSimultaneous24h.toLocaleString(),
      color: 'from-cyan-600 to-blue-500'
    },
    {
      icon: Trophy,
      title: 'All-Time Record',
      value: loading ? '-' : stats.allTimeRecord.toLocaleString(),
      color: 'from-blue-600 to-indigo-500'
    },
    {
      icon: BarChart3,
      title: 'Total Polls',
      value: loading ? '-' : stats.totalPolls.toLocaleString(),
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: Globe,
      title: 'Total Votes',
      value: loading ? '-' : stats.totalVotes.toLocaleString(),
      color: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-blue-400 mb-2">Community Statistics</h2>
          <p className="text-blue-200/70">Data from our global Push It! community</p>
        </div>

        <div className="space-y-4">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index}
                className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}>
                      <Icon size={20} className="text-black" />
                    </div>
                    <div>
                      <h3 className="text-blue-200 font-medium">{stat.title}</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-400">{stat.value}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="text-blue-300/70">Loading statistics...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;
