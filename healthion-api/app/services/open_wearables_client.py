"""
Open Wearables API client for healthion integration.

This client handles communication with the Open Wearables platform
for wearable device data integration (Garmin, Polar, Suunto).
"""

import asyncio
from logging import Logger, getLogger
from typing import Any
from uuid import UUID

import httpx

from app.config import settings

# Lock to prevent concurrent user creation (race condition prevention)
_user_creation_locks: dict[str, asyncio.Lock] = {}


class OpenWearablesConfigurationError(Exception):
    """Raised when Open Wearables API is not properly configured."""
    pass


class OpenWearablesClient:
    """HTTP client for Open Wearables API."""

    def __init__(self, log: Logger | None = None):
        self.base_url = settings.open_wearables_api_url.rstrip("/")
        self.api_key = settings.open_wearables_api_key
        self.log = log or getLogger(__name__)
        
        if not self.api_key:
            self.log.warning(
                "OPEN_WEARABLES_API_KEY is not configured. "
                "Open Wearables integration will not work."
            )

    @property
    def is_configured(self) -> bool:
        """Check if the client is properly configured."""
        return bool(self.api_key)

    def _ensure_configured(self) -> None:
        """Raise an error if the client is not configured."""
        if not self.is_configured:
            raise OpenWearablesConfigurationError(
                "Open Wearables API key is not configured. "
                "Set OPEN_WEARABLES_API_KEY environment variable."
            )

    def _get_headers(self) -> dict[str, str]:
        """Get headers for API requests."""
        self._ensure_configured()
        return {
            "X-Open-Wearables-API-Key": self.api_key,
            "Content-Type": "application/json",
        }

    async def find_user_by_external_id(self, external_id: str) -> dict[str, Any] | None:
        """
        Find a user in Open Wearables by external_user_id.
        
        This is the preferred lookup method as external_user_id is unique
        and directly maps to the Healthion user (auth0_id).
        
        Args:
            external_id: External user ID (Healthion auth0_id)
            
        Returns:
            User data if found, None otherwise
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users",
                headers=self._get_headers(),
                params={"external_user_id": external_id, "limit": 1},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            
            items = data.get("items", [])
            return items[0] if items else None

    async def find_user_by_email(self, email: str) -> dict[str, Any] | None:
        """
        Find a user in Open Wearables by email.
        
        Note: Email is not unique in OW. Prefer find_user_by_external_id when possible.
        
        Args:
            email: User's email address
            
        Returns:
            User data if found, None otherwise
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users",
                headers=self._get_headers(),
                params={"limit": 100},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            
            for user in data.get("items", []):
                if user.get("email") == email:
                    return user
            return None

    async def create_user(self, external_id: str, email: str) -> dict[str, Any]:
        """
        Create a new user in Open Wearables, or return existing if already exists.
        
        Uses per-email locking to prevent race conditions where multiple
        concurrent requests could create duplicate users.
        
        Args:
            external_id: External user ID (e.g., auth0_id from healthion)
            email: User's email address
            
        Returns:
            Created or existing user data including the Open Wearables user ID
        """
        # Get or create a lock for this email (prevents concurrent creation)
        if email not in _user_creation_locks:
            _user_creation_locks[email] = asyncio.Lock()
        
        async with _user_creation_locks[email]:
            # Check if user already exists by external_id (more reliable than email)
            existing = await self.find_user_by_external_id(external_id)
            if existing:
                self.log.info(f"User with external_id {external_id} already exists in OW: {existing.get('id')}")
                return existing
            
            # Create new user (inside lock to prevent races)
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/users",
                    headers=self._get_headers(),
                    json={
                        "external_user_id": external_id,  # Links back to Healthion user
                        "email": email,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                return response.json()

    async def get_user(self, user_id: UUID) -> dict[str, Any]:
        """
        Get user details from Open Wearables.
        
        Args:
            user_id: Open Wearables user ID
            
        Returns:
            User data
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users/{user_id}",
                headers=self._get_headers(),
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_providers(
        self, 
        enabled_only: bool = True, 
        cloud_only: bool = True
    ) -> list[dict[str, Any]]:
        """
        Get list of available wearable providers.
        
        Args:
            enabled_only: Only return enabled providers
            cloud_only: Only return cloud-based providers (OAuth)
            
        Returns:
            List of provider details including name, icon_url, etc.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/oauth/providers",
                headers=self._get_headers(),
                params={
                    "enabled_only": str(enabled_only).lower(),
                    "cloud_only": str(cloud_only).lower(),
                },
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_authorization_url(
        self, 
        provider: str, 
        user_id: UUID,
        redirect_uri: str | None = None
    ) -> dict[str, Any]:
        """
        Get OAuth authorization URL for a provider.
        
        Args:
            provider: Provider name (e.g., 'garmin', 'polar', 'suunto')
            user_id: Open Wearables user ID
            redirect_uri: Optional custom redirect URI
            
        Returns:
            Dict containing authorization_url
        """
        params: dict[str, Any] = {"user_id": str(user_id)}
        if redirect_uri:
            params["redirect_uri"] = redirect_uri
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/oauth/{provider}/authorize",
                headers=self._get_headers(),
                params=params,
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_user_connections(self, user_id: UUID) -> list[dict[str, Any]]:
        """
        Get all provider connections for a user.
        
        Args:
            user_id: Open Wearables user ID
            
        Returns:
            List of user's provider connections
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users/{user_id}/connections",
                headers=self._get_headers(),
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_timeseries(
        self,
        user_id: UUID,
        start_time: str,
        end_time: str,
        types: list[str] | None = None,
        limit: int = 50,
        resolution: str = "raw",
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """
        Get time series data for a user.
        
        Args:
            user_id: Open Wearables user ID
            start_time: Start time (ISO format) - required
            end_time: End time (ISO format) - required
            types: List of series types ('heart_rate', 'steps', 'heart_rate_variability_sdnn', etc.)
            limit: Max results to return (max 100)
            resolution: Data resolution ('raw', '1min', '5min', '15min', '1hour')
            cursor: Pagination cursor
            
        Returns:
            Paginated time series data with metadata
        """
        params: dict[str, Any] = {
            "start_time": start_time,
            "end_time": end_time,
            "limit": min(limit, 100),
            "resolution": resolution,
        }
        
        # Add types as repeated query params (types=heart_rate&types=steps)
        if types:
            params["types"] = types
        
        if cursor:
            params["cursor"] = cursor

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users/{user_id}/timeseries",
                headers=self._get_headers(),
                params=params,
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def sync_user_data(
        self,
        user_id: UUID,
        provider: str,
        data_type: str = "all",
    ) -> dict[str, Any]:
        """
        Trigger data sync for a user from a provider.
        
        Args:
            user_id: Open Wearables user ID
            provider: Provider name (lowercase: 'suunto', 'garmin', 'polar')
            data_type: Type of data to sync ('workouts', '247', 'all')
            
        Returns:
            Sync status
        """
        from datetime import datetime, timedelta
        import time
        
        provider_lower = provider.lower()
        params: dict[str, Any] = {"data_type": data_type}
        
        now = datetime.utcnow()
        
        # Provider-specific time parameters
        if provider_lower == "garmin":
            # Garmin requires time range parameters (max 24h)
            start = now - timedelta(hours=24)
            params["summary_start_time"] = start.strftime("%Y-%m-%dT%H:%M:%S")
            params["summary_end_time"] = now.strftime("%Y-%m-%dT%H:%M:%S")
        elif provider_lower == "suunto":
            # Suunto requires 'since' as Unix timestamp (max 28 days)
            # Use 7 days for more manageable sync
            start = now - timedelta(days=7)
            params["since"] = int(start.timestamp())
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/providers/{provider_lower}/users/{user_id}/sync",
                headers=self._get_headers(),
                params=params,
                timeout=60.0,
            )
            
            # Handle duplicate data error gracefully
            if response.status_code == 400:
                try:
                    error_data = response.json()
                    error_detail = error_data.get("detail", "")
                    if "already exists" in error_detail or "UniqueViolation" in error_detail:
                        return {
                            "success": True,
                            "status": "success", 
                            "message": "Data already synced - no new data to import",
                            "synced_count": 0
                        }
                    # Garmin token issues - need to reconnect
                    if "InvalidPullTokenException" in error_detail:
                        return {
                            "success": False,
                            "status": "error",
                            "message": "Garmin connection expired - please reconnect",
                            "synced_count": 0
                        }
                    # Suunto date range error
                    if "28 days" in error_detail:
                        return {
                            "success": False,
                            "status": "error",
                            "message": "Suunto sync date range too large - please try again",
                            "synced_count": 0
                        }
                except Exception:
                    pass
            
            response.raise_for_status()
            return response.json()

    async def get_workouts(
        self,
        user_id: UUID,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """
        Get workouts for a user (uses events endpoint).
        
        Args:
            user_id: Open Wearables user ID
            limit: Max results to return
            
        Returns:
            List of workouts
        """
        from datetime import datetime, timedelta
        
        # Use events endpoint with last 30 days
        now = datetime.utcnow()
        start = now - timedelta(days=30)
        
        params: dict[str, Any] = {
            "start_date": start.strftime("%Y-%m-%d"),
            "end_date": now.strftime("%Y-%m-%d"),
            "limit": limit,
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users/{user_id}/events/workouts",
                headers=self._get_headers(),
                params=params,
                timeout=30.0,
            )
            response.raise_for_status()
            result = response.json()
            # Return just the data array for backward compatibility
            return result.get("data", [])

    async def get_event_workouts(
        self,
        user_id: UUID,
        start_date: str,
        end_date: str,
        workout_type: str | None = None,
        limit: int = 50,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """
        Get workout events with rich data (new Events API).
        
        Args:
            user_id: Open Wearables user ID
            start_date: Start date (YYYY-MM-DD or ISO format)
            end_date: End date (YYYY-MM-DD or ISO format)
            workout_type: Optional filter by workout type
            limit: Max results (max 100)
            cursor: Pagination cursor
            
        Returns:
            Paginated workout events with calories, distance, heart rate, etc.
        """
        params: dict[str, Any] = {
            "start_date": start_date,
            "end_date": end_date,
            "limit": min(limit, 100),
        }
        if workout_type:
            params["type"] = workout_type
        if cursor:
            params["cursor"] = cursor

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users/{user_id}/events/workouts",
                headers=self._get_headers(),
                params=params,
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_sleep_sessions(
        self,
        user_id: UUID,
        start_date: str,
        end_date: str,
        limit: int = 50,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """
        Get sleep sessions with stages data.
        
        Args:
            user_id: Open Wearables user ID
            start_date: Start date (YYYY-MM-DD or ISO format)
            end_date: End date (YYYY-MM-DD or ISO format)
            limit: Max results (max 100)
            cursor: Pagination cursor
            
        Returns:
            Paginated sleep sessions with stages (awake, light, deep, rem)
        """
        params: dict[str, Any] = {
            "start_date": start_date,
            "end_date": end_date,
            "limit": min(limit, 100),
        }
        if cursor:
            params["cursor"] = cursor

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users/{user_id}/events/sleep",
                headers=self._get_headers(),
                params=params,
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_activity_summary(
        self,
        user_id: UUID,
        start_date: str,
        end_date: str,
        limit: int = 50,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """
        Get daily activity summaries.
        
        Args:
            user_id: Open Wearables user ID
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            limit: Max results (max 100)
            cursor: Pagination cursor
            
        Returns:
            Daily activity data: steps, distance, calories, active time
        """
        params: dict[str, Any] = {
            "start_date": start_date,
            "end_date": end_date,
            "limit": min(limit, 100),
        }
        if cursor:
            params["cursor"] = cursor

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users/{user_id}/summaries/activity",
                headers=self._get_headers(),
                params=params,
                timeout=30.0,
            )
            # Handle "Not implemented" gracefully
            if response.status_code == 501:
                return {"data": [], "pagination": {"has_more": False}}
            response.raise_for_status()
            return response.json()

    async def get_sleep_summary(
        self,
        user_id: UUID,
        start_date: str,
        end_date: str,
        limit: int = 50,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """
        Get daily sleep summaries.
        
        Args:
            user_id: Open Wearables user ID
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            limit: Max results (max 100)
            cursor: Pagination cursor
            
        Returns:
            Daily sleep data: duration, efficiency, stages, HRV
        """
        params: dict[str, Any] = {
            "start_date": start_date,
            "end_date": end_date,
            "limit": min(limit, 100),
        }
        if cursor:
            params["cursor"] = cursor

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users/{user_id}/summaries/sleep",
                headers=self._get_headers(),
                params=params,
                timeout=30.0,
            )
            # Handle "Not implemented" gracefully
            if response.status_code == 501:
                return {"data": [], "pagination": {"has_more": False}}
            response.raise_for_status()
            return response.json()

    async def get_recovery_summary(
        self,
        user_id: UUID,
        start_date: str,
        end_date: str,
        limit: int = 50,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """
        Get daily recovery summaries.
        
        Args:
            user_id: Open Wearables user ID
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            limit: Max results (max 100)
            cursor: Pagination cursor
            
        Returns:
            Daily recovery data: sleep, HRV, resting HR, recovery score
        """
        params: dict[str, Any] = {
            "start_date": start_date,
            "end_date": end_date,
            "limit": min(limit, 100),
        }
        if cursor:
            params["cursor"] = cursor

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users/{user_id}/summaries/recovery",
                headers=self._get_headers(),
                params=params,
                timeout=30.0,
            )
            # Handle "Not implemented" gracefully
            if response.status_code == 501:
                return {"data": [], "pagination": {"has_more": False}}
            response.raise_for_status()
            return response.json()

    async def get_body_summary(
        self,
        user_id: UUID,
        start_date: str,
        end_date: str,
        limit: int = 50,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """
        Get daily body metrics summaries.
        
        Args:
            user_id: Open Wearables user ID
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            limit: Max results (max 100)
            cursor: Pagination cursor
            
        Returns:
            Daily body data: weight, body fat, BMI, resting HR, HRV
        """
        params: dict[str, Any] = {
            "start_date": start_date,
            "end_date": end_date,
            "limit": min(limit, 100),
        }
        if cursor:
            params["cursor"] = cursor

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/users/{user_id}/summaries/body",
                headers=self._get_headers(),
                params=params,
                timeout=30.0,
            )
            # Handle "Not implemented" gracefully
            if response.status_code == 501:
                return {"data": [], "pagination": {"has_more": False}}
            response.raise_for_status()
            return response.json()

    async def get_workout_detail(
        self,
        user_id: UUID,
        provider: str,
        workout_id: str,
    ) -> dict[str, Any]:
        """
        Get detailed data for a single workout.
        
        Args:
            user_id: Open Wearables user ID
            provider: Provider name (garmin, polar, suunto)
            workout_id: Workout ID from the provider
            
        Returns:
            Detailed workout data including heart rate, pace, power, etc.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/providers/{provider.lower()}/users/{user_id}/workouts/{workout_id}",
                headers=self._get_headers(),
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def import_apple_health_xml(
        self,
        user_id: UUID,
        file_key: str,
    ) -> dict[str, Any]:
        """
        Import Apple Health XML export for a user.
        
        The XML file must first be uploaded to the presigned URL,
        then this endpoint processes it.
        
        Args:
            user_id: Open Wearables user ID
            file_key: S3 file key from presigned upload
            
        Returns:
            Import status with record counts
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/users/{user_id}/import/apple/xml",
                headers=self._get_headers(),
                json={"file_key": file_key},
                timeout=300.0,  # Long timeout for large imports
            )
            response.raise_for_status()
            return response.json()

    async def get_provider_workouts(
        self,
        user_id: UUID,
        provider: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """
        Get workouts from a specific provider.
        
        Args:
            user_id: Open Wearables user ID
            provider: Provider name (garmin, polar, suunto)
            limit: Max results to return
            
        Returns:
            List of workouts from the provider
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/providers/{provider.lower()}/users/{user_id}/workouts",
                headers=self._get_headers(),
                params={"limit": limit},
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()


# Singleton instance
open_wearables_client = OpenWearablesClient()

