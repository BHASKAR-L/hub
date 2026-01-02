import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Save, Plus, Trash2, Key } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState({ category: 'violence', keyword: '' });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, keywordsRes] = await Promise.all([
        api.get('/settings'),
        api.get('/keywords')
      ]);
      setSettings(settingsRes.data);
      setKeywords(keywordsRes.data);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings', settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleAddKeyword = async (e) => {
    e.preventDefault();
    try {
      await api.post('/keywords', newKeyword);
      toast.success('Keyword added successfully');
      setDialogOpen(false);
      setNewKeyword({ category: 'violence', keyword: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to add keyword');
    }
  };

  const handleDeleteKeyword = async (id) => {
    try {
      await api.delete(`/keywords/${id}`);
      toast.success('Keyword deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete keyword');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure monitoring and alert parameters</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
          <TabsTrigger value="api" data-testid="tab-api">API Keys</TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">Email Alerts</TabsTrigger>
          <TabsTrigger value="keywords" data-testid="tab-keywords">Keywords</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="p-6">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <h2 className="text-lg font-heading font-semibold mb-4">Risk Thresholds</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>High Risk Threshold (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings?.risk_threshold_high || 70}
                    onChange={(e) => setSettings({...settings, risk_threshold_high: parseInt(e.target.value)})}
                    data-testid="high-threshold-input"
                  />
                  <p className="text-xs text-muted-foreground">Scores above this trigger HIGH alerts</p>
                </div>
                <div className="space-y-2">
                  <Label>Medium Risk Threshold (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings?.risk_threshold_medium || 40}
                    onChange={(e) => setSettings({...settings, risk_threshold_medium: parseInt(e.target.value)})}
                    data-testid="medium-threshold-input"
                  />
                  <p className="text-xs text-muted-foreground">Scores above this trigger MEDIUM alerts</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Monitoring Interval (minutes)</Label>
                <Input
                  type="number"
                  min="5"
                  max="1440"
                  value={settings?.monitoring_interval_minutes || 15}
                  onChange={(e) => setSettings({...settings, monitoring_interval_minutes: parseInt(e.target.value)})}
                  data-testid="interval-input"
                />
                <p className="text-xs text-muted-foreground">How often to check sources (recommended: 15-30 minutes)</p>
              </div>
              <Button type="submit" data-testid="save-general-btn">
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <Card className="p-6">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Key className="h-5 w-5" />
                <h2 className="text-lg font-heading font-semibold">API Credentials</h2>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Need help?</strong> Check <code>/app/API_SETUP_GUIDE.md</code> for detailed instructions on obtaining API keys.
                </p>
              </div>
              <div className="space-y-2">
                <Label>YouTube Data API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter YouTube API key"
                  value={settings?.youtube_api_key || ''}
                  onChange={(e) => setSettings({...settings, youtube_api_key: e.target.value})}
                  data-testid="youtube-api-key-input"
                />
              </div>
              <div className="space-y-2">
                <Label>X (Twitter) Bearer Token</Label>
                <Input
                  type="password"
                  placeholder="Enter X Bearer Token"
                  value={settings?.x_bearer_token || ''}
                  onChange={(e) => setSettings({...settings, x_bearer_token: e.target.value})}
                  data-testid="x-bearer-token-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Facebook/Instagram Access Token</Label>
                <Input
                  type="password"
                  placeholder="Enter Facebook Graph API Token"
                  value={settings?.facebook_access_token || ''}
                  onChange={(e) => setSettings({...settings, facebook_access_token: e.target.value})}
                  data-testid="facebook-token-input"
                />
              </div>
              <Button type="submit" data-testid="save-api-btn">
                <Save className="h-4 w-4 mr-2" />
                Save API Keys
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <Card className="p-6">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <h2 className="text-lg font-heading font-semibold mb-4">Email Alert Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Admin Email</Label>
                  <Input
                    type="email"
                    value={settings?.alert_email_admin || ''}
                    onChange={(e) => setSettings({...settings, alert_email_admin: e.target.value})}
                    data-testid="admin-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Police/Authority Email</Label>
                  <Input
                    type="email"
                    value={settings?.alert_email_police || ''}
                    onChange={(e) => setSettings({...settings, alert_email_police: e.target.value})}
                    data-testid="police-email-input"
                  />
                </div>
              </div>
              <h3 className="text-md font-semibold mt-6 mb-2">SMTP Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input
                    value={settings?.smtp_host || ''}
                    onChange={(e) => setSettings({...settings, smtp_host: e.target.value})}
                    placeholder="smtp.gmail.com"
                    data-testid="smtp-host-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input
                    type="number"
                    value={settings?.smtp_port || 587}
                    onChange={(e) => setSettings({...settings, smtp_port: parseInt(e.target.value)})}
                    data-testid="smtp-port-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input
                    value={settings?.smtp_username || ''}
                    onChange={(e) => setSettings({...settings, smtp_username: e.target.value})}
                    placeholder="your-email@gmail.com"
                    data-testid="smtp-username-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <Input
                    type="password"
                    value={settings?.smtp_password || ''}
                    onChange={(e) => setSettings({...settings, smtp_password: e.target.value})}
                    placeholder="App password"
                    data-testid="smtp-password-input"
                  />
                </div>
              </div>
              <Button type="submit" data-testid="save-email-btn">
                <Save className="h-4 w-4 mr-2" />
                Save Email Settings
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold">Keyword Management</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-keyword-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Keyword
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Keyword</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddKeyword} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newKeyword.category} onValueChange={(value) => setNewKeyword({...newKeyword, category: value})}>
                        <SelectTrigger data-testid="keyword-category-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="violence">Violence</SelectItem>
                          <SelectItem value="threat">Threat</SelectItem>
                          <SelectItem value="hate">Hate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Keyword</Label>
                      <Input
                        value={newKeyword.keyword}
                        onChange={(e) => setNewKeyword({...newKeyword, keyword: e.target.value})}
                        placeholder="Enter keyword"
                        required
                        data-testid="keyword-input"
                      />
                    </div>
                    <Button type="submit" data-testid="submit-keyword-btn">Add Keyword</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-3">
              {['violence', 'threat', 'hate'].map(category => (
                <div key={category}>
                  <h3 className="text-sm font-semibold capitalize mb-2">{category} Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {keywords.filter(k => k.category === category).map(keyword => (
                      <div key={keyword.id} className="inline-flex items-center gap-2 bg-secondary px-3 py-1 rounded-md border">
                        <span className="text-sm">{keyword.keyword}</span>
                        <button onClick={() => handleDeleteKeyword(keyword.id)} className="text-destructive hover:text-destructive/80" data-testid={`delete-keyword-${keyword.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
