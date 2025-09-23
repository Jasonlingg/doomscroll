"""add_ml_fields_and_sentiment_splits

Revision ID: fd9179c217e4
Revises: 326478402721
Create Date: 2025-09-21 22:00:10.615710

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd9179c217e4'
down_revision: Union[str, Sequence[str], None] = '326478402721'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add ML fields to usage_events table
    op.add_column('usage_events', sa.Column('snippet_opt_in', sa.Integer(), nullable=True, default=0))
    op.add_column('usage_events', sa.Column('snippet_text', sa.Text(), nullable=True))
    op.add_column('usage_events', sa.Column('behavior_json', sa.Text(), nullable=True))
    op.add_column('usage_events', sa.Column('vision_json', sa.Text(), nullable=True))
    
    # Add sentiment split fields to daily_stats table
    op.add_column('daily_stats', sa.Column('doom_seconds', sa.Integer(), nullable=True, default=0))
    op.add_column('daily_stats', sa.Column('neutral_seconds', sa.Integer(), nullable=True, default=0))
    op.add_column('daily_stats', sa.Column('positive_seconds', sa.Integer(), nullable=True, default=0))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove sentiment split fields from daily_stats table
    op.drop_column('daily_stats', 'positive_seconds')
    op.drop_column('daily_stats', 'neutral_seconds')
    op.drop_column('daily_stats', 'doom_seconds')
    
    # Remove ML fields from usage_events table
    op.drop_column('usage_events', 'vision_json')
    op.drop_column('usage_events', 'behavior_json')
    op.drop_column('usage_events', 'snippet_text')
    op.drop_column('usage_events', 'snippet_opt_in')
