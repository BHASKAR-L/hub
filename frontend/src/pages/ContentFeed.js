import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { ExternalLink, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const ContentFeed = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: 'all',
    risk_level: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

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

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getRiskBadge = (level) => {
    const styles = {
      HIGH: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
      MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
      LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
    };
    return styles[level] || styles.LOW;
  };

  const filteredContent = content.filter(item =>
    searchTerm === '' ||
    item.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.author?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6" data-testid="content-feed-page">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight">Content Feed</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Live monitored content from all sources</p>
      </div>

      {/* Filters - Stack on mobile */}
      <Card className="p-3 lg:p-4">
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 lg:h-11"
                data-testid="search-input"
              />
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Select value={filters.platform} onValueChange={(value) => setFilters({ ...filters, platform: value })}>
              <SelectTrigger className="w-full sm:w-[140px] h-10 lg:h-11" data-testid="platform-filter">
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
            <Select value={filters.risk_level} onValueChange={(value) => setFilters({ ...filters, risk_level: value })}>
              <SelectTrigger className="w-full sm:w-[130px] h-10 lg:h-11" data-testid="risk-filter">
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
        </div>
      </Card>

      {/* Content List */}
      {filteredContent.length === 0 ? (
        <Card className="p-8 lg:p-12 text-center" data-testid="no-content">
          <p className="text-muted-foreground text-sm lg:text-base">No content found</p>
        </Card>
      ) : (
        <div className="space-y-3 lg:space-y-4">
          {filteredContent.map((item, index) => {
            const isExpanded = expandedItems[item.id];

            return (
              <Card key={item.id} className="p-4 lg:p-5 hover:shadow-md transition-shadow" data-testid={`content-item-${index}`}>
                <div className="flex gap-3 lg:gap-4">
                  {/* Risk indicator bar */}
                  <div className={`w-1 rounded-full flex-shrink-0 ${item.analysis?.risk_level === 'HIGH' ? 'bg-red-500' :
                      item.analysis?.risk_level === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}></div>

                  <div className="flex-1 min-w-0 space-y-2 lg:space-y-3">
                    {/* Meta info */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.analysis?.risk_level && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] lg:text-xs font-semibold ${getRiskBadge(item.analysis.risk_level)}`}>
                          {item.analysis.risk_level}
                        </span>
                      )}
                      <span className="text-[10px] lg:text-xs text-muted-foreground">{item.platform?.toUpperCase()}</span>
                      <span className="text-[10px] lg:text-xs text-muted-foreground">•</span>
                      <span className="text-[10px] lg:text-xs text-muted-foreground">{new Date(item.published_at).toLocaleDateString()}</span>
                    </div>

                    {/* Author & Link */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm lg:text-base truncate">{item.author}</h3>
                        <p className="text-[10px] lg:text-xs text-muted-foreground truncate">@{item.author_handle}</p>
                      </div>
                      <a
                        href={item.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-xs lg:text-sm flex-shrink-0 min-h-[32px] px-2"
                        data-testid={`view-link-${index}`}
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Content text */}
                    <p className={`text-xs lg:text-sm text-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>{item.text}</p>

                    {/* Analysis section - Collapsible on mobile */}
                    {item.analysis && (
                      <div className="space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(item.id)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground lg:hidden"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Hide Analysis
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Show Analysis
                            </>
                          )}
                        </Button>

                        <div className={`lg:block ${isExpanded ? 'block' : 'hidden'}`}>
                          <div className="p-3 bg-muted rounded-md space-y-2 lg:space-y-3">
                            <div>
                              <p className="text-[10px] lg:text-xs font-medium mb-1">Analysis:</p>
                              <p className="text-[10px] lg:text-xs text-muted-foreground">{item.analysis.explanation}</p>
                            </div>

                            {/* Scores grid */}
                            <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-border/50">
                              <div className="flex flex-col items-center p-1.5 lg:p-2 bg-background rounded">
                                <span className="text-[8px] lg:text-[10px] uppercase text-muted-foreground">Violence</span>
                                <span className={`text-xs lg:text-sm font-bold ${item.analysis.violence_score > 50 ? 'text-red-600' : 'text-foreground'}`}>
                                  {item.analysis.violence_score}%
                                </span>
                              </div>
                              <div className="flex flex-col items-center p-1.5 lg:p-2 bg-background rounded">
                                <span className="text-[8px] lg:text-[10px] uppercase text-muted-foreground">Threat</span>
                                <span className={`text-xs lg:text-sm font-bold ${item.analysis.threat_score > 50 ? 'text-red-600' : 'text-foreground'}`}>
                                  {item.analysis.threat_score}%
                                </span>
                              </div>
                              <div className="flex flex-col items-center p-1.5 lg:p-2 bg-background rounded">
                                <span className="text-[8px] lg:text-[10px] uppercase text-muted-foreground">Hate</span>
                                <span className={`text-xs lg:text-sm font-bold ${item.analysis.hate_score > 50 ? 'text-red-600' : 'text-foreground'}`}>
                                  {item.analysis.hate_score}%
                                </span>
                              </div>
                            </div>

                            {item.analysis.triggered_keywords?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.analysis.triggered_keywords.map((keyword, idx) => (
                                  <span key={idx} className="text-[10px] lg:text-xs bg-background px-2 py-0.5 rounded border">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Engagement stats */}
                    <div className="flex gap-3 lg:gap-4 text-[10px] lg:text-xs text-muted-foreground pt-1">
                      <span>Views: {item.engagement?.views?.toLocaleString() || 0}</span>
                      <span>Likes: {item.engagement?.likes?.toLocaleString() || 0}</span>
                      {item.engagement?.retweets && <span>Retweets: {item.engagement.retweets.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
//testing comment

export default ContentFeed;
