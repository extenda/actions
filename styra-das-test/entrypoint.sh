#!/bin/sh
set -e

# Lookup the System ID from system name.
SYSTEM_ID=$(curl -X GET "https://extendaretail.svc.styra.com/v1/systems?compact=false&name=$STYRA_SYSTEM_NAME" -H "authorization: $STYRA_TOKEN" -H "content-type: application/json" | jq -r '.result[0].id')

if [ -z "$SYSTEM_ID" ]; then
  echo "Not found. No system matching name '${STYRA_SYSTEM_NAME}'"
  exit 1
fi

# Run tests
OUTPUT="$(/usr/local/bin/styra-cli validate tests "$SYSTEM_ID" --all \
  -p policy/com.styra.envoy.${STYRA_POLICY_TYPE}/test/test/test.rego=policies/policy/com.styra.envoy.${STYRA_POLICY_TYPE}/test/test/test.rego \
  -p policy/com.styra.envoy.${STYRA_POLICY_TYPE}/rules/rules/${STYRA_POLICY_TYPE}.rego=policies/policy/com.styra.envoy.${STYRA_POLICY_TYPE}/rules/rules/${STYRA_POLICY_TYPE}.rego \
  --policy-type ${STYRA_POLICY_TYPE})"

echo "$OUTPUT"

# Styra CLI does not fail if tests fail. Therefore, we grep the output here.
echo "$OUTPUT" | grep -q ", 0 failed, 0 errors"
