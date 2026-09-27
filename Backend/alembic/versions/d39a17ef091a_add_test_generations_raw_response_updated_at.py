"""add_test_generations_raw_response_updated_at

Revision ID: d39a17ef091a
Revises: c01dbe0c94d3
Create Date: 2026-09-21 20:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd39a17ef091a'
down_revision: Union[str, Sequence[str], None] = 'c01dbe0c94d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add raw_response and updated_at to test_generations
    with op.batch_alter_table('test_generations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('raw_response', sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column(
                'updated_at',
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=True,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table('test_generations', schema=None) as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('raw_response')
