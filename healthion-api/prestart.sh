#!/bin/bash
set -e -x

# Wait for PostgreSQL to be ready
echo 'Waiting for PostgreSQL to be ready...'
until uv run python -c "
import psycopg
import os

conn = psycopg.connect(
    host=os.environ['DB_HOST'],
    port=int(os.environ['DB_PORT']),
    dbname=os.environ['DB_NAME'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD'],
)
conn.close()
print('PostgreSQL is ready!')
" 2>&1
do
  echo 'Waiting for db services to become available...'
  sleep 2
done
echo 'DB containers UP, proceeding...'

exec "$@"
