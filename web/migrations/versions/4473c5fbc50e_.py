"""empty message

Revision ID: 4473c5fbc50e
Revises: 21df4e5effd4
Create Date: 2015-08-28 12:35:10.557991

"""

# revision identifiers, used by Alembic.
revision = '4473c5fbc50e'
down_revision = '21df4e5effd4'

from alembic import op
import sqlalchemy as sa


def upgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.create_table('tab',
    sa.Column('name', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('name'),
    sa.UniqueConstraint('name')
    )
    op.create_table('tabs',
    sa.Column('tab_name', sa.Integer(), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['tab_name'], ['tab.name'], ),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], )
    )
    op.drop_table('query')
    op.add_column(u'user', sa.Column('last_seen', sa.DateTime(), nullable=True))
    op.add_column(u'user', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column(u'user', sa.Column('status', sa.SmallInteger(), nullable=True))
    op.drop_column(u'user', 'pw_hash')
    ### end Alembic commands ###


def downgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.add_column(u'user', sa.Column('pw_hash', sa.VARCHAR(), nullable=True))
    op.drop_column(u'user', 'status')
    op.drop_column(u'user', 'notes')
    op.drop_column(u'user', 'last_seen')
    op.create_table('query',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('json', sa.VARCHAR(), nullable=True),
    sa.Column('user_id', sa.INTEGER(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], [u'user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.drop_table('tabs')
    op.drop_table('tab')
    ### end Alembic commands ###