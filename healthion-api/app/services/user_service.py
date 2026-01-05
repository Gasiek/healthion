from logging import Logger, getLogger
from uuid import UUID

from app.database import DbSession
from app.models import User
from app.repositories import UserRepository
from app.schemas import UserCreate, UserUpdate
from app.services import AppService
from app.services.open_wearables_client import open_wearables_client
from app.utils.exceptions import handle_exceptions


class UserService(AppService[UserRepository, User, UserCreate, UserUpdate]):
    def __init__(self, log: Logger, **kwargs):
        super().__init__(
            crud_model=UserRepository,
            model=User,
            log=log,
            **kwargs
        )
        self.user_repository = UserRepository(User)

    def get_or_create_user(self, db_session: DbSession, auth0_id: str, email: str) -> User:
        if not auth0_id or not email:
            raise ValueError("auth0_id and email are required")
        
        user = self._get_user_by_auth0_id(db_session, auth0_id)
        
        if user:
            if str(user.email) != email:
                user_update = UserUpdate(email=email)
                user = self.update(db_session, user.id, user_update)
            return user
        
        user_create = UserCreate(
            auth0_id=auth0_id,
            email=email
        )
        
        return self.create(db_session, user_create)

    async def register_with_open_wearables(
        self, 
        db_session: DbSession, 
        user: User
    ) -> User:
        """
        Register user with Open Wearables platform.
        
        Uses optimistic locking - the OW client returns existing user if 
        duplicate detected, and we use atomic UPDATE WHERE to prevent races.
        
        Args:
            db_session: Database session
            user: User to register
            
        Returns:
            Updated user with open_wearables_user_id
        """
        # Quick check (may be stale, but that's OK - we'll check again)
        if user.open_wearables_user_id:
            self.logger.info(f"User {user.id} already registered with Open Wearables")
            return user
        
        try:
            # Call OW to create/get user (OW handles duplicates by email)
            result = await open_wearables_client.create_user(
                external_id=user.auth0_id,
                email=str(user.email)
            )
            
            ow_user_id = UUID(result.get("id") or result.get("user_id"))
            
            # Atomic update: only update if still NULL (optimistic locking)
            # This prevents race conditions without holding locks during HTTP calls
            from sqlalchemy import update
            stmt = (
                update(User)
                .where(User.id == user.id)
                .where(User.open_wearables_user_id.is_(None))  # Only if still NULL
                .values(open_wearables_user_id=ow_user_id)
            )
            result = db_session.execute(stmt)
            db_session.commit()
            
            if result.rowcount > 0:
                self.logger.info(
                    f"User {user.id} registered with Open Wearables as {ow_user_id}"
                )
            else:
                self.logger.info(f"User {user.id} already registered by another request")
            
            # Refresh user to get current state
            db_session.refresh(user)
            return user
            
        except Exception as e:
            self.logger.error(f"Failed to register user {user.id} with Open Wearables: {e}")
            raise

    def _get_user_by_auth0_id(self, db_session: DbSession, auth0_id: str) -> User | None:
        return self.user_repository.get_user_by_auth0_id(db_session, auth0_id)


user_service = UserService(log=getLogger(__name__))
