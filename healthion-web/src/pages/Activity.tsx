import { PageHeader, PageHeaderHeading } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useActivitySummary } from "@/hooks/use-wearables";
import { Footprints, Flame, MapPin, Clock, RefreshCw } from "lucide-react";
import type { ActivitySummary } from "@/lib/api";

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function ActivitySummaryCard({ summary }: { summary: ActivitySummary }) {
  return (
    <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-950/30 hover:bg-green-50 dark:hover:bg-green-950/50 transition-colors border border-green-100 dark:border-green-900">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-lg">{summary.date}</p>
        {summary.steps && (
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            {summary.steps.toLocaleString()} steps
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summary.distance_meters && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium">{(summary.distance_meters / 1000).toFixed(1)} km</p>
              <p className="text-xs text-muted-foreground">Distance</p>
            </div>
          </div>
        )}
        
        {summary.active_calories_kcal && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
              <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-medium">{Math.round(summary.active_calories_kcal)}</p>
              <p className="text-xs text-muted-foreground">Active Cal</p>
            </div>
          </div>
        )}
        
        {summary.total_calories_kcal && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <Flame className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-medium">{Math.round(summary.total_calories_kcal)}</p>
              <p className="text-xs text-muted-foreground">Total Cal</p>
            </div>
          </div>
        )}
        
        {summary.active_duration_seconds && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium">{formatDuration(summary.active_duration_seconds)}</p>
              <p className="text-xs text-muted-foreground">Active Time</p>
            </div>
          </div>
        )}
      </div>

      {/* Floors climbed if available */}
      {summary.floors_climbed && (
        <div className="mt-3 pt-3 border-t border-green-100 dark:border-green-900">
          <span className="text-sm text-muted-foreground">
            {summary.floors_climbed} floors climbed
          </span>
        </div>
      )}
    </div>
  );
}

export default function Activity() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const {
    summaries: activitySummaries,
    loading: activityLoading,
    error: activityError,
    refresh: refreshActivity,
  } = useActivitySummary({ limit: 14 });

  // Calculate totals
  const totalSteps = activitySummaries.reduce((sum, s) => sum + (s.steps || 0), 0);
  const totalDistance = activitySummaries.reduce((sum, s) => sum + (s.distance_meters || 0), 0);
  const totalCalories = activitySummaries.reduce((sum, s) => sum + (s.active_calories_kcal || 0), 0);
  const avgSteps = activitySummaries.length > 0 ? Math.round(totalSteps / activitySummaries.length) : 0;

  if (authLoading) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Activity</PageHeaderHeading>
        </PageHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-16 w-full" />
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
          <PageHeaderHeading>Activity</PageHeaderHeading>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view activity data.</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Activity</PageHeaderHeading>
      </PageHeader>

      <div className="space-y-6">
        {/* Summary Stats */}
        {activitySummaries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Overview</CardTitle>
              <CardDescription>Your activity statistics from the last 2 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalSteps.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Steps</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{(totalDistance / 1000).toFixed(1)} km</p>
                  <p className="text-sm text-muted-foreground">Total Distance</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{Math.round(totalCalories).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Active Calories</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{avgSteps.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Avg Steps/Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Footprints className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Daily Activity
                </CardTitle>
                <CardDescription>Your daily activity metrics</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refreshActivity()}
                disabled={activityLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${activityLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activityError && (
              <div className="text-center py-4 text-red-600 dark:text-red-400">
                <p>{activityError}</p>
              </div>
            )}
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : activitySummaries.length > 0 ? (
              <div className="space-y-3">
                {activitySummaries.map((summary, idx) => (
                  <ActivitySummaryCard key={idx} summary={summary} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Footprints className="h-8 w-8 mb-2 opacity-50" />
                <p>No activity data yet</p>
                <p className="text-sm">Connect a device and sync to see activity data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

