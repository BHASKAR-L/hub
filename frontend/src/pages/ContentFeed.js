import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { ExternalLink, Filter, Search } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const ContentFeed = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: 'all',
    risk_level: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchContent();
  }, [filters]);

  const fetchContent = async () => {
    try {
      const params = {};
      if (filters.platform && filters.platform !== 'all') params.platform = filters.platform;
      if (filters.risk_level && filters.risk_level !== 'all') params.risk_level = filters.risk_level;
      const response = await api.get('/content', { params });
      setContent(response.data);
    } catch (error) {
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (level) => {
    const styles = {
      HIGH: 'bg-red-100 text-red-700 border-red-200',
      MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
      LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
    return styles[level] || styles.LOW;
  };

  const filteredContent = content.filter(item => 
    searchTerm === '' || 
    item.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.author?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6" data-testid="content-feed-page">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Content Feed</h1>
        <p className="text-muted-foreground mt-1">Live monitored content from all sources</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
          </div>
          <Select value={filters.platform} onValueChange={(value) => setFilters({...filters, platform: value})}>
            <SelectTrigger className="w-[150px]" data-testid="platform-filter">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="x">X (Twitter)</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.risk_level} onValueChange={(value) => setFilters({...filters, risk_level: value})}>
            <SelectTrigger className="w-[150px]" data-testid="risk-filter">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Content List */}
      {filteredContent.length === 0 ? (
        <Card className="p-12 text-center" data-testid="no-content">
          <p className="text-muted-foreground">No content found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContent.map((item, index) => (
            <Card key={item.id} className="p-5 hover:shadow-md transition-shadow" data-testid={`content-item-${index}`}>
              <div className="flex items-start gap-4">
                <div className={`w-1 h-full rounded-full ${item.analysis?.risk_level === 'HIGH' ? 'bg-red-500' : item.analysis?.risk_level === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {item.analysis?.risk_level && (
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRiskBadge(item.analysis.risk_level)}`}>
                        {item.analysis.risk_level}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{item.platform?.toUpperCase()}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.published_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{item.author}</h3>
                      <p className="text-xs text-muted-foreground">@{item.author_handle}</p>
                    </div>
                    <a
                      href={item.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-sm"
                      data-testid={`view-link-${index}`}
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-sm text-foreground line-clamp-3">{item.text}</p>
                  {item.analysis && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-xs font-medium mb-1">Analysis:</p>
                      <p className="text-xs text-muted-foreground">{item.analysis.explanation}</p>
                      {item.analysis.triggered_keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.analysis.triggered_keywords.map((keyword, idx) => (
                            <span key={idx} className="text-xs bg-background px-2 py-0.5 rounded border">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <span>Views: {item.engagement?.views?.toLocaleString() || 0}</span>
                    <span>Likes: {item.engagement?.likes?.toLocaleString() || 0}</span>
                    {item.engagement?.retweets && <span>Retweets: {item.engagement.retweets.toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentFeed;
