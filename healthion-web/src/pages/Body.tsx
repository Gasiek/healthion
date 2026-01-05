import { PageHeader, PageHeaderHeading } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useBodySummary } from "@/hooks/use-wearables";
import { Scale, Percent, Thermometer, Heart, RefreshCw, TrendingUp } from "lucide-react";
import type { BodySummary } from "@/lib/api";

function BodySummaryCard({ summary }: { summary: BodySummary }) {
  return (
    <div className="p-4 rounded-lg bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors border border-teal-100 dark:border-teal-900">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-lg">{summary.date}</p>
        {summary.weight_kg && (
          <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
            {summary.weight_kg.toFixed(1)} kg
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summary.body_fat_percent && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
              <Percent className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-medium">{summary.body_fat_percent.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Body Fat</p>
            </div>
          </div>
        )}
        
        {summary.muscle_mass_kg && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-medium">{summary.muscle_mass_kg.toFixed(1)} kg</p>
              <p className="text-xs text-muted-foreground">Muscle Mass</p>
            </div>
          </div>
        )}
        
        {summary.bmi && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium">{summary.bmi.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">BMI</p>
            </div>
          </div>
        )}
        
      </div>

      {/* Additional metrics row */}
      {(summary.blood_pressure || summary.basal_body_temperature_celsius) && (
        <div className="mt-4 pt-4 border-t border-teal-100 dark:border-teal-900">
          <div className="grid grid-cols-2 gap-4">
            {summary.blood_pressure && (
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                  <Heart className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium">
                    {summary.blood_pressure.systolic_mmhg}/{summary.blood_pressure.diastolic_mmhg}
                  </p>
                  <p className="text-xs text-muted-foreground">Blood Pressure</p>
                </div>
              </div>
            )}
            
            {summary.basal_body_temperature_celsius && (
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900">
                  <Thermometer className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="font-medium">{summary.basal_body_temperature_celsius.toFixed(1)}°C</p>
                  <p className="text-xs text-muted-foreground">Basal Temp</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Body() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const {
    summaries: bodySummaries,
    loading: bodyLoading,
    error: bodyError,
    refresh: refreshBody,
  } = useBodySummary({ limit: 14 });

  // Calculate latest and averages
  const latestWeight = bodySummaries.find(s => s.weight_kg)?.weight_kg;
  const validWeights = bodySummaries.filter(s => s.weight_kg);
  const avgWeight = validWeights.length > 0
    ? validWeights.reduce((sum, s) => sum + (s.weight_kg || 0), 0) / validWeights.length
    : null;
  
  const validBodyFat = bodySummaries.filter(s => s.body_fat_percent);
  const avgBodyFat = validBodyFat.length > 0
    ? validBodyFat.reduce((sum, s) => sum + (s.body_fat_percent || 0), 0) / validBodyFat.length
    : null;

  if (authLoading) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Body</PageHeaderHeading>
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
          <PageHeaderHeading>Body</PageHeaderHeading>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view body data.</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Body</PageHeaderHeading>
      </PageHeader>

      <div className="space-y-6">
        {/* Summary Stats */}
        {bodySummaries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Body Overview</CardTitle>
              <CardDescription>Your body metrics from the last 2 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                    {latestWeight ? `${latestWeight.toFixed(1)} kg` : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Latest Weight</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {avgWeight ? `${avgWeight.toFixed(1)} kg` : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Weight</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {avgBodyFat ? `${avgBodyFat.toFixed(1)}%` : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Body Fat</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Body Measurements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  Body Measurements
                </CardTitle>
                <CardDescription>Your daily body composition data</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refreshBody()}
                disabled={bodyLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${bodyLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bodyError && (
              <div className="text-center py-4 text-red-600 dark:text-red-400">
                <p>{bodyError}</p>
              </div>
            )}
            {bodyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : bodySummaries.length > 0 ? (
              <div className="space-y-3">
                {bodySummaries.map((summary, idx) => (
                  <BodySummaryCard key={idx} summary={summary} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Scale className="h-8 w-8 mb-2 opacity-50" />
                <p>No body data yet</p>
                <p className="text-sm">Connect a smart scale or sync to see body data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

