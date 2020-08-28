#!/bin/sh
set -e

# Styra CLI does not fail if tests fail. Therefore, we grep the touput here...

OUTPUT="$(/usr/local/bin/styra-cli $@)"

echo "${OUTPUT}"

echo "${OUTPUT}" | grep -q ", 0 failed, 0 errors"
