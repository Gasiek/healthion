from uuid import UUID

from sqlalchemy.orm import Mapped, mapped_column

from app.database import BaseDbModel
from app.mappings import PrimaryKey, Unique, datetime_tz, email


class User(BaseDbModel):
    id: Mapped[PrimaryKey[UUID]]
    auth0_id: Mapped[Unique[str]]
    email: Mapped[Unique[email]]
    open_wearables_user_id: Mapped[UUID | None] = mapped_column()
    created_at: Mapped[datetime_tz]
    updated_at: Mapped[datetime_tz]
