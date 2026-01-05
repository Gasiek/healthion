import { PageHeader, PageHeaderHeading } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useWearableWorkouts } from "@/hooks/use-wearables";
import { Activity, Clock, Calendar, RefreshCw, Flame, Heart, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import type { Workout } from "@/lib/api";

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatWorkoutType(type: string | null): string {
  if (!type) return 'Unknown';
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function WorkoutCard({ workout }: { workout: Workout }) {
  const startDate = new Date(workout.start_datetime);
  
  return (
    <div className="p-4 rounded-lg bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors border border-purple-100 dark:border-purple-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
            <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="font-semibold">{formatWorkoutType(workout.type)}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{startDate.toLocaleDateString()}</span>
              <span>•</span>
              <span>{startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
        {workout.source_name && (
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
            {workout.source_name}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {workout.duration_seconds && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium">{formatDuration(workout.duration_seconds)}</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
          </div>
        )}
        
        {workout.calories_kcal && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
              <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-medium">{Math.round(workout.calories_kcal)}</p>
              <p className="text-xs text-muted-foreground">Calories</p>
            </div>
          </div>
        )}
        
        {workout.avg_heart_rate_bpm && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <Heart className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-medium">{workout.avg_heart_rate_bpm} bpm</p>
              <p className="text-xs text-muted-foreground">Avg HR</p>
            </div>
          </div>
        )}
        
        {workout.distance_meters && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium">{(workout.distance_meters / 1000).toFixed(2)} km</p>
              <p className="text-xs text-muted-foreground">Distance</p>
            </div>
          </div>
        )}
      </div>

      {/* Additional stats row */}
      {(workout.max_heart_rate_bpm || workout.avg_speed_mps) && (
        <div className="mt-4 pt-4 border-t border-purple-100 dark:border-purple-900">
          <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
            {workout.max_heart_rate_bpm && (
              <span>Max HR: {workout.max_heart_rate_bpm} bpm</span>
            )}
            {workout.avg_speed_mps && (
              <span>Avg Speed: {(workout.avg_speed_mps * 3.6).toFixed(1)} km/h</span>
            )}
            {workout.max_speed_mps && (
              <span>Max Speed: {(workout.max_speed_mps * 3.6).toFixed(1)} km/h</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Workouts() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [limit, setLimit] = useState(20);

  const {
    workouts,
    total,
    loading: workoutsLoading,
    error: workoutsError,
    refresh: refreshWorkouts,
  } = useWearableWorkouts({ limit });

  // Calculate totals
  const stats = useMemo(() => {
    if (workouts.length === 0) return null;
    const totalDuration = workouts.reduce((sum, w) => sum + (w.duration_seconds || 0), 0);
    const totalCalories = workouts.reduce((sum, w) => sum + (w.calories_kcal || 0), 0);
    const totalDistance = workouts.reduce((sum, w) => sum + (w.distance_meters || 0), 0);
    const validHrWorkouts = workouts.filter(w => w.avg_heart_rate_bpm);
    const avgHr = validHrWorkouts.length > 0
      ? Math.round(validHrWorkouts.reduce((sum, w) => sum + (w.avg_heart_rate_bpm || 0), 0) / validHrWorkouts.length)
      : null;
    
    return {
      count: workouts.length,
      totalDuration,
      totalCalories: Math.round(totalCalories),
      totalDistance,
      avgHr,
    };
  }, [workouts]);

  if (authLoading) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Workouts</PageHeaderHeading>
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
          <PageHeaderHeading>Workouts</PageHeaderHeading>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view workout data.</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Workouts</PageHeaderHeading>
      </PageHeader>
      
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Adjust the number of workouts to display</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Limit</label>
                <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 Workouts</SelectItem>
                    <SelectItem value="20">20 Workouts</SelectItem>
                    <SelectItem value="50">50 Workouts</SelectItem>
                    <SelectItem value="100">100 Workouts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button onClick={() => refreshWorkouts()} className="w-full md:w-auto" disabled={workoutsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${workoutsLoading ? 'animate-spin' : ''}`} />
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
              <CardDescription>Workout statistics {total > 0 && `(${total} total workouts)`}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.count}</p>
                  <p className="text-sm text-muted-foreground">Workouts</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatDuration(stats.totalDuration)}</p>
                  <p className="text-sm text-muted-foreground">Total Time</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.totalCalories.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Calories</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{(stats.totalDistance / 1000).toFixed(1)} km</p>
                  <p className="text-sm text-muted-foreground">Distance</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.avgHr ?? '-'}</p>
                  <p className="text-sm text-muted-foreground">Avg HR</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workouts List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Recent Workouts
                </CardTitle>
                <CardDescription>Your workout sessions from connected devices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {workoutsError && (
              <div className="text-center py-4 text-red-600 dark:text-red-400">
                <p>{workoutsError}</p>
              </div>
            )}
            {workoutsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : workouts.length > 0 ? (
              <div className="space-y-3">
                {workouts.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-50" />
                <p>No workouts yet</p>
                <p className="text-sm">Connect a device and sync to see workouts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
