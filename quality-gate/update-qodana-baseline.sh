#!/usr/bin/env sh

generated_baseline="$1"
gcs_path="$2"

if [ -f qodana.sarif.json ]; then
  echo "User-provided qodana.sarif.json exists. Baseline automation disabled."
  echo "rerun=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

if [ -f "$generated_baseline" ]; then
  gcloud storage cp "$generated_baseline" "$gcs_path"
  echo "rerun=true" >> "$GITHUB_OUTPUT"
fi
