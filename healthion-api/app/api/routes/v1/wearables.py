"""
Wearables integration routes for Open Wearables platform.

Handles OAuth flows, provider management, and data synchronization
with wearable devices (Garmin, Polar, Suunto).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import DbSession
from app.models import User
from app.schemas import UserInfo
from app.schemas.wearables import (
    ActivitySummaryResponse,
    AppleHealthImportResponse,
    AuthorizationResponse,
    AvailableSeriesTypesResponse,
    BodySummaryResponse,
    ConnectionsResponse,
    DateRangeQueryParams,
    EventWorkoutsQueryParams,
    EventWorkoutsResponse,
    ProvidersQueryParams,
    ProvidersResponse,
    RecoverySummaryResponse,
    RegisterOpenWearablesResponse,
    SleepSessionsResponse,
    SleepSummaryResponse,
    SyncRequest,
    SyncResponse,
    TimeseriesQueryParams,
    TimeseriesResponse,
    WorkoutDetailResponse,
    WorkoutsResponse,
)
from app.services import wearables_service
from app.utils.auth_dependencies import get_current_user

router = APIRouter()


def _get_user_or_404(db: DbSession, user_id) -> User:
    """Get user by ID or raise 404."""
    user = wearables_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.post("/register", response_model=RegisterOpenWearablesResponse)
async def register_with_open_wearables(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
) -> RegisterOpenWearablesResponse:
    """Register current user with Open Wearables platform."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.register_user(db, user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to register with Open Wearables: {str(e)}"
        )


@router.get("/providers", response_model=ProvidersResponse)
async def get_providers(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    query_params: ProvidersQueryParams = Depends(),
) -> ProvidersResponse:
    """Get list of available wearable providers."""
    try:
        return await wearables_service.get_providers(query_params)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch providers: {str(e)}"
        )


@router.get("/authorize/{provider}", response_model=AuthorizationResponse)
async def authorize_provider(
    provider: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
    redirect_uri: str | None = Query(None, description="Custom redirect URI"),
) -> AuthorizationResponse:
    """Initiate OAuth flow for a wearable provider."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.get_authorization_url(
            db, user, provider, redirect_uri
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to get authorization URL: {str(e)}"
        )


@router.get("/connections", response_model=ConnectionsResponse)
async def get_connections(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
) -> ConnectionsResponse:
    """Get all wearable provider connections for the current user."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.get_connections(user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch connections: {str(e)}"
        )


@router.get("/timeseries", response_model=TimeseriesResponse)
async def get_timeseries(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
    query_params: TimeseriesQueryParams = Depends(),
) -> TimeseriesResponse:
    """Get time series data (heart rate, steps, HRV) from Open Wearables."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.get_timeseries(
            user, current_user.user_id, query_params
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch timeseries: {str(e)}"
        )


@router.post("/sync", response_model=SyncResponse)
async def sync_data(
    sync_request: SyncRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
) -> SyncResponse:
    """Trigger data synchronization from a wearable provider."""
    user = _get_user_or_404(db, current_user.user_id)
    
    if not user.open_wearables_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not registered with Open Wearables"
        )
    
    try:
        return await wearables_service.sync_data(user, sync_request)
    except Exception as e:
        error_msg = str(e)
        if "already exists" in error_msg or "UniqueViolation" in error_msg:
            return SyncResponse(
                status="success",
                message="Data already synced - no new data to import",
                synced_count=0,
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to sync data: {error_msg}"
        )


@router.get("/workouts", response_model=WorkoutsResponse)
async def get_workouts(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
    limit: int = Query(50, ge=1, le=100, description="Max results"),
) -> WorkoutsResponse:
    """Get workouts from Open Wearables."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.get_workouts(user, limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch workouts: {str(e)}"
        )


# ============================================
# Event-based Endpoints
# ============================================

@router.get("/events/workouts", response_model=EventWorkoutsResponse)
async def get_event_workouts(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
    query_params: EventWorkoutsQueryParams = Depends(),
) -> EventWorkoutsResponse:
    """Get rich workout events with calories, distance, heart rate data."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.get_event_workouts(user, query_params)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch workouts: {str(e)}"
        )


@router.get("/events/sleep", response_model=SleepSessionsResponse)
async def get_sleep_sessions(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
    query_params: DateRangeQueryParams = Depends(),
) -> SleepSessionsResponse:
    """Get sleep sessions with stage breakdown (awake, light, deep, REM)."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.get_sleep_sessions(user, query_params)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch sleep sessions: {str(e)}"
        )


# ============================================
# Summary Endpoints
# ============================================

@router.get("/summaries/activity", response_model=ActivitySummaryResponse)
async def get_activity_summary(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
    query_params: DateRangeQueryParams = Depends(),
) -> ActivitySummaryResponse:
    """Get daily activity summaries: steps, calories, distance, active time."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.get_activity_summary(user, query_params)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch activity summary: {str(e)}"
        )


@router.get("/summaries/sleep", response_model=SleepSummaryResponse)
async def get_sleep_summary(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
    query_params: DateRangeQueryParams = Depends(),
) -> SleepSummaryResponse:
    """Get daily sleep summaries: duration, efficiency, stages, HRV."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.get_sleep_summary(user, query_params)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch sleep summary: {str(e)}"
        )


@router.get("/summaries/recovery", response_model=RecoverySummaryResponse)
async def get_recovery_summary(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
    query_params: DateRangeQueryParams = Depends(),
) -> RecoverySummaryResponse:
    """Get daily recovery summaries: recovery score, HRV, resting HR."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.get_recovery_summary(user, query_params)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch recovery summary: {str(e)}"
        )


@router.get("/summaries/body", response_model=BodySummaryResponse)
async def get_body_summary(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
    query_params: DateRangeQueryParams = Depends(),
) -> BodySummaryResponse:
    """Get daily body metrics: weight, body fat, BMI, resting HR, HRV, blood pressure."""
    user = _get_user_or_404(db, current_user.user_id)
    
    try:
        return await wearables_service.get_body_summary(user, query_params)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch body summary: {str(e)}"
        )


# ============================================
# Workout Detail & Apple Health Import
# ============================================

@router.get("/workouts/{provider}/{workout_id}", response_model=WorkoutDetailResponse)
async def get_workout_detail(
    provider: str,
    workout_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
) -> WorkoutDetailResponse:
    """Get detailed data for a single workout from a specific provider."""
    user = _get_user_or_404(db, current_user.user_id)
    
    if not user.open_wearables_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not registered with Open Wearables"
        )
    
    try:
        return await wearables_service.get_workout_detail(user, provider, workout_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch workout detail: {str(e)}"
        )


@router.post("/import/apple-health", response_model=AppleHealthImportResponse)
async def import_apple_health(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    db: DbSession,
    file_key: str = Query(..., description="S3 file key from presigned upload"),
) -> AppleHealthImportResponse:
    """
    Import Apple Health XML export.
    
    Steps:
    1. Get a presigned upload URL from Open Wearables
    2. Upload the export.xml file to the presigned URL
    3. Call this endpoint with the file_key to process the import
    """
    user = _get_user_or_404(db, current_user.user_id)
    
    if not user.open_wearables_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not registered with Open Wearables"
        )
    
    try:
        return await wearables_service.import_apple_health_xml(user, file_key)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to import Apple Health data: {str(e)}"
        )


# ============================================
# Metadata Endpoints
# ============================================

@router.get("/series-types", response_model=AvailableSeriesTypesResponse)
async def get_available_series_types(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> AvailableSeriesTypesResponse:
    """
    Get list of all available timeseries types.
    
    Returns 47 different metric types organized by category:
    - cardiovascular: heart_rate, resting_heart_rate, hrv, etc.
    - blood: oxygen_saturation, blood_glucose, blood_pressure
    - respiratory: respiratory_rate, breathing_disturbances
    - body: weight, body_fat, bmi, temperature
    - fitness: vo2_max, walk_test_distance
    - activity: steps, energy, stand_time, exercise_time
    - distance: walking_running, cycling, swimming
    - walking: step_length, speed, steadiness
    - running: power, speed, ground_contact_time
    - swimming: stroke_count
    - cycling: cadence, power
    - environment: audio_exposure, daylight, water_temperature
    """
    return wearables_service.get_available_series_types()
