"""create facility tables

Revision ID: b86fc3214a4e
Revises: create_facility_tables
Create Date: 2026-07-07 00:03:12.756220

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b86fc3214a4e'
down_revision: Union[str, Sequence[str], None] = 'create_facility_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
