import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './use-auth'
import {
  apiService,
  WearableProvider,
  WearableConnection,
  TimeseriesDataPoint,
  TimeseriesFilters,
  Workout,
  EventWorkout,
  SleepSession,
  ActivitySummary,
  SleepSummary,
  RecoverySummary,
  BodySummary,
  DateRangeFilters,
} from '../lib/api'

export interface UseWearablesOptions {
  autoFetch?: boolean
}

export const useWearables = (options: UseWearablesOptions = {}) => {
  const { autoFetch = true } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [providers, setProviders] = useState<WearableProvider[]>([])
  const [connections, setConnections] = useState<WearableConnection[]>([])
  const [openWearablesUserId, setOpenWearablesUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Prevent double fetch in StrictMode
  const hasFetched = useRef(false)

  const fetchProviders = useCallback(async () => {
    try {
      const token = await getAccessToken()
      if (!token) return

      const response = await apiService.getWearableProviders(token)
      setProviders(response.data.providers)
    } catch (err) {
      console.error('Error fetching providers:', err)
      setError('Failed to fetch providers')
    }
  }, [getAccessToken])

  const fetchConnections = useCallback(async () => {
    try {
      const token = await getAccessToken()
      if (!token) return

      const response = await apiService.getWearableConnections(token)
      setConnections(response.data.connections)
      setOpenWearablesUserId(response.data.open_wearables_user_id)
    } catch (err) {
      console.error('Error fetching connections:', err)
      setError('Failed to fetch connections')
    }
  }, [getAccessToken])

  const registerWithOpenWearables = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await apiService.registerWithOpenWearables(token)
      setOpenWearablesUserId(response.data.open_wearables_user_id)
      return response.data
    } catch (err) {
      console.error('Error registering with Open Wearables:', err)
      setError('Failed to register with Open Wearables')
      throw err
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  const connectProvider = useCallback(async (provider: string, redirectUri?: string) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await apiService.authorizeWearableProvider(token, provider, redirectUri)
      
      // Redirect user to the OAuth authorization URL
      window.location.href = response.data.authorization_url
      
      return response.data
    } catch (err) {
      console.error('Error connecting provider:', err)
      setError('Failed to connect provider')
      setLoading(false)
      throw err
    }
  }, [getAccessToken])

  const syncData = useCallback(async (provider: string, dataType: string = 'all') => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await apiService.syncWearableData(token, provider, dataType)
      return response.data
    } catch (err) {
      console.error('Error syncing data:', err)
      setError('Failed to sync data')
      throw err
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return
      
      const [providersRes, connectionsRes] = await Promise.all([
        apiService.getWearableProviders(token),
        apiService.getWearableConnections(token),
      ])
      
      setProviders(providersRes.data.providers)
      setConnections(connectionsRes.data.connections)
      setOpenWearablesUserId(connectionsRes.data.open_wearables_user_id)
    } catch (err) {
      console.error('Error refreshing:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current) {
      hasFetched.current = true
      refresh()
    }
  }, [autoFetch, isAuthenticated, authLoading])

  return {
    providers,
    connections,
    openWearablesUserId,
    loading,
    error,
    registerWithOpenWearables,
    connectProvider,
    syncData,
    refresh,
    fetchProviders,
    fetchConnections,
  }
}

export interface UseWearableTimeseriesOptions {
  autoFetch?: boolean
  types?: string[]
  start_time?: string
  end_time?: string
  limit?: number
  resolution?: 'raw' | '1min' | '5min' | '15min' | '1hour'
}

function getDefaultTimeRange(): { start_time: string; end_time: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 7) // Last 7 days
  
  return {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  }
}

export const useWearableTimeseries = (options: UseWearableTimeseriesOptions = {}) => {
  const { autoFetch = true, ...filters } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [data, setData] = useState<TimeseriesDataPoint[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Prevent double fetch in StrictMode
  const hasFetched = useRef(false)
  // Store filters in ref to avoid dependency issues
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchTimeseries = useCallback(async (customFilters?: TimeseriesFilters) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return

      const defaultRange = getDefaultTimeRange()
      const effectiveFilters: TimeseriesFilters = {
        start_time: customFilters?.start_time || filtersRef.current.start_time || defaultRange.start_time,
        end_time: customFilters?.end_time || filtersRef.current.end_time || defaultRange.end_time,
        types: customFilters?.types || filtersRef.current.types,
        limit: customFilters?.limit || filtersRef.current.limit,
        resolution: customFilters?.resolution || filtersRef.current.resolution,
      }
      
      const response = await apiService.getWearableTimeseries(token, effectiveFilters)
      setData(response.data.data)
      setCount(response.data.count)
    } catch (err) {
      console.error('Error fetching timeseries:', err)
      setError('Failed to fetch timeseries data')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current) {
      hasFetched.current = true
      fetchTimeseries()
    }
  }, [autoFetch, isAuthenticated, authLoading, fetchTimeseries])

  return {
    data,
    count,
    loading,
    error,
    refresh: fetchTimeseries,
  }
}

export interface UseWearableWorkoutsOptions {
  autoFetch?: boolean
  limit?: number
}

export const useWearableWorkouts = (options: UseWearableWorkoutsOptions = {}) => {
  const { autoFetch = true, limit = 50 } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Prevent double fetch in StrictMode
  const hasFetched = useRef(false)

  const fetchWorkouts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return

      const response = await apiService.getWearableWorkouts(token, limit)
      setWorkouts(response.data.workouts)
      setTotal(response.data.total)
    } catch (err) {
      console.error('Error fetching workouts:', err)
      setError('Failed to fetch workouts')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, limit])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current) {
      hasFetched.current = true
      fetchWorkouts()
    }
  }, [autoFetch, isAuthenticated, authLoading, fetchWorkouts])

  return {
    workouts,
    total,
    loading,
    error,
    refresh: fetchWorkouts,
  }
}

// ============================================
// New Event-based Hooks (Open Wearables v2)
// ============================================

export interface UseDateRangeOptions {
  autoFetch?: boolean
  startDate?: string
  endDate?: string
  limit?: number
}

function getDefaultDateRange(): { start_date: string; end_date: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30) // Last 30 days
  
  return {
    start_date: start.toISOString().split('T')[0],
    end_date: end.toISOString().split('T')[0],
  }
}

export const useEventWorkouts = (options: UseDateRangeOptions = {}) => {
  const { autoFetch = true, limit = 50 } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [workouts, setWorkouts] = useState<EventWorkout[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasFetched = useRef(false)

  const fetchWorkouts = useCallback(async (filters?: DateRangeFilters) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return

      const defaultRange = getDefaultDateRange()
      const response = await apiService.getEventWorkouts(token, {
        start_date: filters?.start_date || options.startDate || defaultRange.start_date,
        end_date: filters?.end_date || options.endDate || defaultRange.end_date,
        limit: filters?.limit || limit,
      })
      setWorkouts(response.data.data)
      setHasMore(response.data.has_more)
    } catch (err) {
      console.error('Error fetching event workouts:', err)
      setError('Failed to fetch workouts')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, options.startDate, options.endDate, limit])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current) {
      hasFetched.current = true
      fetchWorkouts()
    }
  }, [autoFetch, isAuthenticated, authLoading, fetchWorkouts])

  return { workouts, hasMore, loading, error, refresh: fetchWorkouts }
}

export const useSleepSessions = (options: UseDateRangeOptions = {}) => {
  const { autoFetch = true, limit = 50 } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [sessions, setSessions] = useState<SleepSession[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasFetched = useRef(false)

  const fetchSessions = useCallback(async (filters?: DateRangeFilters) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return

      const defaultRange = getDefaultDateRange()
      const response = await apiService.getSleepSessions(token, {
        start_date: filters?.start_date || options.startDate || defaultRange.start_date,
        end_date: filters?.end_date || options.endDate || defaultRange.end_date,
        limit: filters?.limit || limit,
      })
      setSessions(response.data.data)
      setHasMore(response.data.has_more)
    } catch (err) {
      console.error('Error fetching sleep sessions:', err)
      setError('Failed to fetch sleep sessions')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, options.startDate, options.endDate, limit])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current) {
      hasFetched.current = true
      fetchSessions()
    }
  }, [autoFetch, isAuthenticated, authLoading, fetchSessions])

  return { sessions, hasMore, loading, error, refresh: fetchSessions }
}

// ============================================
// Summary Hooks
// ============================================

export const useActivitySummary = (options: UseDateRangeOptions = {}) => {
  const { autoFetch = true, limit = 50 } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [summaries, setSummaries] = useState<ActivitySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasFetched = useRef(false)

  const fetchSummary = useCallback(async (filters?: DateRangeFilters) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return

      const defaultRange = getDefaultDateRange()
      const response = await apiService.getActivitySummary(token, {
        start_date: filters?.start_date || options.startDate || defaultRange.start_date,
        end_date: filters?.end_date || options.endDate || defaultRange.end_date,
        limit: filters?.limit || limit,
      })
      setSummaries(response.data.data)
    } catch (err) {
      console.error('Error fetching activity summary:', err)
      setError('Failed to fetch activity summary')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, options.startDate, options.endDate, limit])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current) {
      hasFetched.current = true
      fetchSummary()
    }
  }, [autoFetch, isAuthenticated, authLoading, fetchSummary])

  return { summaries, loading, error, refresh: fetchSummary }
}

export const useSleepSummary = (options: UseDateRangeOptions = {}) => {
  const { autoFetch = true, limit = 50 } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [summaries, setSummaries] = useState<SleepSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasFetched = useRef(false)

  const fetchSummary = useCallback(async (filters?: DateRangeFilters) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return

      const defaultRange = getDefaultDateRange()
      const response = await apiService.getSleepSummary(token, {
        start_date: filters?.start_date || options.startDate || defaultRange.start_date,
        end_date: filters?.end_date || options.endDate || defaultRange.end_date,
        limit: filters?.limit || limit,
      })
      setSummaries(response.data.data)
    } catch (err) {
      console.error('Error fetching sleep summary:', err)
      setError('Failed to fetch sleep summary')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, options.startDate, options.endDate, limit])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current) {
      hasFetched.current = true
      fetchSummary()
    }
  }, [autoFetch, isAuthenticated, authLoading, fetchSummary])

  return { summaries, loading, error, refresh: fetchSummary }
}

export const useRecoverySummary = (options: UseDateRangeOptions = {}) => {
  const { autoFetch = true, limit = 50 } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [summaries, setSummaries] = useState<RecoverySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasFetched = useRef(false)

  const fetchSummary = useCallback(async (filters?: DateRangeFilters) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return

      const defaultRange = getDefaultDateRange()
      const response = await apiService.getRecoverySummary(token, {
        start_date: filters?.start_date || options.startDate || defaultRange.start_date,
        end_date: filters?.end_date || options.endDate || defaultRange.end_date,
        limit: filters?.limit || limit,
      })
      setSummaries(response.data.data)
    } catch (err) {
      console.error('Error fetching recovery summary:', err)
      setError('Failed to fetch recovery summary')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, options.startDate, options.endDate, limit])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current) {
      hasFetched.current = true
      fetchSummary()
    }
  }, [autoFetch, isAuthenticated, authLoading, fetchSummary])

  return { summaries, loading, error, refresh: fetchSummary }
}

export const useBodySummary = (options: UseDateRangeOptions = {}) => {
  const { autoFetch = true, limit = 50 } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [summaries, setSummaries] = useState<BodySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasFetched = useRef(false)

  const fetchSummary = useCallback(async (filters?: DateRangeFilters) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return

      const defaultRange = getDefaultDateRange()
      const response = await apiService.getBodySummary(token, {
        start_date: filters?.start_date || options.startDate || defaultRange.start_date,
        end_date: filters?.end_date || options.endDate || defaultRange.end_date,
        limit: filters?.limit || limit,
      })
      setSummaries(response.data.data)
    } catch (err) {
      console.error('Error fetching body summary:', err)
      setError('Failed to fetch body summary')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, options.startDate, options.endDate, limit])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current) {
      hasFetched.current = true
      fetchSummary()
    }
  }, [autoFetch, isAuthenticated, authLoading, fetchSummary])

  return { summaries, loading, error, refresh: fetchSummary }
}

// ============================================
// Workout Detail Hook
// ============================================

export interface UseWorkoutDetailOptions {
  provider: string
  workoutId: string
  autoFetch?: boolean
}

export const useWorkoutDetail = (options: UseWorkoutDetailOptions) => {
  const { provider, workoutId, autoFetch = true } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [workout, setWorkout] = useState<import('../lib/api').WorkoutDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasFetched = useRef(false)

  const fetchWorkout = useCallback(async () => {
    if (!provider || !workoutId) return
    
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return

      const response = await apiService.getWorkoutDetail(token, provider, workoutId)
      setWorkout(response.data)
    } catch (err) {
      console.error('Error fetching workout detail:', err)
      setError('Failed to fetch workout detail')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, provider, workoutId])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current && provider && workoutId) {
      hasFetched.current = true
      fetchWorkout()
    }
  }, [autoFetch, isAuthenticated, authLoading, fetchWorkout, provider, workoutId])

  return { workout, loading, error, refresh: fetchWorkout }
}

// ============================================
// Series Types Hook
// ============================================

export const useAvailableSeriesTypes = (options: { autoFetch?: boolean } = {}) => {
  const { autoFetch = true } = options
  const { isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth()

  const [types, setTypes] = useState<import('../lib/api').SeriesTypeInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasFetched = useRef(false)

  const fetchTypes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) return

      const response = await apiService.getAvailableSeriesTypes(token)
      setTypes(response.data.types)
    } catch (err) {
      console.error('Error fetching series types:', err)
      setError('Failed to fetch available series types')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && !hasFetched.current) {
      hasFetched.current = true
      fetchTypes()
    }
  }, [autoFetch, isAuthenticated, authLoading, fetchTypes])

  return { types, loading, error, refresh: fetchTypes }
}

// ============================================
// Apple Health Import Hook
// ============================================

export const useAppleHealthImport = () => {
  const { getAccessToken } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<import('../lib/api').AppleHealthImportResponse | null>(null)

  const importAppleHealth = useCallback(async (fileKey: string) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await apiService.importAppleHealth(token, fileKey)
      setResult(response.data)
      return response.data
    } catch (err) {
      console.error('Error importing Apple Health data:', err)
      setError('Failed to import Apple Health data')
      throw err
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  return { importAppleHealth, loading, error, result }
}

