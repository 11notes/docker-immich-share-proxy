#!/bin/ash
  HEALTHCHECK_URL=${HEALTHCHECK_URL:-http://localhost:3000/healthcheck}
  curl --insecure --max-time 2 -kILs --fail ${HEALTHCHECK_URL}