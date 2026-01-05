"""
Schemas for Open Wearables integration.
"""

from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# Enums
# ============================================

class SeriesType(str, Enum):
    """All supported time-series metric types from Open Wearables."""
    
    # Heart & Cardiovascular
    HEART_RATE = "heart_rate"
    RESTING_HEART_RATE = "resting_heart_rate"
    HEART_RATE_VARIABILITY_SDNN = "heart_rate_variability_sdnn"
    HEART_RATE_RECOVERY_ONE_MINUTE = "heart_rate_recovery_one_minute"
    WALKING_HEART_RATE_AVERAGE = "walking_heart_rate_average"
    
    # Blood & Oxygen
    OXYGEN_SATURATION = "oxygen_saturation"
    BLOOD_GLUCOSE = "blood_glucose"
    BLOOD_PRESSURE_SYSTOLIC = "blood_pressure_systolic"
    BLOOD_PRESSURE_DIASTOLIC = "blood_pressure_diastolic"
    
    # Respiratory
    RESPIRATORY_RATE = "respiratory_rate"
    SLEEPING_BREATHING_DISTURBANCES = "sleeping_breathing_disturbances"
    
    # Body Metrics
    HEIGHT = "height"
    WEIGHT = "weight"
    BODY_FAT_PERCENTAGE = "body_fat_percentage"
    BODY_MASS_INDEX = "body_mass_index"
    LEAN_BODY_MASS = "lean_body_mass"
    BODY_TEMPERATURE = "body_temperature"
    
    # Fitness
    VO2_MAX = "vo2_max"
    SIX_MINUTE_WALK_TEST_DISTANCE = "six_minute_walk_test_distance"
    
    # Activity
    STEPS = "steps"
    ENERGY = "energy"
    BASAL_ENERGY = "basal_energy"
    STAND_TIME = "stand_time"
    EXERCISE_TIME = "exercise_time"
    PHYSICAL_EFFORT = "physical_effort"
    FLIGHTS_CLIMBED = "flights_climbed"
    
    # Distance
    DISTANCE_WALKING_RUNNING = "distance_walking_running"
    DISTANCE_CYCLING = "distance_cycling"
    DISTANCE_SWIMMING = "distance_swimming"
    DISTANCE_DOWNHILL_SNOW_SPORTS = "distance_downhill_snow_sports"
    
    # Walking Metrics
    WALKING_STEP_LENGTH = "walking_step_length"
    WALKING_SPEED = "walking_speed"
    WALKING_DOUBLE_SUPPORT_PERCENTAGE = "walking_double_support_percentage"
    WALKING_ASYMMETRY_PERCENTAGE = "walking_asymmetry_percentage"
    WALKING_STEADINESS = "walking_steadiness"
    STAIR_DESCENT_SPEED = "stair_descent_speed"
    STAIR_ASCENT_SPEED = "stair_ascent_speed"
    
    # Running Metrics
    RUNNING_POWER = "running_power"
    RUNNING_SPEED = "running_speed"
    RUNNING_VERTICAL_OSCILLATION = "running_vertical_oscillation"
    RUNNING_GROUND_CONTACT_TIME = "running_ground_contact_time"
    RUNNING_STRIDE_LENGTH = "running_stride_length"
    
    # Swimming & Cycling
    SWIMMING_STROKE_COUNT = "swimming_stroke_count"
    CADENCE = "cadence"
    POWER = "power"
    
    # Environment
    ENVIRONMENTAL_AUDIO_EXPOSURE = "environmental_audio_exposure"
    HEADPHONE_AUDIO_EXPOSURE = "headphone_audio_exposure"
    ENVIRONMENTAL_SOUND_REDUCTION = "environmental_sound_reduction"
    TIME_IN_DAYLIGHT = "time_in_daylight"
    WATER_TEMPERATURE = "water_temperature"


# ============================================
# Query Parameter Schemas
# ============================================

class ProvidersQueryParams(BaseModel):
    """Query parameters for providers list."""
    
    enabled_only: bool = Field(True, description="Only return enabled providers")
    cloud_only: bool = Field(True, description="Only return cloud-based providers")


class TimeseriesQueryParams(BaseModel):
    """Query parameters for timeseries data."""
    
    start_time: str = Field(..., description="Start time (ISO format)")
    end_time: str = Field(..., description="End time (ISO format)")
    types: list[str] = Field(
        default=["heart_rate"],
        description="Types: heart_rate, steps, heart_rate_variability_sdnn, etc. See SeriesType enum for all options."
    )
    limit: int = Field(50, ge=1, le=100, description="Max results (max 100)")
    resolution: Literal["raw", "1min", "5min", "15min", "1hour"] = Field(
        "raw", description="Data resolution"
    )


class DateRangeQueryParams(BaseModel):
    """Query parameters for date range based endpoints."""
    
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    limit: int = Field(50, ge=1, le=100, description="Max results (max 100)")


class EventWorkoutsQueryParams(DateRangeQueryParams):
    """Query parameters for event workouts."""
    
    workout_type: str | None = Field(None, description="Filter by workout type")


# ============================================
# Response Schemas
# ============================================

class WearableProvider(BaseModel):
    """Wearable provider details."""
    
    name: str
    display_name: str | None = None
    icon_url: str | None = None
    has_cloud_api: bool = True
    is_enabled: bool = True


class ProvidersResponse(BaseModel):
    """Response for providers list."""
    
    providers: list[WearableProvider]


class AuthorizationResponse(BaseModel):
    """Response for OAuth authorization URL."""
    
    authorization_url: str
    provider: str


class WearableConnection(BaseModel):
    """User's connection to a wearable provider."""
    
    id: UUID
    provider: str
    connected_at: datetime | None = None
    is_active: bool = True
    last_sync: datetime | None = None


class ConnectionsResponse(BaseModel):
    """Response for user connections."""
    
    connections: list[WearableConnection]
    open_wearables_user_id: UUID | None = None


class TimeseriesDataPoint(BaseModel):
    """Single data point in a time series."""
    
    timestamp: datetime
    type: str | None = None  # Series type (heart_rate, steps, etc.)
    value: float
    unit: str = "bpm"


class TimeseriesResponse(BaseModel):
    """Response for time series data."""
    
    data: list[TimeseriesDataPoint]
    series_type: str
    user_id: UUID
    count: int = 0


class SyncRequest(BaseModel):
    """Request to sync data from a provider."""
    
    provider: str
    data_type: str = "all"  # 'workouts', '247', 'all'


class SyncResponse(BaseModel):
    """Response for sync request."""
    
    status: str
    message: str | None = None
    synced_count: int = 0


class RegisterOpenWearablesResponse(BaseModel):
    """Response for Open Wearables registration."""
    
    open_wearables_user_id: UUID
    already_registered: bool = False


class Workout(BaseModel):
    """Workout data from wearable provider."""
    
    id: UUID
    type: str | None = None
    source_name: str | None = None
    start_datetime: datetime
    end_datetime: datetime | None = None
    duration_seconds: int | None = None
    provider: str | None = None


class WorkoutsResponse(BaseModel):
    """Response for workouts list."""
    
    workouts: list[Workout]
    total: int = 0


# ============================================
# New Event-based Schemas (Open Wearables v2)
# ============================================

class DataSource(BaseModel):
    """Data source information."""
    
    provider: str
    device: str | None = None


class EventWorkout(BaseModel):
    """Rich workout event data from Events API."""
    
    id: UUID
    type: str
    name: str | None = None
    start_time: datetime
    end_time: datetime
    duration_seconds: int | None = None
    source: DataSource
    calories_kcal: float | None = None
    distance_meters: float | None = None
    avg_heart_rate_bpm: int | None = None
    max_heart_rate_bpm: int | None = None
    avg_pace_sec_per_km: int | None = None
    elevation_gain_meters: float | None = None


class EventWorkoutsResponse(BaseModel):
    """Response for event workouts."""
    
    data: list[EventWorkout]
    has_more: bool = False
    next_cursor: str | None = None


class WorkoutDetailResponse(BaseModel):
    """Detailed workout data for a single workout."""
    
    id: UUID
    type: str
    name: str | None = None
    start_time: datetime
    end_time: datetime
    duration_seconds: int | None = None
    source: DataSource
    calories_kcal: float | None = None
    distance_meters: float | None = None
    avg_heart_rate_bpm: int | None = None
    max_heart_rate_bpm: int | None = None
    avg_pace_sec_per_km: int | None = None
    elevation_gain_meters: float | None = None
    # Additional detail fields
    avg_speed_mps: float | None = None
    max_speed_mps: float | None = None
    avg_cadence: int | None = None
    avg_power_watts: int | None = None
    training_effect_aerobic: float | None = None
    training_effect_anaerobic: float | None = None


class SleepStages(BaseModel):
    """Sleep stage durations."""
    
    awake_seconds: int | None = None
    light_seconds: int | None = None
    deep_seconds: int | None = None
    rem_seconds: int | None = None


class SleepSession(BaseModel):
    """Sleep session event data."""
    
    id: UUID
    start_time: datetime
    end_time: datetime
    source: DataSource
    duration_seconds: int
    efficiency_percent: float | None = None
    stages: SleepStages | None = None
    is_nap: bool = False


class SleepSessionsResponse(BaseModel):
    """Response for sleep sessions."""
    
    data: list[SleepSession]
    has_more: bool = False
    next_cursor: str | None = None


# ============================================
# Summary Schemas
# ============================================

class IntensityMinutes(BaseModel):
    """Intensity minutes breakdown."""
    
    light: int | None = None
    moderate: int | None = None
    vigorous: int | None = None


class ActivitySummary(BaseModel):
    """Daily activity summary."""
    
    date: str  # YYYY-MM-DD
    source: DataSource
    steps: int | None = None
    distance_meters: float | None = None
    floors_climbed: int | None = None
    active_calories_kcal: float | None = None
    total_calories_kcal: float | None = None
    active_duration_seconds: int | None = None
    sedentary_duration_seconds: int | None = None
    intensity_minutes: IntensityMinutes | None = None


class ActivitySummaryResponse(BaseModel):
    """Response for activity summaries."""
    
    data: list[ActivitySummary]
    has_more: bool = False
    next_cursor: str | None = None


class SleepSummary(BaseModel):
    """Daily sleep summary."""
    
    date: str  # YYYY-MM-DD
    source: DataSource
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_seconds: int | None = None
    time_in_bed_seconds: int | None = None
    efficiency_percent: float | None = None
    stages: SleepStages | None = None
    interruptions_count: int | None = None
    avg_heart_rate_bpm: int | None = None
    avg_hrv_rmssd_ms: float | None = None
    avg_respiratory_rate: float | None = None
    avg_spo2_percent: float | None = None


class SleepSummaryResponse(BaseModel):
    """Response for sleep summaries."""
    
    data: list[SleepSummary]
    has_more: bool = False
    next_cursor: str | None = None


class RecoverySummary(BaseModel):
    """Daily recovery summary."""
    
    date: str  # YYYY-MM-DD
    source: DataSource
    sleep_duration_seconds: int | None = None
    sleep_efficiency_percent: float | None = None
    resting_heart_rate_bpm: int | None = None
    avg_hrv_rmssd_ms: float | None = None
    avg_spo2_percent: float | None = None
    recovery_score: int | None = Field(None, ge=0, le=100)


class RecoverySummaryResponse(BaseModel):
    """Response for recovery summaries."""
    
    data: list[RecoverySummary]
    has_more: bool = False
    next_cursor: str | None = None


class BloodPressure(BaseModel):
    """Blood pressure reading."""
    
    systolic_mmhg: int | None = None
    diastolic_mmhg: int | None = None


class BodySummary(BaseModel):
    """Daily body metrics summary."""
    
    date: str  # YYYY-MM-DD
    source: DataSource
    weight_kg: float | None = None
    body_fat_percent: float | None = None
    muscle_mass_kg: float | None = None
    bmi: float | None = None
    resting_heart_rate_bpm: int | None = None
    avg_hrv_rmssd_ms: float | None = None
    blood_pressure: BloodPressure | None = None
    basal_body_temperature_celsius: float | None = None


class BodySummaryResponse(BaseModel):
    """Response for body summaries."""
    
    data: list[BodySummary]
    has_more: bool = False
    next_cursor: str | None = None


# ============================================
# Apple Health Import Schemas
# ============================================

class AppleHealthImportResponse(BaseModel):
    """Response for Apple Health XML import."""
    
    status: str
    message: str | None = None
    records_imported: int = 0
    workouts_imported: int = 0
    errors: list[str] = Field(default_factory=list)


# ============================================
# Available Series Types Response
# ============================================

class SeriesTypeInfo(BaseModel):
    """Information about a series type."""
    
    name: str
    description: str | None = None
    unit: str | None = None
    category: str | None = None


class AvailableSeriesTypesResponse(BaseModel):
    """Response listing all available series types."""
    
    types: list[SeriesTypeInfo]
    total: int
