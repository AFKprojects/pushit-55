import { BarChart3, Globe, Clock, Trophy, TrendingUp, Users, Calendar, Vote, Activity, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DailyStats {
  pollsCreated24h: number;
  votes24h: number;
  maxSimultaneous24h: number;
  countryRanking: CountryStats[];
  activePolls: number;
}

interface MonthlyStats {
  pollsCreatedMonth: number;
  votesMonth: number;
  maxSimultaneousMonth: number;
  countryRankingMonth: CountryStats[];
}

interface AllTimeStats {
  totalUsers: number;
  totalVotes: number;
  totalPolls: number;
  allTimeRecord: number;
  mostBoostedPoll: {
    question: string;
    boostCount: number;
  } | null;
  countryRankingAllTime: CountryStats[];
}

interface CountryStats {
  country: string;
  code: string;
  count: number;
}

const Statistics = () => {
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    pollsCreated24h: 0,
    votes24h: 0,
    maxSimultaneous24h: 0,
    countryRanking: [],
    activePolls: 0
  });
  
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    pollsCreatedMonth: 0,
    votesMonth: 0,
    maxSimultaneousMonth: 0,
    countryRankingMonth: []
  });
  
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStats>({
    totalUsers: 0,
    totalVotes: 0,
    totalPolls: 0,
    allTimeRecord: 0,
    mostBoostedPoll: null,
    countryRankingAllTime: []
  });
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');

  // Country code mapping for flags
  const countryCodeMap: { [key: string]: string } = {
    'United States': 'US',
    'Germany': 'DE',
    'United Kingdom': 'GB',
    'Belgium': 'BE',
    'France': 'FR',
    'Canada': 'CA',
    'Netherlands': 'NL',
    'Australia': 'AU',
    'Spain': 'ES',
    'Italy': 'IT',
    'Poland': 'PL',
    'Czech Republic': 'CZ',
    'Austria': 'AT',
    'Switzerland': 'CH',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Ireland': 'IE',
    'Portugal': 'PT',
    'Unknown': 'XX'
  };

  const getCountryStats = async (timeFilter: string) => {
    try {
      console.log('🔍 Fetching country stats with filter:', timeFilter);
      
      // Get all button_holds records regardless of ended_at to include current sessions
      const { data: buttonPresses, error } = await supabase
        .from('button_holds')
        .select('country, started_at, ended_at')
        .gte('started_at', timeFilter);

      console.log('📊 Raw button_holds data (all records):', buttonPresses);
      console.log('❌ Button_holds error:', error);

      if (error) {
        console.error('Error fetching country stats:', error);
        return [];
      }

      if (!buttonPresses || buttonPresses.length === 0) {
        console.log('📭 No button_holds records found');
        return [];
      }

      const countryCounts: { [key: string]: number } = {};
      buttonPresses?.forEach(press => {
        if (press.country) {
          const country = press.country;
          countryCounts[country] = (countryCounts[country] || 0) + 1;
        }
      });

      console.log('📈 Country counts:', countryCounts);

      const results = Object.entries(countryCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([country, count]) => ({
          country,
          code: countryCodeMap[country] || 'XX',
          count
        }));

      console.log('🏁 Final country results:', results);
      return results;
    } catch (error) {
      console.error('Error in getCountryStats:', error);
      return [];
    }
  };

  const calculateMaxSimultaneous = async (startDate?: string) => {
    let query = supabase
      .from('button_holds')
      .select('started_at, ended_at')
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: true });

    if (startDate) {
      query = query.gte('started_at', startDate);
    }

    const { data: allHolds } = await query;
    const { count: activeHolds } = await supabase
      .from('button_holds')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    let maxSimultaneous = activeHolds || 0;
    
    if (allHolds && allHolds.length > 0) {
      const events: Array<{time: Date, type: 'start' | 'end'}> = [];
      
      allHolds.forEach(hold => {
        events.push({ time: new Date(hold.started_at), type: 'start' });
        if (hold.ended_at) {
          events.push({ time: new Date(hold.ended_at), type: 'end' });
        }
      });
      
      events.sort((a, b) => a.time.getTime() - b.time.getTime());
      
      let currentSimultaneous = 0;
      events.forEach(event => {
        if (event.type === 'start') {
          currentSimultaneous++;
          maxSimultaneous = Math.max(maxSimultaneous, currentSimultaneous);
        } else {
          currentSimultaneous--;
        }
      });
    }

    return maxSimultaneous;
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Daily Stats
        const { count: pollsCreated24h } = await supabase
          .from('polls')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo.toISOString());

        const { count: votes24h } = await supabase
          .from('user_votes')
          .select('*', { count: 'exact', head: true })
          .gte('voted_at', oneDayAgo.toISOString());

        const { count: activePolls } = await supabase
          .from('polls')
          .select('*', { count: 'exact', head: true })
          .gt('expires_at', now.toISOString());

        const maxSimultaneous24h = await calculateMaxSimultaneous(oneDayAgo.toISOString());
        const countryRanking = await getCountryStats(oneDayAgo.toISOString());
        console.log('Daily country ranking:', countryRanking);

        setDailyStats({
          pollsCreated24h: pollsCreated24h || 0,
          votes24h: votes24h || 0,
          maxSimultaneous24h,
          countryRanking,
          activePolls: activePolls || 0
        });

        // Monthly Stats
        const { count: pollsCreatedMonth } = await supabase
          .from('polls')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneMonthAgo.toISOString());

        const { count: votesMonth } = await supabase
          .from('user_votes')
          .select('*', { count: 'exact', head: true })
          .gte('voted_at', oneMonthAgo.toISOString());

        const maxSimultaneousMonth = await calculateMaxSimultaneous(oneMonthAgo.toISOString());
        const countryRankingMonth = await getCountryStats(oneMonthAgo.toISOString());

        setMonthlyStats({
          pollsCreatedMonth: pollsCreatedMonth || 0,
          votesMonth: votesMonth || 0,
          maxSimultaneousMonth,
          countryRankingMonth
        });

        // All-time Stats
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: totalVotes } = await supabase
          .from('user_votes')
          .select('*', { count: 'exact', head: true });

        const { count: totalPolls } = await supabase
          .from('polls')
          .select('*', { count: 'exact', head: true });

        const allTimeRecord = await calculateMaxSimultaneous();

        // Get most boosted poll
        const { data: mostBoostedPollData } = await supabase
          .from('polls')
          .select('question, boost_count_cache')
          .order('boost_count_cache', { ascending: false })
          .limit(1)
          .maybeSingle();

        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const countryRankingAllTime = await getCountryStats(yearAgo.toISOString());

        setAllTimeStats({
          totalUsers: totalUsers || 0,
          totalVotes: totalVotes || 0,
          totalPolls: totalPolls || 0,
          allTimeRecord,
          mostBoostedPoll: mostBoostedPollData ? {
            question: mostBoostedPollData.question,
            boostCount: mostBoostedPollData.boost_count_cache || 0
          } : null,
          countryRankingAllTime
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
      }, () => {
        console.log('🔄 Button holds changed - refreshing stats');
        fetchStats();
      })
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const StatCard = ({ icon: Icon, title, value, color }: {
    icon: React.ComponentType<any>;
    title: string;
    value: string | number;
    color: string;
  }) => (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-r ${color}`}>
            <Icon size={20} className="text-black" />
          </div>
          <h3 className="text-blue-200 font-medium">{title}</h3>
        </div>
        <div className="text-2xl font-bold text-blue-400">
          {loading ? '-' : typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </div>
    </div>
  );

  const CountryRanking = ({ countries, title }: { countries: CountryStats[]; title: string }) => (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
          <Globe size={20} className="text-black" />
        </div>
        <h3 className="text-blue-200 font-medium">{title}</h3>
      </div>
      
      {loading ? (
        <div className="text-center py-4 text-blue-300/70">Loading...</div>
      ) : countries.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {countries.slice(0, 5).map((country, index) => (
            <div key={country.country} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center text-xs text-black font-bold">
                  {index + 1}
                </div>
                <div className="flex items-center gap-2">
                  {country.code !== 'XX' && (
                    <img 
                      src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                      alt={`${country.country} flag`}
                      className="w-5 h-auto rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <span className="text-blue-200">{country.country}</span>
                </div>
              </div>
              <span className="text-blue-400 font-medium">{country.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-blue-300/70">No data available</div>
      )}
    </div>
  );

  return (
    <div className="px-6 py-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-blue-400 mb-2">Community Statistics</h2>
          <p className="text-blue-200/70">Data from our global Push It! community</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="halloffame">Hall of Fame</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4 mt-6">
            <StatCard
              icon={Users}
              title="Max Simultaneous (24h)"
              value={dailyStats.maxSimultaneous24h}
              color="from-cyan-600 to-blue-500"
            />
            <StatCard
              icon={Calendar}
              title="Polls Created (24h)"
              value={dailyStats.pollsCreated24h}
              color="from-blue-500 to-cyan-500"
            />
            <StatCard
              icon={Vote}
              title="Votes Cast (24h)"
              value={dailyStats.votes24h}
              color="from-cyan-500 to-blue-600"
            />
            <CountryRanking countries={dailyStats.countryRanking} title="Countries (24h)" />
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4 mt-6">
            <StatCard
              icon={Users}
              title="Max Simultaneous (mo)"
              value={monthlyStats.maxSimultaneousMonth}
              color="from-rose-500 to-orange-500"
            />
            <StatCard
              icon={Calendar}
              title="Polls Created (mo)"
              value={monthlyStats.pollsCreatedMonth}
              color="from-purple-500 to-pink-500"
            />
            <StatCard
              icon={Vote}
              title="Votes Cast (mo)"
              value={monthlyStats.votesMonth}
              color="from-pink-500 to-rose-500"
            />
            <CountryRanking countries={monthlyStats.countryRankingMonth} title="Countries (mo)" />
          </TabsContent>

          <TabsContent value="halloffame" className="space-y-4 mt-6">
            <StatCard
              icon={Trophy}
              title="All-Time Record"
              value={allTimeStats.allTimeRecord}
              color="from-yellow-500 to-orange-500"
            />
            
            {allTimeStats.mostBoostedPoll && (
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500">
                    <Award size={20} className="text-black" />
                  </div>
                  <h3 className="text-blue-200 font-medium">Most Boosted Poll</h3>
                </div>
                <p className="text-blue-200 text-sm mb-2">{allTimeStats.mostBoostedPoll.question}</p>
                <p className="text-blue-400 font-bold">{allTimeStats.mostBoostedPoll.boostCount} boosts</p>
              </div>
            )}
            
            <StatCard
              icon={Users}
              title="Total Users"
              value={allTimeStats.totalUsers}
              color="from-blue-500 to-cyan-500"
            />
            <StatCard
              icon={BarChart3}
              title="Total Polls"
              value={allTimeStats.totalPolls}
              color="from-purple-500 to-pink-500"
            />
            <StatCard
              icon={Vote}
              title="Total Votes"
              value={allTimeStats.totalVotes}
              color="from-indigo-500 to-purple-500"
            />
            
            <CountryRanking countries={allTimeStats.countryRankingAllTime} title="Countries (All-Time)" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Statistics;