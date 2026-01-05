import { PageHeader, PageHeaderHeading } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useRecoverySummary } from "@/hooks/use-wearables";
import { Zap, Heart, TrendingUp, RefreshCw, Moon } from "lucide-react";
import type { RecoverySummary } from "@/lib/api";

function getRecoveryColor(score: number | null): { text: string; bg: string; border: string } {
  if (!score) return { text: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-900", border: "border-gray-200 dark:border-gray-800" };
  if (score >= 67) return { text: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900", border: "border-green-200 dark:border-green-800" };
  if (score >= 34) return { text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900", border: "border-yellow-200 dark:border-yellow-800" };
  return { text: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900", border: "border-red-200 dark:border-red-800" };
}

function getRecoveryLabel(score: number | null): string {
  if (!score) return "Unknown";
  if (score >= 67) return "Recovered";
  if (score >= 34) return "Moderate";
  return "Low";
}

function RecoverySummaryCard({ summary }: { summary: RecoverySummary }) {
  const colors = getRecoveryColor(summary.recovery_score);
  const label = getRecoveryLabel(summary.recovery_score);
  
  return (
    <div className={`p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors border border-amber-100 dark:border-amber-900`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Zap className={`h-5 w-5 ${colors.text}`} />
          </div>
          <div>
            <p className="font-semibold">{summary.date}</p>
            <p className={`text-sm font-medium ${colors.text}`}>{label}</p>
          </div>
        </div>
        {summary.recovery_score !== null && (
          <div className={`text-3xl font-bold ${colors.text}`}>
            {summary.recovery_score}%
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summary.resting_heart_rate_bpm && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <Heart className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-medium">{summary.resting_heart_rate_bpm} bpm</p>
              <p className="text-xs text-muted-foreground">Resting HR</p>
            </div>
          </div>
        )}
        
        {summary.avg_hrv_rmssd_ms && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-medium">{Math.round(summary.avg_hrv_rmssd_ms)} ms</p>
              <p className="text-xs text-muted-foreground">HRV</p>
            </div>
          </div>
        )}
        
        {summary.sleep_efficiency_percent && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">
              <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="font-medium">{Math.round(summary.sleep_efficiency_percent)}%</p>
              <p className="text-xs text-muted-foreground">Sleep Eff.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Recovery() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const {
    summaries: recoverySummaries,
    loading: recoveryLoading,
    error: recoveryError,
    refresh: refreshRecovery,
  } = useRecoverySummary({ limit: 14 });

  // Calculate averages
  const validScores = recoverySummaries.filter(s => s.recovery_score !== null);
  const avgRecovery = validScores.length > 0
    ? Math.round(validScores.reduce((sum, s) => sum + (s.recovery_score || 0), 0) / validScores.length)
    : null;
  
  const validHrv = recoverySummaries.filter(s => s.avg_hrv_rmssd_ms);
  const avgHrv = validHrv.length > 0
    ? Math.round(validHrv.reduce((sum, s) => sum + (s.avg_hrv_rmssd_ms || 0), 0) / validHrv.length)
    : null;
  
  const validRhr = recoverySummaries.filter(s => s.resting_heart_rate_bpm);
  const avgRhr = validRhr.length > 0
    ? Math.round(validRhr.reduce((sum, s) => sum + (s.resting_heart_rate_bpm || 0), 0) / validRhr.length)
    : null;

  if (authLoading) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Recovery</PageHeaderHeading>
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
          <PageHeaderHeading>Recovery</PageHeaderHeading>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view recovery data.</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Recovery</PageHeaderHeading>
      </PageHeader>

      <div className="space-y-6">
        {/* Summary Stats */}
        {recoverySummaries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recovery Overview</CardTitle>
              <CardDescription>Your recovery statistics from the last 2 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${getRecoveryColor(avgRecovery).text}`}>
                    {avgRecovery !== null ? `${avgRecovery}%` : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Recovery Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {avgHrv !== null ? `${avgHrv} ms` : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg HRV</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {avgRhr !== null ? `${avgRhr} bpm` : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Resting HR</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Recovery */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  Daily Recovery
                </CardTitle>
                <CardDescription>Your daily recovery scores and metrics</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refreshRecovery()}
                disabled={recoveryLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${recoveryLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recoveryError && (
              <div className="text-center py-4 text-red-600 dark:text-red-400">
                <p>{recoveryError}</p>
              </div>
            )}
            {recoveryLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : recoverySummaries.length > 0 ? (
              <div className="space-y-3">
                {recoverySummaries.map((summary, idx) => (
                  <RecoverySummaryCard key={idx} summary={summary} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Zap className="h-8 w-8 mb-2 opacity-50" />
                <p>No recovery data yet</p>
                <p className="text-sm">Connect a device and sync to see recovery data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

