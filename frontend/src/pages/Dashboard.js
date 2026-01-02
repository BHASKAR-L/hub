import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Shield, AlertTriangle, Activity, Rss, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Alerts',
      value: overview?.active_alerts || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      trend: '+12%'
    },
    {
      title: 'Active Sources',
      value: overview?.active_sources || 0,
      icon: Rss,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      total: overview?.total_sources || 0
    },
    {
      title: 'Content Monitored',
      value: overview?.total_content || 0,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: '+24%'
    },
    {
      title: 'Total Alerts',
      value: overview?.total_alerts || 0,
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const getRiskBadge = (level) => {
    const styles = {
      HIGH: 'bg-red-100 text-red-700 border-red-200',
      MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
      LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
    return styles[level] || styles.LOW;
  };

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time social media threat monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-5 hover:shadow-md transition-shadow" data-testid={`stat-card-${index}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold">{stat.value}</h3>
                    {stat.total && <span className="text-sm text-muted-foreground">/ {stat.total}</span>}
                  </div>
                  {stat.trend && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.trend} from last week
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-md ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Alerts */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold">Active Alerts</h2>
          <span className="text-sm text-muted-foreground">{recentAlerts.length} active</span>
        </div>
        {recentAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="no-alerts">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No active alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAlerts.map((alert, index) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-3 border border-border rounded-md hover:bg-accent transition-colors"
                data-testid={`alert-item-${index}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRiskBadge(alert.risk_level)}`}>
                      {alert.risk_level}
                    </span>
                    <span className="text-xs text-muted-foreground">{alert.platform.toUpperCase()}</span>
                  </div>
                  <h3 className="font-medium text-sm">{alert.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">From: {alert.author}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Risk Distribution */}
      {overview?.risk_distribution && overview.risk_distribution.length > 0 && (
        <Card className="p-5">
          <h2 className="text-xl font-heading font-semibold mb-4">Risk Distribution</h2>
          <div className="grid grid-cols-3 gap-4">
            {overview.risk_distribution.map((item, index) => (
              <div key={index} className="text-center p-4 border border-border rounded-md">
                <div className={`text-2xl font-bold ${item._id === 'HIGH' ? 'text-red-600' : item._id === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'}`}>
                  {item.count}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{item._id} Risk</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
