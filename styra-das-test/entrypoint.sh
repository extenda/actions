#!/bin/sh
set -e

# Lookup the System ID from styra APIs.
SYSTEM_ID=$(curl -sS -H "Authorization: Bearer ${STYRA_TOKEN}" \
    "${STYRA_ORGANIZATION_ID}/v1/systems?compact=true&name=${STYRA_SYSTEM_NAME}" \
  | jq -r '.result[0].id // "NotFound"')

if [ "$SYSTEM_ID" = "NotFound" ]; then
  echo "Not found. No system matching name '${STYRA_SYSTEM_NAME}'"
  exit 1
fi

# Run tests
OUTPUT="$(/usr/local/bin/styra-cli validate tests "$SYSTEM_ID" --all \
  -p policy/com.styra.envoy.ingress/test/test/test.rego=policies/policy/com.styra.envoy.ingress/test/test/test.rego \
  -p policy/com.styra.envoy.ingress/rules/rules/ingress.rego=policies/policy/com.styra.envoy.ingress/rules/rules/ingress.rego)"

echo "$OUTPUT"

# Styra CLI does not fail if tests fail. Therefore, we grep the output here.
echo "$OUTPUT" | grep -q ", 0 failed, 0 errors"
