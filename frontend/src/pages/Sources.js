import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Plus, Pencil, Trash2, Youtube, Twitter, Instagram, Facebook } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';

const Sources = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [formData, setFormData] = useState({
    platform: 'youtube',
    identifier: '',
    display_name: '',
    category: 'unknown',
    is_active: true
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const response = await api.get('/sources');
      setSources(response.data);
    } catch (error) {
      toast.error('Failed to load sources');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSource) {
        await api.put(`/sources/${editingSource.id}`, formData);
        toast.success('Source updated successfully');
      } else {
        await api.post('/sources', formData);
        toast.success('Source created successfully');
      }
      setDialogOpen(false);
      fetchSources();
      resetForm();
    } catch (error) {
      toast.error(editingSource ? 'Failed to update source' : 'Failed to create source');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this source?')) {
      try {
        await api.delete(`/sources/${id}`);
        toast.success('Source deleted successfully');
        fetchSources();
      } catch (error) {
        toast.error('Failed to delete source');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      platform: 'youtube',
      identifier: '',
      display_name: '',
      category: 'unknown',
      is_active: true
    });
    setEditingSource(null);
  };

  const openEditDialog = (source) => {
    setEditingSource(source);
    setFormData({
      platform: source.platform,
      identifier: source.identifier,
      display_name: source.display_name,
      category: source.category,
      is_active: source.is_active
    });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6" data-testid="sources-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Sources</h1>
          <p className="text-muted-foreground mt-1">Manage YouTube, X, Instagram, and Facebook accounts to monitor</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} data-testid="add-source-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSource ? 'Edit Source' : 'Add New Source'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="source-form">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={formData.platform} onValueChange={(value) => setFormData({...formData, platform: value})}>
                  <SelectTrigger data-testid="platform-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="x">X (Twitter)</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Identifier ({formData.platform === 'youtube' ? 'Channel ID' : 'Username'})</Label>
                <Input
                  value={formData.identifier}
                  onChange={(e) => setFormData({...formData, identifier: e.target.value})}
                  placeholder={formData.platform === 'youtube' ? 'UCxxxxxx' : '@username'}
                  required
                  data-testid="identifier-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                  placeholder="Channel/Account Name"
                  required
                  data-testid="display-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger data-testid="category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="influencer">Influencer</SelectItem>
                    <SelectItem value="political">Political</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active Monitoring</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  data-testid="active-switch"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" data-testid="save-source-btn">
                  {editingSource ? 'Update' : 'Add'} Source
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sources.length === 0 ? (
        <Card className="p-12 text-center" data-testid="no-sources">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">No sources configured</p>
            <p className="text-sm">Add your first source to start monitoring</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source, index) => (
            <Card key={source.id} className="p-5" data-testid={`source-card-${index}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-md ${
                    source.platform === 'youtube' ? 'bg-red-100 text-red-600' :
                    source.platform === 'x' ? 'bg-black/10 text-black' :
                    source.platform === 'instagram' ? 'bg-pink-100 text-pink-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {source.platform === 'youtube' && <Youtube className="h-5 w-5" />}
                    {source.platform === 'x' && <Twitter className="h-5 w-5" />}
                    {source.platform === 'instagram' && <Instagram className="h-5 w-5" />}
                    {source.platform === 'facebook' && <Facebook className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{source.display_name}</h3>
                    <p className="text-xs text-muted-foreground">{source.identifier}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(source)} data-testid={`edit-btn-${index}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(source.id)} data-testid={`delete-btn-${index}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${source.category === 'political' ? 'bg-purple-100 text-purple-700' : source.category === 'news' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                  {source.category}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${source.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {source.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {source.last_checked && (
                <p className="text-xs text-muted-foreground mt-2">Last checked: {new Date(source.last_checked).toLocaleString()}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sources;
