import { PageHeader, PageHeaderHeading } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useWearables } from "@/hooks/use-wearables";
import { useState, useEffect, useMemo } from "react";
import { Watch, RefreshCw, CheckCircle, AlertCircle, User, Link2 } from "lucide-react";

// Provider icon mapping (fallback to Watch icon)
const providerIcons: Record<string, string> = {
  garmin: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Garmin_logo.svg",
  polar: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Polar_Logo.svg",
  suunto: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Suunto_logo.svg",
};

// Provider colors for styling
const providerColors: Record<string, { bg: string; border: string; text: string }> = {
  garmin: { bg: "bg-blue-50 dark:bg-blue-950", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300" },
  polar: { bg: "bg-red-50 dark:bg-red-950", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300" },
  suunto: { bg: "bg-orange-50 dark:bg-orange-950", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300" },
  default: { bg: "bg-gray-50 dark:bg-gray-900", border: "border-gray-200 dark:border-gray-800", text: "text-gray-700 dark:text-gray-300" },
};

export default function Settings() {
  const { isAuthenticated, isLoading: authLoading, currentUser } = useAuth();
  const {
    providers,
    connections,
    loading,
    error,
    connectProvider,
    syncData,
    refresh,
  } = useWearables();

  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  // Check URL for OAuth callback success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const provider = params.get('provider');
    
    if (success === 'true' && provider) {
      // Clear the URL params
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh connections
      refresh();
    }
  }, [refresh]);

  const connectedProviders = useMemo(() => {
    return new Set(connections.map(c => c.provider.toLowerCase()));
  }, [connections]);

  const handleConnect = async (providerName: string) => {
    setConnectingProvider(providerName);
    try {
      const callbackUrl = `${window.location.origin}${window.location.pathname}?success=true&provider=${providerName}`;
      await connectProvider(providerName, callbackUrl);
    } catch (err) {
      setConnectingProvider(null);
    }
  };

  const handleSync = async (providerName: string) => {
    setSyncingProvider(providerName);
    try {
      await syncData(providerName);
    } catch (err) {
      // Error handled in hook
    } finally {
      setSyncingProvider(null);
    }
  };

  if (authLoading) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Settings</PageHeaderHeading>
        </PageHeader>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <PageHeader>
          <PageHeaderHeading>Settings</PageHeaderHeading>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to access settings.</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Settings</PageHeaderHeading>
      </PageHeader>

      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Connected Devices
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
        </TabsList>

        {/* Connected Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Providers Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Available Providers</h2>
                <p className="text-sm text-muted-foreground">Connect your wearable devices to sync health data</p>
              </div>
              <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading && providers.length === 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <Skeleton className="h-5 w-24 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : providers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {providers.map((provider) => {
                  const providerKey = provider.name.toLowerCase();
                  const isConnected = connectedProviders.has(providerKey);
                  const colors = providerColors[providerKey] || providerColors.default;
                  const iconUrl = provider.icon_url || providerIcons[providerKey];

                  return (
                    <Card 
                      key={provider.name} 
                      className={`transition-all ${isConnected ? `${colors.bg} ${colors.border}` : ''}`}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          {iconUrl ? (
                            <img 
                              src={iconUrl} 
                              alt={provider.display_name || provider.name}
                              className="h-10 w-10 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Watch className={`h-10 w-10 ${iconUrl ? 'hidden' : ''} ${colors.text}`} />
                          <div>
                            <CardTitle className="text-lg">
                              {provider.display_name || provider.name}
                            </CardTitle>
                            {isConnected && (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                                <CheckCircle className="h-4 w-4" />
                                Connected
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardFooter className="flex gap-2">
                        {isConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleSync(provider.name)}
                            disabled={syncingProvider === provider.name}
                          >
                            {syncingProvider === provider.name ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Sync Data
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleConnect(provider.name)}
                            disabled={connectingProvider === provider.name}
                          >
                            {connectingProvider === provider.name ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <Watch className="mr-2 h-4 w-4" />
                                Connect
                              </>
                            )}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">
                    No providers available. Make sure Open Wearables is running.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Connected Devices Summary */}
          {connections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Connections</CardTitle>
                <CardDescription>
                  Devices connected to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {connections.map((connection) => (
                    <div 
                      key={connection.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium capitalize">{connection.provider}</p>
                          <p className="text-sm text-muted-foreground">
                            {connection.last_sync 
                              ? `Last synced: ${new Date(connection.last_sync).toLocaleString()}`
                              : 'Never synced'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSync(connection.provider)}
                        disabled={syncingProvider === connection.provider}
                      >
                        {syncingProvider === connection.provider ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="font-medium">{currentUser?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <p className="font-mono text-sm">{currentUser?.user_id || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

