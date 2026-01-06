import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { AlertTriangle, CheckCircle, Flag, XCircle } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [activeTab]);

  const fetchAlerts = async () => {
    try {
      const params = activeTab !== 'all' ? { status_filter: activeTab } : {};
      const response = await api.get('/alerts', { params });
      setAlerts(response.data);
    } catch (error) {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (alertId, status) => {
    try {
      await api.put(`/alerts/${alertId}`, { status, notes });
      toast.success(`Alert ${status}`);
      setDialogOpen(false);
      setNotes('');
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  const openActionDialog = (alert) => {
    setSelectedAlert(alert);
    setNotes(alert.notes || '');
    setDialogOpen(true);
  };

  const getRiskBadge = (level) => {
    const styles = {
      HIGH: 'bg-red-100 text-red-700 border-red-200',
      MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200'
    };
    return styles[level];
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6" data-testid="alerts-page">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Alerts Center</h1>
        <p className="text-muted-foreground mt-1">Manage and respond to threat alerts</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="alerts-tabs">
          <TabsTrigger value="active" data-testid="tab-active">Active</TabsTrigger>
          <TabsTrigger value="acknowledged" data-testid="tab-acknowledged">Acknowledged</TabsTrigger>
          <TabsTrigger value="escalated" data-testid="tab-escalated">Escalated</TabsTrigger>
          <TabsTrigger value="false_positive" data-testid="tab-false-positive">False Positive</TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {alerts.length === 0 ? (
            <Card className="p-12 text-center" data-testid="no-alerts">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No {activeTab !== 'all' ? activeTab : ''} alerts</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <Card key={alert.id} className="p-5 hover:shadow-md transition-shadow" data-testid={`alert-card-${index}`}>
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-2 rounded-md ${alert.risk_level === 'HIGH' ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <AlertTriangle className={`h-5 w-5 ${alert.risk_level === 'HIGH' ? 'text-red-600' : 'text-amber-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRiskBadge(alert.risk_level)}`}>
                          {alert.risk_level} RISK
                        </span>
                        <span className="text-xs text-muted-foreground">{alert.platform?.toUpperCase()}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                      <h3 className="font-semibold mb-1">{alert.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">From:</span>
                        <span className="font-medium">{alert.author}</span>
                        <span className="text-muted-foreground">•</span>
                        <a href={alert.content_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          View Content
                        </a>
                      </div>
                      {alert.notes && (
                        <div className="mt-3 p-3 bg-muted rounded-md">
                          <p className="text-xs font-medium mb-1">Notes:</p>
                          <p className="text-xs text-muted-foreground">{alert.notes}</p>
                        </div>
                      )}
                    </div>
                    {alert.status === 'active' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(alert)}
                          data-testid={`action-btn-${index}`}
                        >
                          Take Action
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert Action</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">{selectedAlert.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedAlert.description}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this alert..."
                  rows={3}
                  data-testid="notes-textarea"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'acknowledged')}
                  className="flex items-center gap-2"
                  data-testid="acknowledge-btn"
                >
                  <CheckCircle className="h-4 w-4" />
                  Acknowledge
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'escalated')}
                  variant="destructive"
                  className="flex items-center gap-2"
                  data-testid="escalate-btn"
                >
                  <Flag className="h-4 w-4" />
                  Escalate
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'false_positive')}
                  variant="outline"
                  className="flex items-center gap-2"
                  data-testid="false-positive-btn"
                >
                  <XCircle className="h-4 w-4" />
                  False Positive
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
//fejnf
export default Alerts;
