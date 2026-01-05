import { PageHeader, PageHeaderHeading } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { 
  useWearables,
  useWearableTimeseries, 
  useWearableWorkouts,
  useActivitySummary,
  useSleepSummary,
  useRecoverySummary,
} from "@/hooks/use-wearables";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Activity, 
  Moon, 
  Footprints, 
  Zap, 
  Watch,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  
  const { connections, loading: connectionsLoading } = useWearables();
  
  const { data: heartRateData, loading: heartRateLoading } = useWearableTimeseries({
    types: ['heart_rate'],
    limit: 50,
  });
  
  const { workouts, total: workoutsTotal, loading: workoutsLoading } = useWearableWorkouts({ limit: 5 });
  const { summaries: activitySummaries, loading: activityLoading } = useActivitySummary({ limit: 7 });
  const { summaries: sleepSummaries, loading: sleepLoading } = useSleepSummary({ limit: 7 });
  const { summaries: recoverySummaries, loading: recoveryLoading } = useRecoverySummary({ limit: 7 });

  // Calculate stats
  const avgHeartRate = heartRateData.length > 0 
    ? Math.round(heartRateData.reduce((sum, d) => sum + d.value, 0) / heartRateData.length)
    : null;
  
  const todayActivity = activitySummaries[0];
  const todaySleep = sleepSummaries[0];
  const todayRecovery = recoverySummaries[0];
  
  const weeklySteps = activitySummaries.reduce((sum, s) => sum + (s.steps || 0), 0);
  const avgSleepDuration = sleepSummaries.length > 0
    ? sleepSummaries.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sleepSummaries.length
    : 0;

  if (isLoading) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Dashboard</PageHeaderHeading>
        </PageHeader>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Dashboard</PageHeaderHeading>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Healthion</CardTitle>
            <CardDescription>Please log in to view your health data.</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  const hasConnections = connections.length > 0;

  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Dashboard</PageHeaderHeading>
      </PageHeader>

      {/* Connection Status Banner */}
      {!connectionsLoading && !hasConnections && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Watch className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">No devices connected</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Connect your wearable devices to start tracking your health</p>
                </div>
              </div>
              <Link to="/settings">
                <Button variant="outline" className="border-amber-300 dark:border-amber-700">
                  Connect Devices
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Heart Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Heart Rate</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {heartRateLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : avgHeartRate ? (
              <>
                <p className="text-2xl font-bold">{avgHeartRate} bpm</p>
                <p className="text-xs text-muted-foreground">Average (last {heartRateData.length} readings)</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Today's Steps */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Steps</CardTitle>
            <Footprints className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : todayActivity?.steps ? (
              <>
                <p className="text-2xl font-bold">{todayActivity.steps.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {todayActivity.distance_meters ? `${(todayActivity.distance_meters / 1000).toFixed(1)} km` : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Last Night's Sleep */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Sleep</CardTitle>
            <Moon className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            {sleepLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : todaySleep?.duration_seconds ? (
              <>
                <p className="text-2xl font-bold">{formatDuration(todaySleep.duration_seconds)}</p>
                <p className="text-xs text-muted-foreground">
                  {todaySleep.efficiency_percent ? `${Math.round(todaySleep.efficiency_percent)}% efficiency` : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Recovery */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recovery</CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {recoveryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : todayRecovery?.recovery_score !== undefined && todayRecovery?.recovery_score !== null ? (
              <>
                <p className={`text-2xl font-bold ${
                  todayRecovery.recovery_score >= 67 ? 'text-green-600' :
                  todayRecovery.recovery_score >= 34 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {todayRecovery.recovery_score}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {todayRecovery.resting_heart_rate_bpm ? `Resting HR: ${todayRecovery.resting_heart_rate_bpm} bpm` : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Weekly Activity
            </CardTitle>
            <CardDescription>Last 7 days summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Steps</span>
                <span className="font-semibold">{weeklySteps.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Daily Average</span>
                <span className="font-semibold">{Math.round(weeklySteps / 7).toLocaleString()}</span>
              </div>
            </div>
            <Link to="/activity" className="block mt-4">
              <Button variant="outline" size="sm" className="w-full">
                View Activity
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Sleep Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-500" />
              Sleep Average
            </CardTitle>
            <CardDescription>Last 7 nights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg Duration</span>
                <span className="font-semibold">{formatDuration(avgSleepDuration)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Sessions Tracked</span>
                <span className="font-semibold">{sleepSummaries.length}</span>
              </div>
            </div>
            <Link to="/sleep" className="block mt-4">
              <Button variant="outline" size="sm" className="w-full">
                View Sleep
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Workouts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              Recent Workouts
            </CardTitle>
            <CardDescription>{workoutsTotal} total workouts</CardDescription>
          </CardHeader>
          <CardContent>
            {workoutsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : workouts.length > 0 ? (
              <div className="space-y-2">
                {workouts.slice(0, 3).map((workout) => (
                  <div key={workout.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{workout.type?.replace(/_/g, ' ') || 'Workout'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(workout.start_datetime).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(workout.duration_seconds)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No workouts yet</p>
            )}
            <Link to="/workouts" className="block mt-4">
              <Button variant="outline" size="sm" className="w-full">
                View Workouts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Navigate to detailed views</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Link to="/heart-rate">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="text-sm">Heart Rate</span>
              </Button>
            </Link>
            <Link to="/workouts">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                <span className="text-sm">Workouts</span>
              </Button>
            </Link>
            <Link to="/sleep">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Moon className="h-5 w-5 text-indigo-500" />
                <span className="text-sm">Sleep</span>
              </Button>
            </Link>
            <Link to="/activity">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Footprints className="h-5 w-5 text-green-500" />
                <span className="text-sm">Activity</span>
              </Button>
            </Link>
            <Link to="/recovery">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <span className="text-sm">Recovery</span>
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Watch className="h-5 w-5 text-blue-500" />
                <span className="text-sm">Devices</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
