import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Shield, AlertTriangle, Activity, Rss, RefreshCcw, Clock, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [overviewRes, alertsRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/alerts?status=active')
      ]);
      setOverview(overviewRes.data);
      setRecentAlerts(alertsRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Threats',
      value: overview?.active_alerts || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: '#dc2626',
      description: 'Requires action',
      link: '/alerts?status=active'
    },
    {
      title: 'Surveillance',
      value: overview?.active_sources || 0,
      icon: Rss,
      color: 'text-[hsl(217,71%,25%)] dark:text-[hsl(217,71%,60%)]',
      bgColor: 'bg-[hsl(217,71%,95%)] dark:bg-[hsl(217,71%,20%)]',
      borderColor: 'hsl(217,71%,25%)',
      total: overview?.total_sources || 0,
      description: 'Active sources',
      link: '/sources'
    },
    {
      title: 'Intel Processed',
      value: overview?.total_content || 0,
      icon: Activity,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      borderColor: '#059669',
      description: 'Items analyzed',
      link: '/content'
    },
    {
      title: 'Case Reports',
      value: overview?.total_alerts || 0,
      icon: Shield,
      color: 'text-[hsl(43,96%,35%)] dark:text-[hsl(43,96%,60%)]',
      bgColor: 'bg-[hsl(43,96%,95%)] dark:bg-[hsl(43,96%,20%)]',
      borderColor: 'hsl(43,96%,50%)',
      description: 'Total documented',
      link: '/alerts'
    }
  ];

  const getRiskBadge = (level) => {
    const classes = {
      HIGH: 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
      MEDIUM: 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
      LOW: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
    };

    return <Badge variant="outline" className={classes[level] || classes.LOW}>{level}</Badge>;
  };

  // Calculate percentages for risk distribution
  const totalRiskCount = overview?.risk_distribution?.reduce((acc, curr) => acc + curr.count, 0) || 1;
  const getRiskPercentage = (count) => Math.round((count / totalRiskCount) * 100);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500" data-testid="dashboard">
      {/* Header - Responsive */}
      <div className="flex flex-col gap-4 pb-4 lg:pb-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-secondary/30">
              <Shield className="h-5 w-5 lg:h-6 lg:w-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight uppercase">Command Center</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Real-time threat intelligence overview</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-2 flex-1 sm:flex-none min-h-[40px]"
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Data</span>
              <span className="sm:hidden">Sync</span>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-secondary text-primary hover:bg-secondary/90 shadow-md font-semibold flex-1 sm:flex-none min-h-[40px]"
            >
              <Link to="/alerts">
                <span className="hidden sm:inline">View All Threats</span>
                <span className="sm:hidden">Threats</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid - Responsive: 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} to={stat.link} className="block group">
              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 hover:scale-[1.02] cursor-pointer h-full" style={{ borderLeftColor: stat.borderColor }}>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">{stat.title}</p>
                      <div className="flex items-baseline gap-1 sm:gap-2 mt-1 lg:mt-3">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{stat.value}</div>
                        {stat.total && <span className="text-xs sm:text-sm text-muted-foreground font-medium">/ {stat.total}</span>}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 lg:mt-2 font-medium group-hover:text-primary transition-colors truncate">{stat.description}</p>
                    </div>
                    <div className={`p-2 sm:p-2.5 lg:p-3 rounded-lg lg:rounded-xl ${stat.bgColor} shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                      <Icon className={`h-4 w-4 lg:h-5 lg:w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Main Content Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Recent Alerts - Full width on mobile, 2 cols on desktop */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base lg:text-lg">Recent Alerts</CardTitle>
                <CardDescription className="text-xs lg:text-sm">High-priority detections requiring attention</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {recentAlerts.length} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 lg:p-6 pt-0 lg:pt-0">
            {recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] lg:h-[300px] text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <CheckCircle2 className="h-10 w-10 lg:h-12 lg:w-12 mb-3 lg:mb-4 text-green-500 opacity-50" />
                <h3 className="text-base lg:text-lg font-medium text-foreground">All Clear</h3>
                <p className="text-xs lg:text-sm">No active alerts at the moment.</p>
              </div>
            ) : (
              <div className="space-y-3 lg:space-y-4">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="group flex flex-col gap-3 p-3 lg:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRiskBadge(alert.risk_level)}
                        <span className="text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {alert.platform}
                        </span>
                        <span className="text-[10px] lg:text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                          <Clock className="h-3 w-3" />
                          {alert.created_at ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true }) : 'Just now'}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm lg:text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {alert.title}
                      </h4>
                      <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] lg:text-xs text-muted-foreground">
                          Author: <span className="font-medium text-foreground">{alert.author}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                          <Link to={`/alerts?id=${alert.id}`}>
                            <ExternalLink className="h-3 w-3 lg:h-4 lg:w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Risk Distribution & System Status */}
        <div className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader className="p-4 lg:p-6">
              <CardTitle className="text-base lg:text-lg">Risk Distribution</CardTitle>
              <CardDescription className="text-xs lg:text-sm">Alert severity overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6 pt-0 lg:pt-0">
              {overview?.risk_distribution?.map((item) => {
                const percentage = getRiskPercentage(item.count);
                const colorClass = item._id === 'HIGH' ? 'bg-red-600' : item._id === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500';

                return (
                  <div key={item._id} className="space-y-1.5 lg:space-y-2">
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span className="font-medium">{item._id} Risk</span>
                      <span className="text-muted-foreground">{item.count} ({percentage}%)</span>
                    </div>
                    <Progress value={percentage} className="h-1.5 lg:h-2" indicatorClassName={colorClass} />
                  </div>
                );
              })}

              {(!overview?.risk_distribution || overview.risk_distribution.length === 0) && (
                <div className="text-center py-6 lg:py-8 text-muted-foreground text-xs lg:text-sm">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="p-4 lg:p-6">
              <CardTitle className="text-base lg:text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6 pt-0 lg:pt-0">
              <div className="space-y-3 lg:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs lg:text-sm text-muted-foreground">Monitoring Engine</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800 flex items-center gap-1 text-[10px] lg:text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse"></span>
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs lg:text-sm text-muted-foreground">Last Scan</span>
                  <span className="text-xs lg:text-sm font-medium">Just now</span>
                </div>
                <div className="pt-2">
                  <Button className="w-full min-h-[40px]" variant="outline" asChild>
                    <Link to="/settings">Configure Settings</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
//testing comment
export default Dashboard;
