import os
import requests

# Define base URL and repository details
base_url = "https://api.github.com"
owner = "extenda"
repo = "actions"

# Get personal access token from environment variable
github_token = os.getenv("GITHUB_TOKEN")

# Function to create a request with authentication
def create_authenticated_request(url, method="GET", data=None):
    headers = {"Authorization": f"token {github_token}"}
    if data is not None:
        return requests.request(method, url, headers=headers, json=data)
    else:
        return requests.request(method, url, headers=headers)

# Function to find pull requests by title, sorted by oldest first
def find_pull_requests():
    url = f"{base_url}/search/issues?q=repo:{owner}/{repo}+is:pr+label:dependencies+is:open&sort=created&order=asc"
    response = create_authenticated_request(url)
    response.raise_for_status()  # Raise error for non-200 responses
    return response.json()["items"]

# Function to add comment to pull request
def add_comment(pull_request_number, comment):
    url = f"{base_url}/repos/{owner}/{repo}/issues/{pull_request_number}/comments"
    data = {"body": comment}
    response = create_authenticated_request(url, method="POST", data=data)
    response.raise_for_status()  # Raise error for non-201 responses

# Main Script
pull_requests = find_pull_requests()

# Check if any pull requests were found
if pull_requests:
    # Get the oldest pull request
    oldest_pr = pull_requests[0]
    number = oldest_pr["number"]
    comment = "@dependabot rebase"
    add_comment(number, comment)
    print(f"Added comment to the oldest pull request #{number}")
else:
    print("No pull requests found matching the criteria.")
