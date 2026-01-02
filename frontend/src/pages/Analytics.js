import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';

const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [overviewRes, trendsRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/trends?days=7')
      ]);
      setOverview(overviewRes.data);
      setTrends(trendsRes.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Insights and trends from monitored content</p>
      </div>

      {/* Risk Distribution */}
      {overview?.risk_distribution && (
        <Card className="p-6">
          <h2 className="text-xl font-heading font-semibold mb-4">Risk Distribution</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overview.risk_distribution.map(item => ({ name: item._id, value: item.count }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {overview.risk_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Content Trend */}
      {trends?.content_trend && trends.content_trend.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-heading font-semibold mb-4">Content Monitoring Trend (Last 7 Days)</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.content_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Content Items" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Sources</h3>
          <p className="text-3xl font-bold">{overview?.total_sources || 0}</p>
          <p className="text-sm text-green-600 mt-1">{overview?.active_sources || 0} active</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Content</h3>
          <p className="text-3xl font-bold">{overview?.total_content || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Monitored items</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Alerts</h3>
          <p className="text-3xl font-bold">{overview?.active_alerts || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Require attention</p>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
