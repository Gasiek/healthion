from logging import getLogger
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services import auth0_service
from app.database import DbSession
from app.services import user_service
from app.services.open_wearables_client import OpenWearablesConfigurationError
from app.schemas import UserInfo

security = HTTPBearer()
logger = getLogger(__name__)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: DbSession
) -> UserInfo:
    token = credentials.credentials
    payload = await auth0_service.verify_token(token)
    
    auth0_id = auth0_service.get_user_id(payload)
    permissions = auth0_service.get_user_permissions(payload)
    
    # Get email from token payload or userinfo endpoint
    email = payload.get("email") or payload.get(f"{auth0_service.audience}/email")
    if not email:
        try:
            email = auth0_service.get_user_email(token)
        except Exception:
            email = f"{auth0_id}@unknown.com"  # Fallback
    
    user = user_service.get_or_create_user(
        db,
        auth0_id=auth0_id,
        email=email or f"{auth0_id}@unknown.com"
    )
    
    # Auto-register with Open Wearables if not already registered
    if not user.open_wearables_user_id:
        try:
            user = await user_service.register_with_open_wearables(db, user)
        except OpenWearablesConfigurationError as e:
            # Configuration error - log as error since this needs to be fixed
            logger.error(
                f"Open Wearables not configured: {e}. "
                "Set OPEN_WEARABLES_API_KEY environment variable."
            )
        except Exception as e:
            # Other errors (network, API errors) - log as warning
            logger.warning(f"Failed to register user with Open Wearables: {e}")
    
    return UserInfo(
        user_id=user.id,
        auth0_id=auth0_id,
        email=str(user.email),
        permissions=permissions,
        payload=payload
    )


async def get_current_user_id(
    current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> str:
    return str(current_user.user_id)
