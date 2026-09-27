"""implement junit execution and jacoco coverage

Revision ID: e45b128fa031
Revises: d39a17ef091a
Create Date: 2026-09-21 20:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e45b128fa031'
down_revision: Union[str, Sequence[str], None] = 'd39a17ef091a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update test_results with status and error_count
    with op.batch_alter_table('test_results', schema=None) as batch_op:
        batch_op.add_column(sa.Column('status', sa.String(length=50), server_default='completed', nullable=False))
        batch_op.add_column(sa.Column('error_count', sa.Integer(), server_default='0', nullable=False))

    # 2. Create coverage_results table
    op.create_table(
        'coverage_results',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('test_result_id', sa.String(length=36), nullable=False),
        sa.Column('instruction_coverage', sa.Float(), nullable=True),
        sa.Column('branch_coverage', sa.Float(), nullable=True),
        sa.Column('line_coverage', sa.Float(), nullable=True),
        sa.Column('method_coverage', sa.Float(), nullable=True),
        sa.Column('class_coverage', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['test_result_id'], ['test_results.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_coverage_results_id'), 'coverage_results', ['id'], unique=False)
    op.create_index(op.f('ix_coverage_results_project_id'), 'coverage_results', ['project_id'], unique=False)
    op.create_index(op.f('ix_coverage_results_test_result_id'), 'coverage_results', ['test_result_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_coverage_results_test_result_id'), table_name='coverage_results')
    op.drop_index(op.f('ix_coverage_results_project_id'), table_name='coverage_results')
    op.drop_index(op.f('ix_coverage_results_id'), table_name='coverage_results')
    op.drop_table('coverage_results')

    with op.batch_alter_table('test_results', schema=None) as batch_op:
        batch_op.drop_column('error_count')
        batch_op.drop_column('status')
