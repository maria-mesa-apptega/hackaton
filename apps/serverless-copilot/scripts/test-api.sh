#!/bin/bash

# API Testing Script for Apptega Compliance Copilot
# This script tests all API endpoints with sample data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL=${1:-"https://your-api-gateway-url.amazonaws.com/dev"}
API_KEY=${2:-""}
TEST_USER_ID="demo-user-1"
TEST_ORG_ID="1"

echo -e "${BLUE}🧪 Testing Apptega Compliance Copilot API${NC}"
echo "Base URL: $API_BASE_URL"
echo ""

# Function to print test results
print_test_result() {
    local test_name=$1
    local status_code=$2
    local expected_code=$3

    if [ "$status_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✅ $test_name: PASSED (HTTP $status_code)${NC}"
    else
        echo -e "${RED}❌ $test_name: FAILED (HTTP $status_code, expected $expected_code)${NC}"
    fi
}

# Function to make API request
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_code=${4:-200}

    local url="$API_BASE_URL$endpoint"
    local headers="-H 'Content-Type: application/json'"

    if [ ! -z "$API_KEY" ]; then
        headers="$headers -H 'X-API-Key: $API_KEY'"
    fi

    if [ "$method" = "POST" ] && [ ! -z "$data" ]; then
        response=$(curl -s -w "\\n%{http_code}" -X $method $headers -d "$data" "$url")
    else
        response=$(curl -s -w "\\n%{http_code}" -X $method $headers "$url")
    fi

    # Split response and status code
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    echo "$status_code"
}

# Test 1: Health Check
echo -e "${BLUE}🔍 Test 1: Health Check${NC}"
status_code=$(make_request "GET" "/health/ping")
print_test_result "Health Check" "$status_code" "200"
echo ""

# Test 2: AI Models List
echo -e "${BLUE}🔍 Test 2: AI Models List${NC}"
status_code=$(make_request "GET" "/ai/models")
print_test_result "AI Models List" "$status_code" "200"
echo ""

# Test 3: Individual Model Health
echo -e "${BLUE}🔍 Test 3: Model Health Check${NC}"
status_code=$(make_request "GET" "/ai/models/claude-3-5-sonnet/health")
print_test_result "Claude 3.5 Sonnet Health" "$status_code" "200"
echo ""

# Test 4: All Models Health
echo -e "${BLUE}🔍 Test 4: All Models Health Check${NC}"
status_code=$(make_request "POST" "/ai/models/health")
print_test_result "All Models Health" "$status_code" "200"
echo ""

# Test 5: Direct Bedrock Processing
echo -e "${BLUE}🔍 Test 5: Direct Bedrock AI Processing${NC}"
bedrock_payload='{
  "prompt": "Hello, this is a test of the Bedrock API integration. Please respond with a brief confirmation.",
  "model": "claude-3-5-sonnet",
  "maxTokens": 100,
  "temperature": 0.1
}'
status_code=$(make_request "POST" "/ai/bedrock/process" "$bedrock_payload")
print_test_result "Bedrock AI Processing" "$status_code" "200"
echo ""

# Test 6: Compliance Ask (Main Feature)
echo -e "${BLUE}🔍 Test 6: Compliance Ask${NC}"
compliance_payload='{
  "question": "¿Cómo implementar MFA para cumplir con NIST CSF PR.AC-7?",
  "userId": "'$TEST_USER_ID'",
  "organizationId": '$TEST_ORG_ID',
  "context": {
    "currentFramework": "NIST_CSF_V1_1",
    "userRole": "compliance_manager",
    "industry": "technology"
  },
  "userContext": {
    "preferredLanguage": "es",
    "experienceLevel": "intermediate",
    "department": "IT Security"
  }
}'
status_code=$(make_request "POST" "/compliance/ask" "$compliance_payload")
print_test_result "Compliance Ask" "$status_code" "200"
echo ""

# Test 7: Conversation History
echo -e "${BLUE}🔍 Test 7: Conversation History${NC}"
status_code=$(make_request "GET" "/compliance/history/$TEST_USER_ID?organizationId=$TEST_ORG_ID")
print_test_result "Conversation History" "$status_code" "200"
echo ""

# Test 8: Invalid Endpoints (Error Handling)
echo -e "${BLUE}🔍 Test 8: Error Handling${NC}"

# Test invalid endpoint
status_code=$(make_request "GET" "/invalid/endpoint")
print_test_result "Invalid Endpoint" "$status_code" "404"

# Test invalid method
status_code=$(make_request "DELETE" "/health/ping")
print_test_result "Invalid Method" "$status_code" "405"

# Test malformed JSON
malformed_payload='{"invalid": json}'
status_code=$(make_request "POST" "/compliance/ask" "$malformed_payload")
print_test_result "Malformed JSON" "$status_code" "400"
echo ""

# Performance Tests
echo -e "${BLUE}🔍 Performance Tests${NC}"

# Test concurrent requests
echo "Testing concurrent requests..."
start_time=$(date +%s)

# Run 5 concurrent health checks
for i in {1..5}; do
    (make_request "GET" "/health/ping" "" "200" > /dev/null 2>&1) &
done

# Wait for all background jobs to finish
wait

end_time=$(date +%s)
duration=$((end_time - start_time))

echo -e "${GREEN}✅ Concurrent requests completed in ${duration}s${NC}"
echo ""

# Load Test (Simple)
echo -e "${BLUE}🔍 Load Test (10 requests)${NC}"
start_time=$(date +%s%N)
success_count=0
error_count=0

for i in {1..10}; do
    status_code=$(make_request "GET" "/health/ping" "" "200" 2>/dev/null)
    if [ "$status_code" -eq "200" ]; then
        ((success_count++))
    else
        ((error_count++))
    fi
done

end_time=$(date +%s%N)
duration_ms=$(( (end_time - start_time) / 1000000 ))
avg_response_time=$((duration_ms / 10))

echo "Results:"
echo "- Successful requests: $success_count/10"
echo "- Failed requests: $error_count/10"
echo "- Average response time: ${avg_response_time}ms"
echo ""

# Sample Data Tests
echo -e "${BLUE}🔍 Sample Data Tests${NC}"

# Test different compliance frameworks
frameworks=("NIST_CSF_V1_1" "ISO_27001" "SOC2_TYPE_II" "HIPAA")
questions=(
    "¿Cómo implementar controles de acceso?"
    "¿Qué documentación necesito para una auditoría?"
    "¿Cuáles son los requisitos de monitoreo?"
    "¿Cómo proteger datos de pacientes?"
)

for i in "${!frameworks[@]}"; do
    framework=${frameworks[$i]}
    question=${questions[$i]}

    framework_payload='{
      "question": "'$question'",
      "userId": "'$TEST_USER_ID'",
      "organizationId": '$TEST_ORG_ID',
      "context": {
        "currentFramework": "'$framework'",
        "userRole": "compliance_manager",
        "industry": "technology"
      }
    }'

    status_code=$(make_request "POST" "/compliance/ask" "$framework_payload")
    print_test_result "Framework Test ($framework)" "$status_code" "200"
done

echo ""

# Summary
echo -e "${GREEN}🎉 API Testing Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Test Summary:${NC}"
echo "- API Base URL: $API_BASE_URL"
echo "- Total Tests: Multiple endpoint and scenario tests"
echo "- Performance: Load testing completed"
echo "- Error Handling: Tested invalid requests"
echo "- Compliance Features: Tested multiple frameworks"
echo ""

echo -e "${BLUE}💡 Tips:${NC}"
echo "1. Monitor CloudWatch logs for detailed request/response information"
echo "2. Use the deployment-info-*.json file for endpoint URLs"
echo "3. Set up proper API keys for production environments"
echo "4. Consider implementing additional rate limiting for production"
echo ""

echo -e "${BLUE}🔧 Debugging Commands:${NC}"
echo "View logs: serverless logs -f ask --stage dev --tail"
echo "Check function metrics: aws cloudwatch get-metric-statistics --namespace AWS/Lambda"
echo "Test individual functions: serverless invoke -f ask --stage dev --data '{\"test\": \"data\"}'"
echo ""

echo -e "${GREEN}✨ All tests completed!${NC}"
