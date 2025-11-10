#!/bin/bash

# Test script for Titan API endpoints
# Usage: ./test-endpoints.sh [base_url]
# Example: ./test-endpoints.sh https://morteliv.com

BASE_URL="${1:-https://morteliv.com}"
echo "Testing Titan API at: $BASE_URL"
echo "=================================="
echo ""

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/api/health" | jq '.' || echo "Health check failed"
echo ""

# Test 2: Get projects
echo "2. Testing GET /api/projects..."
PROJECTS_RESPONSE=$(curl -s "$BASE_URL/api/projects")
echo "$PROJECTS_RESPONSE" | jq '.' || echo "$PROJECTS_RESPONSE"
echo ""

# Extract first project ID if available
PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | jq -r '.projects[0].id // empty')
if [ -z "$PROJECT_ID" ]; then
  echo "No projects found. Will skip hierarchy test."
else
  echo "Found project ID: $PROJECT_ID"
  echo ""
  
  # Test 3: Get hierarchy
  echo "3. Testing GET /api/hierarchy/$PROJECT_ID..."
  curl -s "$BASE_URL/api/hierarchy/$PROJECT_ID" | jq '.' || echo "Hierarchy endpoint failed"
  echo ""
fi

# Test 4: Test plan generation endpoint (will need a valid project ID)
if [ -n "$PROJECT_ID" ]; then
  echo "4. Testing POST /api/hierarchy/$PROJECT_ID/plan..."
  curl -s -X POST "$BASE_URL/api/hierarchy/$PROJECT_ID/plan" \
    -H "Content-Type: application/json" | jq '.' || echo "Plan generation endpoint failed"
  echo ""
fi

echo "=================================="
echo "Tests complete!"

