#!/bin/sh

actions=$(find . -type f -name 'action.yml')
for action in $actions; do
  rm -rf "$(dirname "$action")/dist"
  npm run build --prefix $(dirname "$action") || exit 1
done
