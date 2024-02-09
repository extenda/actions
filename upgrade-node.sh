#!/bin/sh
FROM=16
TO=20

echo 'Replace all node versions in "action.yml" files ...'
find . -type f -name action.yml -exec sed -i "s/using: node$FROM/using: node$TO/g" {} +

echo 'Replace node version in root "package.json" ...'
sed -i "s/node:$FROM/node:$TO/g" "$(find . -maxdepth 1 -type f -name "package.json")"

echo 'Run npm ci ...'
npm ci

echo 'Build ...'
npm run build:docker
