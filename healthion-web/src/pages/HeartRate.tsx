import { PageHeader, PageHeaderHeading } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useWearableTimeseries } from "@/hooks/use-wearables";
import { Heart, RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useState, useMemo } from "react";

function HeartRateChart({ data }: { data: { timestamp: string; value: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p>No heart rate data available</p>
      </div>
    );
  }

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  
  const width = 100;
  const height = 40;
  const padding = 2;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((d.value - minVal) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const avgValue = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium">Heart Rate</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Avg: <span className="font-semibold text-foreground">{avgValue} bpm</span>
          </span>
          <span className="text-muted-foreground">
            Range: <span className="font-semibold text-foreground">{minVal}-{maxVal} bpm</span>
          </span>
        </div>
      </div>
      
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-48 bg-gradient-to-b from-red-50 to-white dark:from-red-950/30 dark:to-background rounded-lg border"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            y1={height - padding - ratio * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - ratio * (height - 2 * padding)}
            stroke="currentColor"
            className="text-border"
            strokeWidth="0.2"
          />
        ))}
        
        {/* Area fill */}
        <polygon
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
          fill="url(#heartRateGradient)"
          opacity="0.3"
        />
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#ef4444"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <defs>
          <linearGradient id="heartRateGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data.length > 0 ? new Date(data[0].timestamp).toLocaleString() : ''}</span>
        <span>{data.length > 0 ? new Date(data[data.length - 1].timestamp).toLocaleString() : ''}</span>
      </div>
    </div>
  );
}

export default function HeartRate() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Default to last 7 days
  const [daysBack, setDaysBack] = useState(7);
  const [resolution, setResolution] = useState<'raw' | '1min' | '5min' | '15min' | '1hour'>('5min');
  
  const timeRange = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);
    return {
      start_time: startDate.toISOString(),
      end_time: now.toISOString(),
    };
  }, [daysBack]);

  const {
    data: heartRateData,
    loading: heartRateLoading,
    error: heartRateError,
    refresh: refreshHeartRate,
  } = useWearableTimeseries({
    types: ['heart_rate'],
    ...timeRange,
    limit: 100,
    resolution,
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (heartRateData.length === 0) return null;
    const values = heartRateData.map(d => d.value);
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }, [heartRateData]);

  if (authLoading) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Heart Rate</PageHeaderHeading>
        </PageHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Heart Rate</PageHeaderHeading>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view heart rate data.</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Heart Rate</PageHeaderHeading>
      </PageHeader>
      
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Adjust the time range and resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Time Range</label>
                <Select value={daysBack.toString()} onValueChange={(v) => setDaysBack(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 24 Hours</SelectItem>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="14">Last 14 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Resolution</label>
                <Select value={resolution} onValueChange={(v) => setResolution(v as typeof resolution)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw">Raw</SelectItem>
                    <SelectItem value="1min">1 Minute</SelectItem>
                    <SelectItem value="5min">5 Minutes</SelectItem>
                    <SelectItem value="15min">15 Minutes</SelectItem>
                    <SelectItem value="1hour">1 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => refreshHeartRate()} className="w-full" disabled={heartRateLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${heartRateLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Heart rate statistics for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.avg}</p>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Activity className="h-4 w-4" />
                    Average BPM
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.min}</p>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    Minimum BPM
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.max}</p>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Maximum BPM
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.count}</p>
                  <p className="text-sm text-muted-foreground">Data Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Heart Rate Chart
                </CardTitle>
                <CardDescription>Visual representation of your heart rate</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {heartRateError && (
              <div className="text-center py-4 text-red-600 dark:text-red-400">
                <p>{heartRateError}</p>
              </div>
            )}
            {heartRateLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <HeartRateChart data={heartRateData} />
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Measurements</CardTitle>
            <CardDescription>Individual heart rate data points</CardDescription>
          </CardHeader>
          <CardContent>
            {heartRateLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border rounded">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : heartRateData.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {heartRateData.slice(0, 50).map((measurement, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 border rounded hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="font-medium">{measurement.value} BPM</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(measurement.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
                {heartRateData.length > 50 && (
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    Showing 50 of {heartRateData.length} measurements
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No heart rate data available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Connect a device and sync to see heart rate data
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
