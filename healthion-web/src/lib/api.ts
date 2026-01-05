import { appConfig } from '../config/app'

export interface ApiResponse<T = any> {
  data: T
  message?: string
  error?: string
}

export interface User {
  user_id: string
  email: string
  permissions: string[]
}

// Open Wearables types
export interface WearableProvider {
  name: string
  display_name: string | null
  icon_url: string | null
  has_cloud_api: boolean
  is_enabled: boolean
}

export interface ProvidersResponse {
  providers: WearableProvider[]
}

export interface AuthorizationResponse {
  authorization_url: string
  provider: string
}

export interface WearableConnection {
  id: string
  provider: string
  connected_at: string | null
  is_active: boolean
  last_sync: string | null
}

export interface ConnectionsResponse {
  connections: WearableConnection[]
  open_wearables_user_id: string | null
}

export interface TimeseriesDataPoint {
  timestamp: string
  value: number
  unit: string
}

export interface TimeseriesResponse {
  data: TimeseriesDataPoint[]
  series_type: string
  user_id: string
  count: number
}

export interface RegisterOpenWearablesResponse {
  open_wearables_user_id: string
  already_registered: boolean
}

export interface SyncResponse {
  status: string
  message: string | null
  synced_count: number
}

export interface Workout {
  id: string
  type: string | null
  source_name: string | null
  start_datetime: string
  end_datetime: string | null
  duration_seconds: number | null
  provider: string | null
  calories_kcal: number | null
  distance_meters: number | null
  avg_heart_rate_bpm: number | null
  max_heart_rate_bpm: number | null
  avg_speed_mps: number | null
  max_speed_mps: number | null
}

export interface WorkoutsResponse {
  workouts: Workout[]
  total: number
}

export interface TimeseriesFilters {
  types?: string[]
  start_time: string
  end_time: string
  limit?: number
  resolution?: 'raw' | '1min' | '5min' | '15min' | '1hour'
}

// ============================================
// Event-based Types (Open Wearables v2)
// ============================================

export interface DataSource {
  provider: string
  device: string | null
}

export interface EventWorkout {
  id: string
  type: string
  name: string | null
  start_time: string
  end_time: string
  duration_seconds: number | null
  source: DataSource
  calories_kcal: number | null
  distance_meters: number | null
  avg_heart_rate_bpm: number | null
  max_heart_rate_bpm: number | null
  avg_pace_sec_per_km: number | null
  elevation_gain_meters: number | null
}

export interface EventWorkoutsResponse {
  data: EventWorkout[]
  has_more: boolean
  next_cursor: string | null
}

export interface SleepStages {
  awake_seconds: number | null
  light_seconds: number | null
  deep_seconds: number | null
  rem_seconds: number | null
}

export interface SleepSession {
  id: string
  start_time: string
  end_time: string
  source: DataSource
  duration_seconds: number
  efficiency_percent: number | null
  stages: SleepStages | null
  is_nap: boolean
}

export interface SleepSessionsResponse {
  data: SleepSession[]
  has_more: boolean
  next_cursor: string | null
}

// ============================================
// Summary Types
// ============================================

export interface IntensityMinutes {
  light: number | null
  moderate: number | null
  vigorous: number | null
}

export interface ActivitySummary {
  date: string
  source: DataSource
  steps: number | null
  distance_meters: number | null
  floors_climbed: number | null
  active_calories_kcal: number | null
  total_calories_kcal: number | null
  active_duration_seconds: number | null
  sedentary_duration_seconds: number | null
  intensity_minutes: IntensityMinutes | null
}

export interface ActivitySummaryResponse {
  data: ActivitySummary[]
  has_more: boolean
  next_cursor: string | null
}

export interface SleepSummary {
  date: string
  source: DataSource
  start_time: string | null
  end_time: string | null
  duration_seconds: number | null
  time_in_bed_seconds: number | null
  efficiency_percent: number | null
  stages: SleepStages | null
  interruptions_count: number | null
  avg_heart_rate_bpm: number | null
  avg_hrv_rmssd_ms: number | null
  avg_respiratory_rate: number | null
  avg_spo2_percent: number | null
}

export interface SleepSummaryResponse {
  data: SleepSummary[]
  has_more: boolean
  next_cursor: string | null
}

export interface RecoverySummary {
  date: string
  source: DataSource
  sleep_duration_seconds: number | null
  sleep_efficiency_percent: number | null
  resting_heart_rate_bpm: number | null
  avg_hrv_rmssd_ms: number | null
  avg_spo2_percent: number | null
  recovery_score: number | null
}

export interface RecoverySummaryResponse {
  data: RecoverySummary[]
  has_more: boolean
  next_cursor: string | null
}

export interface BloodPressure {
  systolic_mmhg: number | null
  diastolic_mmhg: number | null
}

export interface BodySummary {
  date: string
  source: DataSource
  weight_kg: number | null
  body_fat_percent: number | null
  muscle_mass_kg: number | null
  bmi: number | null
  resting_heart_rate_bpm: number | null
  avg_hrv_rmssd_ms: number | null
  blood_pressure: BloodPressure | null
  basal_body_temperature_celsius: number | null
}

export interface BodySummaryResponse {
  data: BodySummary[]
  has_more: boolean
  next_cursor: string | null
}

// Workout Detail (single workout with full data)
export interface WorkoutDetail {
  id: string
  type: string
  name: string | null
  start_time: string
  end_time: string
  duration_seconds: number | null
  source: DataSource
  calories_kcal: number | null
  distance_meters: number | null
  avg_heart_rate_bpm: number | null
  max_heart_rate_bpm: number | null
  avg_pace_sec_per_km: number | null
  elevation_gain_meters: number | null
  avg_speed_mps: number | null
  max_speed_mps: number | null
  avg_cadence: number | null
  avg_power_watts: number | null
  training_effect_aerobic: number | null
  training_effect_anaerobic: number | null
}

// Apple Health Import
export interface AppleHealthImportResponse {
  status: string
  message: string | null
  records_imported: number
  workouts_imported: number
  errors: string[]
}

// Series Types
export interface SeriesTypeInfo {
  name: string
  description: string | null
  unit: string | null
  category: string | null
}

export interface AvailableSeriesTypesResponse {
  types: SeriesTypeInfo[]
  total: number
}

export interface DateRangeFilters {
  start_date: string
  end_date: string
  limit?: number
}

class ApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = appConfig.api.baseUrl
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }

    // Only set Content-Type if not already set (for FormData, browser sets it automatically)
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // User endpoints
  async getCurrentUser(token: string): Promise<ApiResponse<User>> {
    return this.makeRequest<User>('/me', {
      method: 'GET',
    }, token)
  }

  // Open Wearables endpoints

  async registerWithOpenWearables(token: string): Promise<ApiResponse<RegisterOpenWearablesResponse>> {
    return this.makeRequest<RegisterOpenWearablesResponse>('/wearables/register', {
      method: 'POST',
    }, token)
  }

  async getWearableProviders(token: string): Promise<ApiResponse<ProvidersResponse>> {
    return this.makeRequest<ProvidersResponse>('/wearables/providers?enabled_only=true&cloud_only=true', {
      method: 'GET',
    }, token)
  }

  async authorizeWearableProvider(
    token: string,
    provider: string,
    redirectUri?: string
  ): Promise<ApiResponse<AuthorizationResponse>> {
    const queryParams = new URLSearchParams()
    if (redirectUri) {
      queryParams.append('redirect_uri', redirectUri)
    }
    const queryString = queryParams.toString()
    const endpoint = `/wearables/authorize/${provider}${queryString ? `?${queryString}` : ''}`

    return this.makeRequest<AuthorizationResponse>(endpoint, {
      method: 'GET',
    }, token)
  }

  async getWearableConnections(token: string): Promise<ApiResponse<ConnectionsResponse>> {
    return this.makeRequest<ConnectionsResponse>('/wearables/connections', {
      method: 'GET',
    }, token)
  }

  async getWearableTimeseries(
    token: string,
    filters: TimeseriesFilters
  ): Promise<ApiResponse<TimeseriesResponse>> {
    const queryParams = new URLSearchParams()
    
    queryParams.append('start_time', filters.start_time)
    queryParams.append('end_time', filters.end_time)
    
    // Add types as repeated params
    if (filters.types && filters.types.length > 0) {
      filters.types.forEach(type => queryParams.append('types', type))
    } else {
      queryParams.append('types', 'heart_rate')
    }
    
    if (filters.limit) queryParams.append('limit', filters.limit.toString())
    if (filters.resolution) queryParams.append('resolution', filters.resolution)

    const endpoint = `/wearables/timeseries?${queryParams.toString()}`

    return this.makeRequest<TimeseriesResponse>(endpoint, {
      method: 'GET',
    }, token)
  }

  async syncWearableData(
    token: string,
    provider: string,
    dataType: string = 'all'
  ): Promise<ApiResponse<SyncResponse>> {
    return this.makeRequest<SyncResponse>('/wearables/sync', {
      method: 'POST',
      body: JSON.stringify({
        provider,
        data_type: dataType,
      }),
    }, token)
  }

  async getWearableWorkouts(
    token: string,
    limit: number = 50
  ): Promise<ApiResponse<WorkoutsResponse>> {
    return this.makeRequest<WorkoutsResponse>(`/wearables/workouts?limit=${limit}`, {
      method: 'GET',
    }, token)
  }

  // ============================================
  // Event-based Endpoints (Open Wearables v2)
  // ============================================

  async getEventWorkouts(
    token: string,
    filters: DateRangeFilters
  ): Promise<ApiResponse<EventWorkoutsResponse>> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_date', filters.start_date)
    queryParams.append('end_date', filters.end_date)
    if (filters.limit) queryParams.append('limit', filters.limit.toString())

    return this.makeRequest<EventWorkoutsResponse>(
      `/wearables/events/workouts?${queryParams.toString()}`,
      { method: 'GET' },
      token
    )
  }

  async getSleepSessions(
    token: string,
    filters: DateRangeFilters
  ): Promise<ApiResponse<SleepSessionsResponse>> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_date', filters.start_date)
    queryParams.append('end_date', filters.end_date)
    if (filters.limit) queryParams.append('limit', filters.limit.toString())

    return this.makeRequest<SleepSessionsResponse>(
      `/wearables/events/sleep?${queryParams.toString()}`,
      { method: 'GET' },
      token
    )
  }

  // ============================================
  // Summary Endpoints
  // ============================================

  async getActivitySummary(
    token: string,
    filters: DateRangeFilters
  ): Promise<ApiResponse<ActivitySummaryResponse>> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_date', filters.start_date)
    queryParams.append('end_date', filters.end_date)
    if (filters.limit) queryParams.append('limit', filters.limit.toString())

    return this.makeRequest<ActivitySummaryResponse>(
      `/wearables/summaries/activity?${queryParams.toString()}`,
      { method: 'GET' },
      token
    )
  }

  async getSleepSummary(
    token: string,
    filters: DateRangeFilters
  ): Promise<ApiResponse<SleepSummaryResponse>> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_date', filters.start_date)
    queryParams.append('end_date', filters.end_date)
    if (filters.limit) queryParams.append('limit', filters.limit.toString())

    return this.makeRequest<SleepSummaryResponse>(
      `/wearables/summaries/sleep?${queryParams.toString()}`,
      { method: 'GET' },
      token
    )
  }

  async getRecoverySummary(
    token: string,
    filters: DateRangeFilters
  ): Promise<ApiResponse<RecoverySummaryResponse>> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_date', filters.start_date)
    queryParams.append('end_date', filters.end_date)
    if (filters.limit) queryParams.append('limit', filters.limit.toString())

    return this.makeRequest<RecoverySummaryResponse>(
      `/wearables/summaries/recovery?${queryParams.toString()}`,
      { method: 'GET' },
      token
    )
  }

  async getBodySummary(
    token: string,
    filters: DateRangeFilters
  ): Promise<ApiResponse<BodySummaryResponse>> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_date', filters.start_date)
    queryParams.append('end_date', filters.end_date)
    if (filters.limit) queryParams.append('limit', filters.limit.toString())

    return this.makeRequest<BodySummaryResponse>(
      `/wearables/summaries/body?${queryParams.toString()}`,
      { method: 'GET' },
      token
    )
  }

  // Get detailed data for a single workout
  async getWorkoutDetail(
    token: string,
    provider: string,
    workoutId: string
  ): Promise<ApiResponse<WorkoutDetail>> {
    return this.makeRequest<WorkoutDetail>(
      `/wearables/workouts/${provider}/${workoutId}`,
      { method: 'GET' },
      token
    )
  }

  // Import Apple Health XML export
  async importAppleHealth(
    token: string,
    fileKey: string
  ): Promise<ApiResponse<AppleHealthImportResponse>> {
    const queryParams = new URLSearchParams()
    queryParams.append('file_key', fileKey)

    return this.makeRequest<AppleHealthImportResponse>(
      `/wearables/import/apple-health?${queryParams.toString()}`,
      { method: 'POST' },
      token
    )
  }

  // Get all available timeseries types
  async getAvailableSeriesTypes(
    token: string
  ): Promise<ApiResponse<AvailableSeriesTypesResponse>> {
    return this.makeRequest<AvailableSeriesTypesResponse>(
      '/wearables/series-types',
      { method: 'GET' },
      token
    )
  }
}

export const apiService = new ApiService()
