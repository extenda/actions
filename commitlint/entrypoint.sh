#!/usr/bin/env bash

usage() {
  echo "Usage: $0 [-c <sha>] [-m <string>]" 1>&2
  exit 1
}

commitlint="/usr/local/bin/commitlint --config $COMMITLINT_CONFIG"

while getopts ":c:m:" opt; do
  case "${opt}" in
    c)
      commit="$OPTARG"
      ;;
    m)
      message="$OPTARG"
      ;;
    *)
      usage
      ;;
  esac
done

if [ -n "$message" ]; then
  echo "$message" | $commitlint || exit 1
elif [ -n "$commit" ]; then
  $commitlint --from "$commit" || exit 1
fi
