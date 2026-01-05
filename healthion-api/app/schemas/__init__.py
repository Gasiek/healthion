# Common schemas
from .filter_params import FilterParams
from .user import UserInfo, UserResponse, UserCreate, UserUpdate
from .error_codes import ErrorCode
from .response import UploadDataResponse

# Wearables schemas (Open Wearables integration)
from .wearables import (
    # Enums
    SeriesType,
    # Query params
    ProvidersQueryParams,
    TimeseriesQueryParams,
    DateRangeQueryParams,
    EventWorkoutsQueryParams,
    # Response schemas
    WearableProvider,
    ProvidersResponse,
    AuthorizationResponse,
    WearableConnection,
    ConnectionsResponse,
    TimeseriesDataPoint,
    TimeseriesResponse,
    SyncRequest,
    SyncResponse,
    RegisterOpenWearablesResponse,
    Workout,
    WorkoutsResponse,
    WorkoutDetailResponse,
    DataSource,
    EventWorkout,
    EventWorkoutsResponse,
    SleepStages,
    SleepSession,
    SleepSessionsResponse,
    ActivitySummary,
    ActivitySummaryResponse,
    SleepSummary,
    SleepSummaryResponse,
    RecoverySummary,
    RecoverySummaryResponse,
    BloodPressure,
    BodySummary,
    BodySummaryResponse,
    AppleHealthImportResponse,
    SeriesTypeInfo,
    AvailableSeriesTypesResponse,
)

__all__ = [
    # Common schemas
    "FilterParams",
    "UserInfo",
    "UserResponse",
    "UserCreate",
    "UserUpdate",
    "ErrorCode",
    "UploadDataResponse",
    
    # Wearables schemas - Enums
    "SeriesType",
    # Wearables schemas - Query params
    "ProvidersQueryParams",
    "TimeseriesQueryParams",
    "DateRangeQueryParams",
    "EventWorkoutsQueryParams",
    # Wearables schemas - Responses
    "WearableProvider",
    "ProvidersResponse",
    "AuthorizationResponse",
    "WearableConnection",
    "ConnectionsResponse",
    "TimeseriesDataPoint",
    "TimeseriesResponse",
    "SyncRequest",
    "SyncResponse",
    "RegisterOpenWearablesResponse",
    "Workout",
    "WorkoutsResponse",
    "WorkoutDetailResponse",
    "DataSource",
    "EventWorkout",
    "EventWorkoutsResponse",
    "SleepStages",
    "SleepSession",
    "SleepSessionsResponse",
    "ActivitySummary",
    "ActivitySummaryResponse",
    "SleepSummary",
    "SleepSummaryResponse",
    "RecoverySummary",
    "RecoverySummaryResponse",
    "BloodPressure",
    "BodySummary",
    "BodySummaryResponse",
    "AppleHealthImportResponse",
    "SeriesTypeInfo",
    "AvailableSeriesTypesResponse",
]
