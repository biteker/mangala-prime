#!/bin/bash
set -e
set -u

function create_user_and_database() {
	local database=$1
	echo "  Creating database '$database'"
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	    CREATE DATABASE "$database";
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
	echo "Multiple databases creation requested: $POSTGRES_MULTIPLE_DATABASES"
	for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
		db_exists=$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='$db'")
		if [ "$db_exists" != "1" ]; then
			create_user_and_database $db
		else
			echo "  Database '$db' already exists"
		fi
	done
	echo "Multiple databases creation complete!"
fi
