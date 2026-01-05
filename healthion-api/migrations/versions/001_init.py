"""Initial migration - User table only

Revision ID: 001_init
Revises: 
Create Date: 2026-01-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_init'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('auth0_id', sa.Text(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('open_wearables_user_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('auth0_id'),
        sa.UniqueConstraint('email')
    )
    
    # Add index for faster Open Wearables lookups
    op.create_index(
        'ix_user_open_wearables_user_id',
        'user',
        ['open_wearables_user_id'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_user_open_wearables_user_id', table_name='user')
    op.drop_table('user')

