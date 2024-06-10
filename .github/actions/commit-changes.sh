#!/usr/bin/env bash

changed_files_json=""
for file_path in $(git diff --name-only '*/dist/**'); do
  echo "Add $file_path"
  changed_files_json="$changed_files_json
  {
    \"path\": \"$file_path\",
    \"contents\": \"$(base64 < "$file_path")\"
  },"
done

# Remove last comma
changed_files_json=${changed_files_json::-1}

echo "Push changes to branch $BRANCH_NAME with HEAD $GITHUB_SHA"

graphql_request='{
  "query": "mutation ('\$'input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: '\$'input) { commit { url } } }",
  "variables": {
    "input": {
      "branch": {
        "repositoryNameWithOwner": "extenda/actions",
        "branchName": "'"$BRANCH_NAME"'"
      },
      "message": {
        "headline": "build(deps): Update dist files [skip ci]"
      },
      "fileChanges": {
        "additions": [
          '"$changed_files_json"'
        ]
      },
      "expectedHeadOid": "'"$GITHUB_SHA"'"
    }
  }
}'

echo "$graphql_request" > request.json

response=$(curl -sS "$GITHUB_API_URL/graphql" \
  -H "Authorization: bearer $GITHUB_TOKEN" \
  --data @request.json)

rm request.json

# Print the results
url=$(echo "$response" | jq -r '.data.createCommitOnBranch.commit.url')
if [ "$url" != "null" ]; then
  echo "Changes pushed to: $url"
  exit 0
else
  error=$(echo "$response" | jq -r '.errors[0].message')
  echo "An error occurred: $error"
  exit 1
fi
