#!/bin/sh
# Oro entrypoint: adds the "init_runtime" command and hands everything else to the upstream entrypoint.
#   init_runtime  one-shot setup that runs once the app is healthy, then exits.
#                 It currently creates the first admin from AP_ADMIN_EMAIL, AP_ADMIN_FIRST_NAME and
#                 AP_ADMIN_LAST_NAME (the password stays in AP_ADMIN_PASSWORD).
#                 Without AP_ADMIN_EMAIL the admin step is skipped, for an admin created another way.
#                 Extra arguments are passed on to the admin step as flags.

if [ "$1" = "init_runtime" ]; then
    shift
    export AP_CONTAINER_TYPE=APP
    if [ -z "${AP_ADMIN_EMAIL:-}" ]; then
        echo "[init_runtime] AP_ADMIN_EMAIL is empty, skipping the admin creation"
        exit 0
    fi
    exec node scripts/create-admin.js \
        --email "${AP_ADMIN_EMAIL:-}" \
        --first-name "${AP_ADMIN_FIRST_NAME:-Admin}" \
        --last-name "${AP_ADMIN_LAST_NAME:-User}" \
        "$@"
fi

exec /usr/local/bin/docker-entrypoint.sh "$@"
