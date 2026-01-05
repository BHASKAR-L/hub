import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../lib/api';
import {
  Plus, Pencil, Trash2, Youtube, Twitter, Instagram, Facebook,
  ExternalLink, Play, Pause, RefreshCw, Search, Filter, Clock,
  Eye, BarChart3, Activity, Shield, Globe, MoreVertical,
  CheckCircle, AlertCircle, Sparkles, TrendingUp, Target, X,
  ChevronLeft, ChevronRight, ArrowUpDown, Download, Zap,
  Radio, Wifi, WifiOff, Settings2, LayoutGrid, List, SlidersHorizontal
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';

// Skeleton Loading Component
const SourceCardSkeleton = () => (
  <Card className="overflow-hidden border border-border/50">
    <div className="h-1 bg-muted" />
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </CardContent>
  </Card>
);

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div></div></TableCell>
    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><div className="flex gap-2 justify-end"><Skeleton className="h-9 w-9 rounded-md" /><Skeleton className="h-9 w-9 rounded-md" /><Skeleton className="h-9 w-9 rounded-md" /></div></TableCell>
  </TableRow>
);

// Stats Mini Card Component
const StatCard = ({ label, value, icon: Icon, trend, trendValue, color, description }) => (
  <Card className="group relative overflow-hidden border border-border/50 bg-card hover:shadow-lg hover:border-border transition-all duration-300">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && (
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {trendValue}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Active Filter Chip Component
const FilterChip = ({ label, onRemove }) => (
  <Badge variant="secondary" className="gap-1.5 pl-3 pr-1.5 py-1 text-xs font-medium bg-primary/10 text-primary border-0 hover:bg-primary/20">
    {label}
    <button onClick={onRemove} className="ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors">
      <X className="h-3 w-3" />
    </button>
  </Badge>
);

const Sources = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [sortConfig, setSortConfig] = useState({ key: 'display_name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const itemsPerPage = 12;

  const [formData, setFormData] = useState({
    platform: 'youtube',
    identifier: '',
    display_name: '',
    category: 'unknown',
    is_active: true,
    priority: 'medium'
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async (showRefreshState = false) => {
    try {
      if (showRefreshState) setIsRefreshing(true);
      else setLoading(true);
      const response = await api.get('/sources');
      setSources(response.data);
    } catch (error) {
      toast.error('Failed to load sources', {
        description: 'Please check your connection and try again.'
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSource) {
        await api.put(`/sources/${editingSource.id}`, formData);
        toast.success('Source updated successfully', {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />
        });
      } else {
        await api.post('/sources', formData);
        toast.success('Source created successfully', {
          icon: <Sparkles className="h-4 w-4 text-amber-500" />
        });
      }
      setDialogOpen(false);
      fetchSources();
      resetForm();
    } catch (error) {
      toast.error(editingSource ? 'Failed to update source' : 'Failed to create source');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/sources/${id}`);
      toast.success('Source removed successfully', {
        description: 'The source has been permanently deleted.'
      });
      setDeleteConfirmId(null);
      fetchSources();
    } catch (error) {
      toast.error('Failed to delete source');
    }
  };

  const confirmDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const handleToggleActive = async (source) => {
    try {
      await api.put(`/sources/${source.id}`, { ...source, is_active: !source.is_active });
      toast.success(source.is_active ? 'Monitoring paused' : 'Monitoring resumed', {
        description: source.display_name
      });
      fetchSources();
    } catch (error) {
      toast.error('Failed to update source status');
    }
  };

  const handleManualCheck = async (id) => {
    try {
      toast.info('Initiating manual check...', {
        description: 'This may take a few moments.'
      });
      await api.post(`/sources/${id}/check`);
      toast.success('Manual check completed', {
        description: 'Source has been scanned and activity logged.'
      });
      fetchSources();
    } catch (error) {
      toast.error('Failed to perform manual check');
    }
  };

  const handleBulkActivate = async (activate = true) => {
    try {
      const filteredIds = filteredSources.map(s => s.id);
      await Promise.all(filteredIds.map(id =>
        api.put(`/sources/${id}`, { is_active: activate })
      ));
      toast.success(`${activate ? 'Activated' : 'Paused'} ${filteredIds.length} sources`);
      fetchSources();
    } catch (error) {
      toast.error('Failed to update sources');
    }
  };

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setPlatformFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = searchQuery || platformFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all';

  const resetForm = () => {
    setFormData({
      platform: 'youtube',
      identifier: '',
      display_name: '',
      category: 'unknown',
      is_active: true,
      priority: 'medium'
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
      is_active: source.is_active,
      priority: source.priority || 'medium'
    });
    setDialogOpen(true);
  };

  const getSourceLink = (source) => {
    switch (source.platform) {
      case 'youtube':
        return source.identifier.startsWith('@')
          ? `https://youtube.com/${source.identifier}`
          : `https://youtube.com/channel/${source.identifier}`;
      case 'x':
        return `https://x.com/${source.identifier.replace('@', '')}`;
      case 'instagram':
        return `https://instagram.com/${source.identifier.replace('@', '')}`;
      case 'facebook':
        return `https://facebook.com/${source.identifier.replace('@', '')}`;
      default:
        return '#';
    }
  };

  const getPlatformIcon = (platform, size = "h-4 w-4") => {
    switch (platform) {
      case 'youtube': return <Youtube className={`${size} text-red-500`} />;
      case 'x': return <Twitter className={`${size}`} />;
      case 'instagram': return <Instagram className={`${size} text-gradient-to-r from-purple-500 to-pink-500`} />;
      case 'facebook': return <Facebook className={`${size} text-blue-600`} />;
      default: return <Globe className={`${size}`} />;
    }
  };

  const getPlatformStyle = (platform) => {
    switch (platform) {
      case 'youtube': return 'from-red-50 to-red-100 border-red-200 text-red-700';
      case 'x': return 'from-gray-50 to-gray-100 border-gray-200 text-gray-800';
      case 'instagram': return 'from-purple-50 to-pink-50 border-purple-200 text-purple-700';
      case 'facebook': return 'from-blue-50 to-blue-100 border-blue-200 text-blue-700';
      default: return 'from-gray-50 to-gray-100 border-gray-200 text-gray-700';
    }
  };

  const getCategoryStyle = (category) => {
    switch (category) {
      case 'political': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'news': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'influencer': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'entertainment': return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'technology': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredSources = useMemo(() => {
    let result = sources.filter(source => {
      const matchesSearch = source.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.identifier.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || source.platform === platformFilter;
      const matchesCategory = categoryFilter === 'all' || source.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && source.is_active) ||
        (statusFilter === 'inactive' && !source.is_active);
      return matchesSearch && matchesPlatform && matchesCategory && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortConfig.key] || '';
      let bVal = b[sortConfig.key] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [sources, searchQuery, platformFilter, categoryFilter, statusFilter, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredSources.length / itemsPerPage);
  const paginatedSources = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSources.slice(start, start + itemsPerPage);
  }, [filteredSources, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, platformFilter, categoryFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: sources.length,
    active: sources.filter(s => s.is_active).length,
    inactive: sources.filter(s => !s.is_active).length,
    youtube: sources.filter(s => s.platform === 'youtube').length,
    x: sources.filter(s => s.platform === 'x').length,
    instagram: sources.filter(s => s.platform === 'instagram').length,
    facebook: sources.filter(s => s.platform === 'facebook').length,
    highPriority: sources.filter(s => s.priority === 'high').length,
    activeRate: sources.length ? Math.round((sources.filter(s => s.is_active).length / sources.length) * 100) : 0,
  }), [sources]);

  if (loading) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background p-6 md:p-8" data-testid="sources-page">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
              <div className="space-y-2">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-5 w-96" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-36" />
              </div>
            </div>
            {/* Stats Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="border border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-7 w-12" />
                      </div>
                      <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          {/* Filter Skeleton */}
          <Card className="mb-6 border border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <Skeleton className="h-10 flex-1" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <SourceCardSkeleton key={i} />)}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background" data-testid="sources-page">
        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Confirm Deletion
              </DialogTitle>
              <DialogDescription className="pt-2">
                Are you sure you want to delete this source? This action cannot be undone and all associated data will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirmId)}>
                Delete Source
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>Dashboard</span>
                  <span>/</span>
                  <span className="text-foreground font-medium">Sources</span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
                  Source Management
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Monitor and manage your social media intelligence sources
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchSources(true)}
                      disabled={isRefreshing}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sync latest data</TooltipContent>
                </Tooltip>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm} size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Source
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold">
                        {editingSource ? 'Edit Source' : 'Add New Source'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingSource
                          ? 'Update the source configuration below'
                          : 'Configure a new social media source to monitor'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Platform</Label>
                          <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                { value: 'youtube', label: 'YouTube', icon: Youtube },
                                { value: 'x', label: 'X (Twitter)', icon: Twitter },
                                { value: 'instagram', label: 'Instagram', icon: Instagram },
                                { value: 'facebook', label: 'Facebook', icon: Facebook },
                              ].map(p => (
                                <SelectItem key={p.value} value={p.value}>
                                  <div className="flex items-center gap-2">
                                    <p.icon className="h-4 w-4" />
                                    {p.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Priority</Label>
                          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-red-500" />
                                  High
                                </div>
                              </SelectItem>
                              <SelectItem value="medium">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                                  Medium
                                </div>
                              </SelectItem>
                              <SelectItem value="low">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  Low
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Channel/Account ID</Label>
                        <Input
                          value={formData.identifier}
                          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                          placeholder={formData.platform === 'youtube' ? 'UCxxxxxx or @handle' : '@username'}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter the unique identifier for this source
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Display Name</Label>
                        <Input
                          value={formData.display_name}
                          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                          placeholder="Enter a recognizable name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Category</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {['news', 'influencer', 'political', 'entertainment', 'technology', 'business', 'sports', 'unknown'].map(cat => (
                              <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-0.5">
                          <Label className="font-medium">Active Monitoring</Label>
                          <p className="text-xs text-muted-foreground">Enable real-time monitoring for this source</p>
                        </div>
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                      </div>

                      <Separator />

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className="flex-1">
                          {editingSource ? 'Save Changes' : 'Add Source'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </header>

          {/* Stats Overview - Responsive grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-6 lg:mb-8">
            <StatCard
              label="Total Sources"
              value={stats.total}
              icon={Target}
              color="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            />
            <StatCard
              label="Active"
              value={stats.active}
              icon={Wifi}
              trend="up"
              trendValue={`${stats.activeRate}%`}
              color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
            />
            <StatCard
              label="YouTube"
              value={stats.youtube}
              icon={Youtube}
              color="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
            />
            <StatCard
              label="X (Twitter)"
              value={stats.x}
              icon={Twitter}
              color="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
            />
            <StatCard
              label="Instagram"
              value={stats.instagram}
              icon={Instagram}
              color="bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400"
            />
            <StatCard
              label="High Priority"
              value={stats.highPriority}
              icon={AlertCircle}
              color="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
            />
          </div>

          {/* Filters & Controls - Mobile optimized */}
          <Card className="mb-4 lg:mb-6 border border-border/50 shadow-sm">
            <CardContent className="p-3 lg:p-4">
              <div className="flex flex-col gap-3 lg:gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 w-full">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search sources..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="grid grid-cols-3 sm:flex gap-2">
                      <Select value={platformFilter} onValueChange={setPlatformFilter}>
                        <SelectTrigger className="w-full sm:w-[130px] h-10">
                          <SelectValue placeholder="Platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Platforms</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="x">X</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-[130px] h-10">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="news">News</SelectItem>
                          <SelectItem value="influencer">Influencer</SelectItem>
                          <SelectItem value="political">Political</SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[120px] h-10">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-between sm:justify-end w-full lg:w-auto">
                    {/* View toggle - hide on mobile, force grid view */}
                    <div className="hidden sm:flex border rounded-lg p-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('grid')}
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Grid view</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('table')}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Table view</TooltipContent>
                      </Tooltip>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <SlidersHorizontal className="h-4 w-4" />
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleBulkActivate(true)}>
                          <Play className="h-4 w-4 mr-2" /> Activate All
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkActivate(false)}>
                          <Pause className="h-4 w-4 mr-2" /> Pause All
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" /> Export CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Active Filters */}
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Filters:</span>
                    {searchQuery && (
                      <FilterChip label={`"${searchQuery}"`} onRemove={() => setSearchQuery('')} />
                    )}
                    {platformFilter !== 'all' && (
                      <FilterChip label={platformFilter} onRemove={() => setPlatformFilter('all')} />
                    )}
                    {categoryFilter !== 'all' && (
                      <FilterChip label={categoryFilter} onRemove={() => setCategoryFilter('all')} />
                    )}
                    {statusFilter !== 'all' && (
                      <FilterChip label={statusFilter} onRemove={() => setStatusFilter('all')} />
                    )}
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{paginatedSources.length}</span> of{' '}
              <span className="font-medium text-foreground">{filteredSources.length}</span> sources
              {hasActiveFilters && ` (filtered from ${sources.length} total)`}
            </p>
          </div>

          {/* Content */}
          {filteredSources.length === 0 ? (
            <Card className="border border-dashed border-border bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No sources found</h3>
                <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">
                  {sources.length === 0
                    ? 'Get started by adding your first social media source to monitor.'
                    : 'Try adjusting your search or filter criteria to find what you\'re looking for.'}
                </p>
                {sources.length === 0 ? (
                  <Button onClick={() => setDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Source
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (viewMode === 'grid' || window.innerWidth < 640) ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                {paginatedSources.map((source) => (
                  <Card
                    key={source.id}
                    className="group overflow-hidden border border-border/50 hover:border-border hover:shadow-md transition-all duration-200"
                  >
                    <div className={`h-1 ${source.is_active
                      ? 'bg-emerald-500'
                      : 'bg-muted'}`}
                    />
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`shrink-0 p-2.5 rounded-xl bg-muted/80 border border-border/50`}>
                              {getPlatformIcon(source.platform, "h-5 w-5")}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm truncate" title={source.display_name}>
                                {source.display_name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="truncate font-mono">{source.identifier}</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={getSourceLink(source)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 hover:text-primary transition-colors"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>Open in new tab</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openEditDialog(source)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(source)}>
                                {source.is_active ? (
                                  <><Pause className="h-4 w-4 mr-2" /> Pause</>
                                ) : (
                                  <><Play className="h-4 w-4 mr-2" /> Resume</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={getSourceLink(source)} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" /> View Profile
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => confirmDelete(source.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className={`${getCategoryStyle(source.category)} text-xs font-medium`}>
                            {source.category}
                          </Badge>
                          <Badge variant="outline" className={`${getPriorityStyle(source.priority)} text-xs font-medium`}>
                            {source.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${source.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-muted text-muted-foreground border-border'}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${source.is_active
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-muted-foreground'}`}
                            />
                            {source.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>

                        {/* Last Checked */}
                        {source.last_checked && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>Last scan {formatDistanceToNow(new Date(source.last_checked), { addSuffix: true })}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="pt-3 border-t border-border/50 flex gap-2">
                          <Button
                            variant={source.is_active ? "outline" : "default"}
                            size="sm"
                            className="flex-1 text-xs font-medium"
                            onClick={() => handleToggleActive(source)}
                          >
                            {source.is_active ? (
                              <><Pause className="h-3.5 w-3.5 mr-1.5" /> Pause</>
                            ) : (
                              <><Play className="h-3.5 w-3.5 mr-1.5" /> Resume</>
                            )}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 text-xs font-medium"
                            onClick={() => handleManualCheck(source.id)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Check
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination - Mobile optimized */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-border/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-9 min-w-[40px] sm:min-w-[80px]"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <div className="hidden sm:flex items-center gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            size="sm"
                            className="w-9 h-9 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    {/* Mobile page indicator */}
                    <span className="sm:hidden text-xs font-medium px-2">{currentPage} / {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-9 min-w-[40px] sm:min-w-[80px]"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card className="overflow-hidden border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">
                      <Button variant="ghost" size="sm" className="h-8 -ml-3 gap-1" onClick={() => handleSort('display_name')}>
                        Source
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold">Platform</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Priority</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">
                      <Button variant="ghost" size="sm" className="h-8 -ml-3 gap-1" onClick={() => handleSort('last_checked')}>
                        Last Checked
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSources.map((source) => (
                    <TableRow key={source.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted/80 border border-border/50">
                            {getPlatformIcon(source.platform)}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{source.display_name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="font-mono">{source.identifier}</span>
                              <a
                                href={getSourceLink(source)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium capitalize text-xs">
                          {source.platform === 'x' ? 'X' : source.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getCategoryStyle(source.category)} text-xs font-medium capitalize`}>
                          {source.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getPriorityStyle(source.priority)} text-xs font-medium capitalize`}>
                          {source.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium ${source.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-muted text-muted-foreground border-border'}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${source.is_active
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-muted-foreground'}`}
                          />
                          {source.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {source.last_checked ? (
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDistanceToNow(new Date(source.last_checked), { addSuffix: true })}
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(source.last_checked), 'PPpp')}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground/60">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleManualCheck(source.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Check Now</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleToggleActive(source)}
                              >
                                {source.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{source.is_active ? 'Pause' : 'Resume'}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditDialog(source)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:text-destructive"
                                onClick={() => confirmDelete(source.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredSources.length)} of {filteredSources.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sources;