"""add multi llm experiment framework

Revision ID: a67b89c01d2e
Revises: f56a12b3c4d5
Create Date: 2026-09-22 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a67b89c01d2e'
down_revision: Union[str, Sequence[str], None] = 'f56a12b3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Alter experiments table to add Phase 6 fields
    op.add_column('experiments', sa.Column('configuration', sa.String(length=100), server_default='gemini_to_openrouter', nullable=False))
    op.add_column('experiments', sa.Column('java_version', sa.String(length=20), server_default='17', nullable=False))
    op.add_column('experiments', sa.Column('build_tool', sa.String(length=50), server_default='maven', nullable=False))
    op.add_column('experiments', sa.Column('started_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('experiments', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))

    # 2. Create experiment_runs table
    op.create_table(
        'experiment_runs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('experiment_id', sa.String(length=36), nullable=False),
        sa.Column('iteration', sa.Integer(), server_default='0', nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('model', sa.String(length=150), nullable=False),
        sa.Column('generation_id', sa.String(length=36), nullable=True),
        sa.Column('test_result_id', sa.String(length=36), nullable=True),
        sa.Column('coverage_result_id', sa.String(length=36), nullable=True),
        sa.Column('refinement_id', sa.String(length=36), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='completed', nullable=False),
        sa.Column('execution_time_ms', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['generation_id'], ['test_generations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['test_result_id'], ['test_results.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['coverage_result_id'], ['coverage_results.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['refinement_id'], ['test_refinements.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_experiment_runs_id', 'experiment_runs', ['id'], unique=False)
    op.create_index('ix_experiment_runs_experiment_id', 'experiment_runs', ['experiment_id'], unique=False)

    # 3. Create experiment_metrics table
    op.create_table(
        'experiment_metrics',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('experiment_id', sa.String(length=36), nullable=False),
        sa.Column('experiment_run_id', sa.String(length=36), nullable=False),
        sa.Column('generated_test_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_tests', sa.Integer(), server_default='0', nullable=False),
        sa.Column('passed_tests', sa.Integer(), server_default='0', nullable=False),
        sa.Column('failed_tests', sa.Integer(), server_default='0', nullable=False),
        sa.Column('skipped_tests', sa.Integer(), server_default='0', nullable=False),
        sa.Column('compilation_success', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('execution_success', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('line_coverage', sa.Float(), nullable=True),
        sa.Column('branch_coverage', sa.Float(), nullable=True),
        sa.Column('instruction_coverage', sa.Float(), nullable=True),
        sa.Column('method_coverage', sa.Float(), nullable=True),
        sa.Column('class_coverage', sa.Float(), nullable=True),
        sa.Column('mutation_score', sa.Float(), nullable=True),
        sa.Column('total_execution_time_ms', sa.Integer(), server_default='0', nullable=False),
        sa.Column('refinement_iterations', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['experiment_run_id'], ['experiment_runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_experiment_metrics_id', 'experiment_metrics', ['id'], unique=False)
    op.create_index('ix_experiment_metrics_experiment_id', 'experiment_metrics', ['experiment_id'], unique=False)
    op.create_index('ix_experiment_metrics_experiment_run_id', 'experiment_metrics', ['experiment_run_id'], unique=False)

    # 4. Create prompt_templates table
    op.create_table(
        'prompt_templates',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('operation', sa.String(length=50), nullable=False),
        sa.Column('template', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_prompt_templates_id', 'prompt_templates', ['id'], unique=False)
    op.create_index('ix_prompt_templates_name', 'prompt_templates', ['name'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_prompt_templates_name', table_name='prompt_templates')
    op.drop_index('ix_prompt_templates_id', table_name='prompt_templates')
    op.drop_table('prompt_templates')

    op.drop_index('ix_experiment_metrics_experiment_run_id', table_name='experiment_metrics')
    op.drop_index('ix_experiment_metrics_experiment_id', table_name='experiment_metrics')
    op.drop_index('ix_experiment_metrics_id', table_name='experiment_metrics')
    op.drop_table('experiment_metrics')

    op.drop_index('ix_experiment_runs_experiment_id', table_name='experiment_runs')
    op.drop_index('ix_experiment_runs_id', table_name='experiment_runs')
    op.drop_table('experiment_runs')

    op.drop_column('experiments', 'completed_at')
    op.drop_column('experiments', 'started_at')
    op.drop_column('experiments', 'build_tool')
    op.drop_column('experiments', 'java_version')
    op.drop_column('experiments', 'configuration')
