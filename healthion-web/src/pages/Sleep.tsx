import { PageHeader, PageHeaderHeading } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useSleepSessions, useSleepSummary } from "@/hooks/use-wearables";
import { Moon, Clock, Calendar, RefreshCw, Heart, TrendingUp } from "lucide-react";
import type { SleepSession, SleepSummary } from "@/lib/api";

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function SleepSessionCard({ session }: { session: SleepSession }) {
  const startDate = new Date(session.start_time);
  const duration = formatDuration(session.duration_seconds);
  
  const stages = session.stages;
  const totalSeconds = session.duration_seconds;
  const deepPercent = stages?.deep_seconds && totalSeconds ? Math.round((stages.deep_seconds / totalSeconds) * 100) : 0;
  const remPercent = stages?.rem_seconds && totalSeconds ? Math.round((stages.rem_seconds / totalSeconds) * 100) : 0;
  const lightPercent = stages?.light_seconds && totalSeconds ? Math.round((stages.light_seconds / totalSeconds) * 100) : 0;
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors border border-indigo-100 dark:border-indigo-900">
      <div className="flex-shrink-0 p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900">
        <Moon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium">{session.is_nap ? 'Nap' : 'Sleep'}</p>
          {session.efficiency_percent && (
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {Math.round(session.efficiency_percent)}% efficiency
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {startDate.toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {duration}
          </span>
        </div>
        {stages && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {deepPercent > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300">
                Deep {deepPercent}%
              </span>
            )}
            {remPercent > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
                REM {remPercent}%
              </span>
            )}
            {lightPercent > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
                Light {lightPercent}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SleepSummaryCard({ summary }: { summary: SleepSummary }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors border border-indigo-100 dark:border-indigo-900">
      <div className="flex-shrink-0 p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900">
        <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium">{summary.date}</p>
          {summary.duration_seconds && (
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {formatDuration(summary.duration_seconds)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
          {summary.efficiency_percent && (
            <span>{Math.round(summary.efficiency_percent)}% efficiency</span>
          )}
          {summary.avg_heart_rate_bpm && (
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {summary.avg_heart_rate_bpm} bpm
            </span>
          )}
          {summary.avg_hrv_rmssd_ms && (
            <span>HRV {Math.round(summary.avg_hrv_rmssd_ms)}ms</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Sleep() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const {
    sessions: sleepSessions,
    loading: sleepLoading,
    error: sleepError,
    refresh: refreshSleep,
  } = useSleepSessions({ limit: 14 });

  const {
    summaries: sleepSummaries,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary,
  } = useSleepSummary({ limit: 14 });

  const handleRefresh = () => {
    refreshSleep();
    refreshSummary();
  };

  // Calculate stats from sessions
  const avgDuration = sleepSessions.length > 0
    ? sleepSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sleepSessions.length
    : 0;
  const avgEfficiency = sleepSessions.filter(s => s.efficiency_percent).length > 0
    ? sleepSessions.reduce((sum, s) => sum + (s.efficiency_percent || 0), 0) / sleepSessions.filter(s => s.efficiency_percent).length
    : 0;

  if (authLoading) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Sleep</PageHeaderHeading>
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
          <PageHeaderHeading>Sleep</PageHeaderHeading>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view sleep data.</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Sleep</PageHeaderHeading>
      </PageHeader>

      <div className="space-y-6">
        {/* Summary Stats */}
        {sleepSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sleep Overview</CardTitle>
              <CardDescription>Your sleep statistics from the last 2 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{sleepSessions.length}</p>
                  <p className="text-sm text-muted-foreground">Sleep Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{formatDuration(avgDuration)}</p>
                  <p className="text-sm text-muted-foreground">Average Duration</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{avgEfficiency > 0 ? `${Math.round(avgEfficiency)}%` : '-'}</p>
                  <p className="text-sm text-muted-foreground">Average Efficiency</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sleep Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Sleep Sessions
                </CardTitle>
                <CardDescription>Recent sleep sessions with stage breakdown</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={sleepLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${sleepLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sleepError && (
              <div className="text-center py-4 text-red-600 dark:text-red-400">
                <p>{sleepError}</p>
              </div>
            )}
            {sleepLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : sleepSessions.length > 0 ? (
              <div className="space-y-3">
                {sleepSessions.map((session) => (
                  <SleepSessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Moon className="h-8 w-8 mb-2 opacity-50" />
                <p>No sleep sessions yet</p>
                <p className="text-sm">Connect a device and sync to see sleep data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Sleep Summary */}
        {sleepSummaries.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Daily Summary
                  </CardTitle>
                  <CardDescription>Sleep summary by day</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refreshSummary()}
                  disabled={summaryLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${summaryLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {sleepSummaries.map((summary, idx) => (
                    <SleepSummaryCard key={idx} summary={summary} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

