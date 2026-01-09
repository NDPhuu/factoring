"""add_closed_to_invoicestatus

Revision ID: 2d2037fa59cb
Revises: f45f4bd4f7b3
Create Date: 2026-01-10 04:48:48.144608

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2d2037fa59cb'
down_revision: Union[str, Sequence[str], None] = 'f45f4bd4f7b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    """Upgrade schema."""
    # Manual Fix for Postgres Enum
    # Note: ADD VALUE cannot be run in a transaction block usually, so we might need commit=False if Alembic runs in transaction
    # But for now, try standard way. If fails, we set autocommit on context.
    op.execute("ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'DISBURSED'")
    op.execute("ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'CLOSED'")

def downgrade() -> None:
    """Downgrade schema."""
    pass

