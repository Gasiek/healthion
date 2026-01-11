"""
Wearables service for Open Wearables integration.

Handles business logic for wearable data operations, delegating
API calls to the Open Wearables client.
"""

from logging import Logger, getLogger
from uuid import UUID

from fastapi import HTTPException, status

from app.database import DbSession
from app.models import User
from app.schemas.wearables import (
    ActivitySummary,
    ActivitySummaryResponse,
    AppleHealthImportResponse,
    AuthorizationResponse,
    BloodPressure,
    BodySummary,
    BodySummaryResponse,
    ConnectionsResponse,
    DataSource,
    DateRangeQueryParams,
    EventWorkout,
    EventWorkoutsQueryParams,
    EventWorkoutsResponse,
    ProvidersQueryParams,
    ProvidersResponse,
    RecoverySummary,
    RecoverySummaryResponse,
    RegisterOpenWearablesResponse,
    SeriesType,
    SeriesTypeInfo,
    AvailableSeriesTypesResponse,
    SleepSession,
    SleepSessionsResponse,
    SleepStages,
    SleepSummary,
    SleepSummaryResponse,
    SyncRequest,
    SyncResponse,
    TimeseriesDataPoint,
    TimeseriesQueryParams,
    TimeseriesResponse,
    WearableConnection,
    WearableProvider,
    Workout,
    WorkoutDetailResponse,
    WorkoutsResponse,
)
from app.services.open_wearables_client import open_wearables_client
from app.services.user_service import user_service


class WearablesService:
    """Service for wearable device data operations."""

    def __init__(self, log: Logger | None = None):
        self.log = log or getLogger(__name__)
        self.client = open_wearables_client

    def _ensure_client_configured(self) -> None:
        """Ensure the Open Wearables client is configured, raise HTTP 503 if not."""
        if not self.client.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Open Wearables integration is not configured. Contact administrator."
            )

    def get_user_by_id(self, db: DbSession, user_id: UUID) -> User | None:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    async def register_user(
        self,
        db: DbSession,
        user: User,
    ) -> RegisterOpenWearablesResponse:
        """Register user with Open Wearables platform."""
        if user.open_wearables_user_id:
            return RegisterOpenWearablesResponse(
                open_wearables_user_id=user.open_wearables_user_id,
                already_registered=True
            )
        
        updated_user = await user_service.register_with_open_wearables(db, user)
        return RegisterOpenWearablesResponse(
            open_wearables_user_id=updated_user.open_wearables_user_id,  # type: ignore
            already_registered=False
        )

    async def get_providers(
        self,
        query_params: ProvidersQueryParams,
    ) -> ProvidersResponse:
        """Get list of available wearable providers."""
        self._ensure_client_configured()
        providers_data = await self.client.get_providers(
            enabled_only=query_params.enabled_only,
            cloud_only=query_params.cloud_only
        )
        
        providers = [
            WearableProvider(
                name=p.get("name", ""),
                display_name=p.get("display_name") or p.get("name", "").title(),
                icon_url=p.get("icon_url"),
                has_cloud_api=p.get("has_cloud_api", True),
                is_enabled=p.get("is_enabled", True),
            )
            for p in providers_data
        ]
        
        return ProvidersResponse(providers=providers)

    async def get_authorization_url(
        self,
        db: DbSession,
        user: User,
        provider: str,
        redirect_uri: str | None = None,
    ) -> AuthorizationResponse:
        """Get OAuth authorization URL for a provider."""
        # Ensure user is registered with Open Wearables
        if not user.open_wearables_user_id:
            user = await user_service.register_with_open_wearables(db, user)
        
        result = await self.client.get_authorization_url(
            provider=provider.lower(),
            user_id=user.open_wearables_user_id,  # type: ignore
            redirect_uri=redirect_uri
        )
        
        return AuthorizationResponse(
            authorization_url=result.get("authorization_url", ""),
            provider=provider
        )

    async def get_connections(
        self,
        user: User,
    ) -> ConnectionsResponse:
        """Get all wearable provider connections for a user."""
        if not user.open_wearables_user_id:
            return ConnectionsResponse(
                connections=[],
                open_wearables_user_id=None
            )
        
        connections_data = await self.client.get_user_connections(
            user_id=user.open_wearables_user_id
        )

        connections = [
            WearableConnection(
                id=UUID(c.get("id", "")),
                provider=c.get("provider", ""),
                connected_at=c.get("created_at"),
                is_active=c.get("status") == "active",
                last_sync=c.get("last_synced_at"),
            )
            for c in connections_data
        ]
        
        return ConnectionsResponse(
            connections=connections,
            open_wearables_user_id=user.open_wearables_user_id
        )

    async def get_timeseries(
        self,
        user: User,
        user_id: UUID,
        query_params: TimeseriesQueryParams,
    ) -> TimeseriesResponse:
        """Get time series data from Open Wearables."""
        if not user.open_wearables_user_id:
            return TimeseriesResponse(
                data=[],
                series_type=",".join(query_params.types),
                user_id=user_id,
                count=0
            )
        
        result = await self.client.get_timeseries(
            user_id=user.open_wearables_user_id,
            start_time=query_params.start_time,
            end_time=query_params.end_time,
            types=query_params.types,
            limit=query_params.limit,
            resolution=query_params.resolution,
        )
        
        items = result.get("data", [])
        data_points = [
            TimeseriesDataPoint(
                timestamp=d.get("timestamp") or d.get("recorded_at"),
                value=d.get("value", d.get("bpm", 0)),
                unit=d.get("unit", "bpm"),
            )
            for d in items
        ]
        
        return TimeseriesResponse(
            data=data_points,
            series_type=",".join(query_params.types),
            user_id=user_id,
            count=len(data_points)
        )

    async def sync_data(
        self,
        user: User,
        sync_request: SyncRequest,
    ) -> SyncResponse:
        """Trigger data synchronization from a wearable provider."""
        result = await self.client.sync_user_data(
            user_id=user.open_wearables_user_id,  # type: ignore
            provider=sync_request.provider,
            data_type=sync_request.data_type,
        )
        
        return SyncResponse(
            status=result.get("status", "success"),
            message=result.get("message"),
            synced_count=result.get("synced_count", 0),
        )

    async def get_workouts(
        self,
        user: User,
        limit: int = 50,
    ) -> WorkoutsResponse:
        """Get workouts from Open Wearables."""
        if not user.open_wearables_user_id:
            return WorkoutsResponse(workouts=[], total=0)
        
        workouts_data = await self.client.get_workouts(
            user_id=user.open_wearables_user_id,
            limit=limit,
        )
        
        workouts = [
            Workout(
                id=w.get("id"),
                type=w.get("type"),
                source_name=self._get_source_provider(w),
                start_datetime=w.get("start_time") or w.get("start_datetime"),
                end_datetime=w.get("end_time") or w.get("end_datetime"),
                duration_seconds=w.get("duration_seconds"),
                provider=self._get_source_provider(w),
            )
            for w in workouts_data
        ]
        
        return WorkoutsResponse(
            workouts=workouts,
            total=len(workouts)
        )

    async def get_event_workouts(
        self,
        user: User,
        query_params: EventWorkoutsQueryParams,
    ) -> EventWorkoutsResponse:
        """Get rich workout events."""
        if not user.open_wearables_user_id:
            return EventWorkoutsResponse(data=[], has_more=False)
        
        result = await self.client.get_event_workouts(
            user_id=user.open_wearables_user_id,
            start_date=query_params.start_date,
            end_date=query_params.end_date,
            workout_type=query_params.workout_type,
            limit=query_params.limit,
        )
        
        workouts = [
            EventWorkout(
                id=w.get("id"),
                type=w.get("type", "unknown"),
                name=w.get("name"),
                start_time=w.get("start_time"),
                end_time=w.get("end_time"),
                duration_seconds=w.get("duration_seconds"),
                source=self._build_data_source(w),
                calories_kcal=w.get("calories_kcal"),
                distance_meters=w.get("distance_meters"),
                avg_heart_rate_bpm=w.get("avg_heart_rate_bpm"),
                max_heart_rate_bpm=w.get("max_heart_rate_bpm"),
                avg_pace_sec_per_km=w.get("avg_pace_sec_per_km"),
                elevation_gain_meters=w.get("elevation_gain_meters"),
            )
            for w in result.get("data", [])
        ]
        
        pagination = result.get("pagination", {})
        return EventWorkoutsResponse(
            data=workouts,
            has_more=pagination.get("has_more", False),
            next_cursor=pagination.get("next_cursor"),
        )

    async def get_sleep_sessions(
        self,
        user: User,
        query_params: DateRangeQueryParams,
    ) -> SleepSessionsResponse:
        """Get sleep sessions with stage breakdown."""
        if not user.open_wearables_user_id:
            return SleepSessionsResponse(data=[], has_more=False)
        
        result = await self.client.get_sleep_sessions(
            user_id=user.open_wearables_user_id,
            start_date=query_params.start_date,
            end_date=query_params.end_date,
            limit=query_params.limit,
        )

        sessions = [
            SleepSession(
                id=s.get("id"),
                start_time=s.get("start_time"),
                end_time=s.get("end_time"),
                source=self._build_data_source(s),
                duration_seconds=s.get("duration_seconds", 0),
                efficiency_percent=s.get("efficiency_percent"),
                stages=self._build_sleep_stages(s.get("stages")),
                is_nap=s.get("is_nap", False),
            )
            for s in result.get("data", [])
        ]
        
        pagination = result.get("pagination", {})
        return SleepSessionsResponse(
            data=sessions,
            has_more=pagination.get("has_more", False),
            next_cursor=pagination.get("next_cursor"),
        )

    async def get_activity_summary(
        self,
        user: User,
        query_params: DateRangeQueryParams,
    ) -> ActivitySummaryResponse:
        """Get daily activity summaries."""
        if not user.open_wearables_user_id:
            return ActivitySummaryResponse(data=[], has_more=False)
        
        result = await self.client.get_activity_summary(
            user_id=user.open_wearables_user_id,
            start_date=query_params.start_date,
            end_date=query_params.end_date,
            limit=query_params.limit,
        )
        
        summaries = [
            ActivitySummary(
                date=s.get("date"),
                source=self._build_data_source(s),
                steps=s.get("steps"),
                distance_meters=s.get("distance_meters"),
                floors_climbed=s.get("floors_climbed"),
                active_calories_kcal=s.get("active_calories_kcal"),
                total_calories_kcal=s.get("total_calories_kcal"),
                active_duration_seconds=s.get("active_duration_seconds"),
                sedentary_duration_seconds=s.get("sedentary_duration_seconds"),
            )
            for s in result.get("data", [])
        ]
        
        pagination = result.get("pagination", {})
        return ActivitySummaryResponse(
            data=summaries,
            has_more=pagination.get("has_more", False),
            next_cursor=pagination.get("next_cursor"),
        )

    async def get_sleep_summary(
        self,
        user: User,
        query_params: DateRangeQueryParams,
    ) -> SleepSummaryResponse:
        """Get daily sleep summaries."""
        if not user.open_wearables_user_id:
            return SleepSummaryResponse(data=[], has_more=False)
        
        result = await self.client.get_sleep_summary(
            user_id=user.open_wearables_user_id,
            start_date=query_params.start_date,
            end_date=query_params.end_date,
            limit=query_params.limit,
        )
        
        summaries = [
            SleepSummary(
                date=s.get("date"),
                source=self._build_data_source(s),
                start_time=s.get("start_time"),
                end_time=s.get("end_time"),
                duration_seconds=s.get("duration_seconds"),
                time_in_bed_seconds=s.get("time_in_bed_seconds"),
                efficiency_percent=s.get("efficiency_percent"),
                stages=self._build_sleep_stages(s.get("stages")),
                interruptions_count=s.get("interruptions_count"),
                avg_heart_rate_bpm=s.get("avg_heart_rate_bpm"),
                avg_hrv_rmssd_ms=s.get("avg_hrv_rmssd_ms"),
                avg_respiratory_rate=s.get("avg_respiratory_rate"),
                avg_spo2_percent=s.get("avg_spo2_percent"),
            )
            for s in result.get("data", [])
        ]
        
        pagination = result.get("pagination", {})
        return SleepSummaryResponse(
            data=summaries,
            has_more=pagination.get("has_more", False),
            next_cursor=pagination.get("next_cursor"),
        )

    async def get_recovery_summary(
        self,
        user: User,
        query_params: DateRangeQueryParams,
    ) -> RecoverySummaryResponse:
        """Get daily recovery summaries."""
        if not user.open_wearables_user_id:
            return RecoverySummaryResponse(data=[], has_more=False)
        
        result = await self.client.get_recovery_summary(
            user_id=user.open_wearables_user_id,
            start_date=query_params.start_date,
            end_date=query_params.end_date,
            limit=query_params.limit,
        )
        
        summaries = [
            RecoverySummary(
                date=s.get("date"),
                source=self._build_data_source(s),
                sleep_duration_seconds=s.get("sleep_duration_seconds"),
                sleep_efficiency_percent=s.get("sleep_efficiency_percent"),
                resting_heart_rate_bpm=s.get("resting_heart_rate_bpm"),
                avg_hrv_rmssd_ms=s.get("avg_hrv_rmssd_ms"),
                avg_spo2_percent=s.get("avg_spo2_percent"),
                recovery_score=s.get("recovery_score"),
            )
            for s in result.get("data", [])
        ]
        
        pagination = result.get("pagination", {})
        return RecoverySummaryResponse(
            data=summaries,
            has_more=pagination.get("has_more", False),
            next_cursor=pagination.get("next_cursor"),
        )

    async def get_body_summary(
        self,
        user: User,
        query_params: DateRangeQueryParams,
    ) -> BodySummaryResponse:
        """Get daily body metrics summaries."""
        if not user.open_wearables_user_id:
            return BodySummaryResponse(data=[], has_more=False)
        
        result = await self.client.get_body_summary(
            user_id=user.open_wearables_user_id,
            start_date=query_params.start_date,
            end_date=query_params.end_date,
            limit=query_params.limit,
        )
        
        summaries = [
            BodySummary(
                date=s.get("date"),
                source=self._build_data_source(s),
                weight_kg=s.get("weight_kg"),
                body_fat_percent=s.get("body_fat_percent"),
                muscle_mass_kg=s.get("muscle_mass_kg"),
                bmi=s.get("bmi"),
                resting_heart_rate_bpm=s.get("resting_heart_rate_bpm"),
                avg_hrv_rmssd_ms=s.get("avg_hrv_rmssd_ms"),
                blood_pressure=self._build_blood_pressure(s.get("blood_pressure")),
                basal_body_temperature_celsius=s.get("basal_body_temperature_celsius"),
            )
            for s in result.get("data", [])
        ]
        
        pagination = result.get("pagination", {})
        return BodySummaryResponse(
            data=summaries,
            has_more=pagination.get("has_more", False),
            next_cursor=pagination.get("next_cursor"),
        )

    async def get_workout_detail(
        self,
        user: User,
        provider: str,
        workout_id: str,
    ) -> WorkoutDetailResponse:
        """Get detailed data for a single workout."""
        if not user.open_wearables_user_id:
            raise ValueError("User not registered with Open Wearables")
        
        result = await self.client.get_workout_detail(
            user_id=user.open_wearables_user_id,
            provider=provider,
            workout_id=workout_id,
        )
        
        return WorkoutDetailResponse(
            id=result.get("id"),
            type=result.get("type", "unknown"),
            name=result.get("name"),
            start_time=result.get("start_time"),
            end_time=result.get("end_time"),
            duration_seconds=result.get("duration_seconds"),
            source=self._build_data_source(result),
            calories_kcal=result.get("calories_kcal"),
            distance_meters=result.get("distance_meters"),
            avg_heart_rate_bpm=result.get("avg_heart_rate_bpm"),
            max_heart_rate_bpm=result.get("max_heart_rate_bpm"),
            avg_pace_sec_per_km=result.get("avg_pace_sec_per_km"),
            elevation_gain_meters=result.get("elevation_gain_meters"),
            avg_speed_mps=result.get("avg_speed_mps"),
            max_speed_mps=result.get("max_speed_mps"),
            avg_cadence=result.get("avg_cadence"),
            avg_power_watts=result.get("avg_power_watts"),
            training_effect_aerobic=result.get("training_effect_aerobic"),
            training_effect_anaerobic=result.get("training_effect_anaerobic"),
        )

    async def import_apple_health_xml(
        self,
        user: User,
        file_key: str,
    ) -> AppleHealthImportResponse:
        """Import Apple Health XML export for a user."""
        if not user.open_wearables_user_id:
            raise ValueError("User not registered with Open Wearables")
        
        result = await self.client.import_apple_health_xml(
            user_id=user.open_wearables_user_id,
            file_key=file_key,
        )
        
        return AppleHealthImportResponse(
            status=result.get("status", "success"),
            message=result.get("message"),
            records_imported=result.get("records_imported", 0),
            workouts_imported=result.get("workouts_imported", 0),
            errors=result.get("errors", []),
        )

    def get_available_series_types(self) -> AvailableSeriesTypesResponse:
        """Get list of all available timeseries types."""
        # Define categories and units for series types
        type_info = {
            # Heart & Cardiovascular
            SeriesType.HEART_RATE: ("Heart Rate", "bpm", "cardiovascular"),
            SeriesType.RESTING_HEART_RATE: ("Resting Heart Rate", "bpm", "cardiovascular"),
            SeriesType.HEART_RATE_VARIABILITY_SDNN: ("Heart Rate Variability (SDNN)", "ms", "cardiovascular"),
            SeriesType.HEART_RATE_RECOVERY_ONE_MINUTE: ("Heart Rate Recovery (1 min)", "bpm", "cardiovascular"),
            SeriesType.WALKING_HEART_RATE_AVERAGE: ("Walking Heart Rate Average", "bpm", "cardiovascular"),
            # Blood & Oxygen
            SeriesType.OXYGEN_SATURATION: ("Blood Oxygen Saturation", "%", "blood"),
            SeriesType.BLOOD_GLUCOSE: ("Blood Glucose", "mg/dL", "blood"),
            SeriesType.BLOOD_PRESSURE_SYSTOLIC: ("Blood Pressure (Systolic)", "mmHg", "blood"),
            SeriesType.BLOOD_PRESSURE_DIASTOLIC: ("Blood Pressure (Diastolic)", "mmHg", "blood"),
            # Respiratory
            SeriesType.RESPIRATORY_RATE: ("Respiratory Rate", "breaths/min", "respiratory"),
            SeriesType.SLEEPING_BREATHING_DISTURBANCES: ("Sleep Breathing Disturbances", "events/hr", "respiratory"),
            # Body Metrics
            SeriesType.HEIGHT: ("Height", "cm", "body"),
            SeriesType.WEIGHT: ("Weight", "kg", "body"),
            SeriesType.BODY_FAT_PERCENTAGE: ("Body Fat Percentage", "%", "body"),
            SeriesType.BODY_MASS_INDEX: ("Body Mass Index (BMI)", "kg/m²", "body"),
            SeriesType.LEAN_BODY_MASS: ("Lean Body Mass", "kg", "body"),
            SeriesType.BODY_TEMPERATURE: ("Body Temperature", "°C", "body"),
            # Fitness
            SeriesType.VO2_MAX: ("VO2 Max", "mL/kg/min", "fitness"),
            SeriesType.SIX_MINUTE_WALK_TEST_DISTANCE: ("6-Minute Walk Test Distance", "m", "fitness"),
            # Activity
            SeriesType.STEPS: ("Steps", "count", "activity"),
            SeriesType.ENERGY: ("Active Energy", "kcal", "activity"),
            SeriesType.BASAL_ENERGY: ("Basal Energy", "kcal", "activity"),
            SeriesType.STAND_TIME: ("Stand Time", "min", "activity"),
            SeriesType.EXERCISE_TIME: ("Exercise Time", "min", "activity"),
            SeriesType.PHYSICAL_EFFORT: ("Physical Effort", "MET", "activity"),
            SeriesType.FLIGHTS_CLIMBED: ("Flights Climbed", "count", "activity"),
            # Distance
            SeriesType.DISTANCE_WALKING_RUNNING: ("Walking + Running Distance", "km", "distance"),
            SeriesType.DISTANCE_CYCLING: ("Cycling Distance", "km", "distance"),
            SeriesType.DISTANCE_SWIMMING: ("Swimming Distance", "m", "distance"),
            SeriesType.DISTANCE_DOWNHILL_SNOW_SPORTS: ("Downhill Snow Sports Distance", "km", "distance"),
            # Walking Metrics
            SeriesType.WALKING_STEP_LENGTH: ("Walking Step Length", "cm", "walking"),
            SeriesType.WALKING_SPEED: ("Walking Speed", "km/h", "walking"),
            SeriesType.WALKING_DOUBLE_SUPPORT_PERCENTAGE: ("Double Support Time", "%", "walking"),
            SeriesType.WALKING_ASYMMETRY_PERCENTAGE: ("Walking Asymmetry", "%", "walking"),
            SeriesType.WALKING_STEADINESS: ("Walking Steadiness", "%", "walking"),
            SeriesType.STAIR_DESCENT_SPEED: ("Stair Descent Speed", "m/s", "walking"),
            SeriesType.STAIR_ASCENT_SPEED: ("Stair Ascent Speed", "m/s", "walking"),
            # Running Metrics
            SeriesType.RUNNING_POWER: ("Running Power", "W", "running"),
            SeriesType.RUNNING_SPEED: ("Running Speed", "km/h", "running"),
            SeriesType.RUNNING_VERTICAL_OSCILLATION: ("Vertical Oscillation", "cm", "running"),
            SeriesType.RUNNING_GROUND_CONTACT_TIME: ("Ground Contact Time", "ms", "running"),
            SeriesType.RUNNING_STRIDE_LENGTH: ("Running Stride Length", "m", "running"),
            # Swimming & Cycling
            SeriesType.SWIMMING_STROKE_COUNT: ("Swimming Stroke Count", "count", "swimming"),
            SeriesType.CADENCE: ("Cadence", "rpm", "cycling"),
            SeriesType.POWER: ("Power", "W", "cycling"),
            # Environment
            SeriesType.ENVIRONMENTAL_AUDIO_EXPOSURE: ("Environmental Audio Exposure", "dB", "environment"),
            SeriesType.HEADPHONE_AUDIO_EXPOSURE: ("Headphone Audio Exposure", "dB", "environment"),
            SeriesType.ENVIRONMENTAL_SOUND_REDUCTION: ("Sound Reduction", "dB", "environment"),
            SeriesType.TIME_IN_DAYLIGHT: ("Time in Daylight", "min", "environment"),
            SeriesType.WATER_TEMPERATURE: ("Water Temperature", "°C", "environment"),
        }
        
        types = []
        for series_type in SeriesType:
            info = type_info.get(series_type, (series_type.value.replace("_", " ").title(), None, None))
            types.append(SeriesTypeInfo(
                name=series_type.value,
                description=info[0],
                unit=info[1],
                category=info[2],
            ))
        
        return AvailableSeriesTypesResponse(types=types, total=len(types))

    # ============================================
    # Helper Methods
    # ============================================

    def _get_source_provider(self, data: dict) -> str | None:
        """Extract provider from source dict or fallback fields."""
        source = data.get("source")
        if isinstance(source, dict):
            return source.get("provider")
        return data.get("source_name") or data.get("provider_id")

    def _build_data_source(self, data: dict) -> DataSource:
        """Build DataSource from API response data."""
        source = data.get("source", {})
        return DataSource(
            provider=source.get("provider", "unknown") if isinstance(source, dict) else "unknown",
            device=source.get("device") if isinstance(source, dict) else None,
        )

    def _build_sleep_stages(self, stages: dict | None) -> SleepStages | None:
        """Build SleepStages from API response data."""
        if not stages:
            return None
        return SleepStages(**stages)

    def _build_blood_pressure(self, bp: dict | None) -> BloodPressure | None:
        """Build BloodPressure from API response data."""
        if not bp:
            return None
        return BloodPressure(
            systolic_mmhg=bp.get("systolic_mmhg"),
            diastolic_mmhg=bp.get("diastolic_mmhg"),
        )


# Singleton instance
wearables_service = WearablesService()

