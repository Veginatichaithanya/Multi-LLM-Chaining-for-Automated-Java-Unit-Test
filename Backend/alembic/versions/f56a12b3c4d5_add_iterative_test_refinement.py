"""add iterative test refinement

Revision ID: f56a12b3c4d5
Revises: e45b128fa031
Create Date: 2026-09-21 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f56a12b3c4d5'
down_revision: Union[str, Sequence[str], None] = 'e45b128fa031'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'test_refinements',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('generation_id', sa.String(length=36), nullable=False),
        sa.Column('parent_result_id', sa.String(length=36), nullable=True),
        sa.Column('provider', sa.String(length=50), server_default='openrouter', nullable=False),
        sa.Column('model', sa.String(length=150), server_default='openai/gpt-4o', nullable=False),
        sa.Column('iteration', sa.Integer(), server_default='1', nullable=False),
        sa.Column('input_test_code', sa.Text(), nullable=False),
        sa.Column('refined_test_code', sa.Text(), nullable=True),
        sa.Column('compilation_status', sa.String(length=50), nullable=True),
        sa.Column('execution_status', sa.String(length=50), nullable=True),
        sa.Column('line_coverage', sa.Float(), nullable=True),
        sa.Column('branch_coverage', sa.Float(), nullable=True),
        sa.Column('instruction_coverage', sa.Float(), nullable=True),
        sa.Column('mutation_score', sa.Float(), nullable=True),
        sa.Column('feedback_json', sa.JSON(), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True),
        sa.Column('completion_tokens', sa.Integer(), nullable=True),
        sa.Column('total_tokens', sa.Integer(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='completed', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['generation_id'], ['test_generations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_result_id'], ['test_results.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('test_refinements', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_test_refinements_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_test_refinements_project_id'), ['project_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_test_refinements_generation_id'), ['generation_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('test_refinements', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_test_refinements_generation_id'))
        batch_op.drop_index(batch_op.f('ix_test_refinements_project_id'))
        batch_op.drop_index(batch_op.f('ix_test_refinements_id'))
    op.drop_table('test_refinements')
