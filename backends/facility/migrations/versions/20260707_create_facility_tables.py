"""create facility tables

Revision ID: create_facility_tables
Revises: 
Create Date: 2026-07-07 23:55:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'create_facility_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # facilities
    op.create_table(
        'facilities',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('facility_group', sa.Enum('Courts','Classrooms','Labs','Halls', name='facilitygroup'), nullable=False),
        sa.Column('capacity', sa.Integer, nullable=False),
        sa.Column('requires_approval', sa.Boolean, nullable=False, server_default=sa.text('0')),
        sa.Column('token_cost_per_hour', sa.Float, nullable=False, server_default='1.0'),
        sa.Column('description', sa.Text),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.text('1')),
    )

    # slots
    op.create_table(
        'slots',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('start_time_of_day', sa.Time, nullable=False),
        sa.Column('end_time_of_day', sa.Time, nullable=False),
        sa.Column('is_peak_hour', sa.Boolean, nullable=False, server_default=sa.text('0')),
    )

    # action_reasons
    op.create_table(
        'action_reasons',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('action_label', sa.String(100), nullable=False, unique=True),
        sa.Column('reason_statement', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # bookings
    op.create_table(
        'bookings',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete="SET NULL"), index=True),
        sa.Column('facility_id', sa.Integer, sa.ForeignKey('facilities.id', ondelete="CASCADE"), nullable=False, index=True),
        sa.Column('booking_date', sa.Date, nullable=False, index=True),
        sa.Column('start_slot_id', sa.Integer, sa.ForeignKey('slots.id', ondelete="RESTRICT"), nullable=False),
        sa.Column('end_slot_id', sa.Integer, sa.ForeignKey('slots.id', ondelete="RESTRICT"), nullable=False),
        sa.Column('status', sa.Enum('PENDING','RESERVED','CANCELLED','COMPLETED','REJECTED','NO_SHOW', name='bookingstatus'), nullable=False, server_default='PENDING'),
        sa.Column('deposit_paid', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, onupdate=sa.func.now()),
        sa.Column('cancellation_reason_id', sa.Integer, sa.ForeignKey('action_reasons.id', ondelete="SET NULL")),
    )

    # unavailabilities
    op.create_table(
        'unavailabilities',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('facility_id', sa.Integer, sa.ForeignKey('facilities.id', ondelete="CASCADE"), nullable=False, index=True),
        sa.Column('booking_date', sa.Date, nullable=False, index=True),
        sa.Column('start_slot_id', sa.Integer, sa.ForeignKey('slots.id', ondelete="RESTRICT"), nullable=False),
        sa.Column('end_slot_id', sa.Integer, sa.ForeignKey('slots.id', ondelete="RESTRICT"), nullable=False),
        sa.Column('reason_id', sa.Integer, sa.ForeignKey('action_reasons.id', ondelete="SET NULL")),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # approvals
    op.create_table(
        'approvals',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('booking_id', sa.Integer, sa.ForeignKey('bookings.id', ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column('approver_id', sa.String(36), sa.ForeignKey('users.id', ondelete="SET NULL")),
        sa.Column('status', sa.Enum('PENDING','APPROVED','REJECTED', name='approvalstatus'), nullable=False, server_default='PENDING'),
        sa.Column('notes_id', sa.Integer, sa.ForeignKey('action_reasons.id', ondelete="SET NULL")),
        sa.Column('requested_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('actioned_at', sa.DateTime),
    )

    # system_logs
    op.create_table(
        'system_logs',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('level', sa.Enum('INFO','DEBUG','WARNING','ERROR', name='loglevel'), nullable=False),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('user_id', sa.String(36)),
        sa.Column('booking_id', sa.Integer),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('metadata', sa.JSON),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table('system_logs')
    op.drop_table('approvals')
    op.drop_table('unavailabilities')
    op.drop_table('bookings')
    op.drop_table('action_reasons')
    op.drop_table('slots')
    op.drop_table('facilities')
