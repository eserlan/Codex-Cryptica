#!/bin/bash

# Oracle Proxy Worker Deployment Script
# Automates the deployment process for the Cloudflare Worker

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKER_DIR="apps/workers/oracle-proxy"
WORKER_NAME="oracle-proxy"
WORKER_URL="https://oracle-proxy.espen-erlandsen.workers.dev"

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        print_error "Wrangler CLI is not installed"
        print_info "Install with: npm install -g wrangler"
        exit 1
    fi
    print_success "Wrangler CLI is installed ($(wrangler --version))"
    
    # Check if worker directory exists
    if [ ! -d "$WORKER_DIR" ]; then
        print_error "Worker directory not found: $WORKER_DIR"
        exit 1
    fi
    print_success "Worker directory exists: $WORKER_DIR"
    
    # Check if wrangler.toml exists
    if [ ! -f "$WORKER_DIR/wrangler.toml" ]; then
        print_error "wrangler.toml not found in $WORKER_DIR"
        exit 1
    fi
    print_success "wrangler.toml found"
    
    # Check if Cloudflare is authenticated
    if ! wrangler whoami &> /dev/null; then
        print_error "Not authenticated with Cloudflare"
        print_info "Run: wrangler login"
        exit 1
    fi
    print_success "Authenticated with Cloudflare"
}

# Deploy the worker
deploy_worker() {
    print_header "Deploying Worker"
    
    cd "$WORKER_DIR"
    
    # Deploy
    print_info "Deploying $WORKER_NAME..."
    if wrangler deploy; then
        print_success "Worker deployed successfully"
    else
        print_error "Deployment failed"
        exit 1
    fi
    
    cd - > /dev/null
}

# Check if secret is set
check_secret() {
    print_header "Checking API Key Secret"
    
    cd "$WORKER_DIR"
    
    # Try to list secrets (will fail if not set)
    # Redirect stderr to stdout to catch "No secrets set" or errors
    # wrangler secret list returns JSON by default or empty []
    secrets_list=$(wrangler secret list 2>&1)
    
    if echo "$secrets_list" | grep -q "GEMINI_API_KEY"; then
        print_success "GEMINI_API_KEY secret is configured"
        cd - > /dev/null
    else
        print_error "GEMINI_API_KEY secret is not set"
        print_info "Setting up secret now..."
        
        wrangler secret put GEMINI_API_KEY
        cd - > /dev/null
        
        if [ $? -eq 0 ]; then
            print_success "GEMINI_API_KEY secret configured"
        else
            print_error "Failed to set GEMINI_API_KEY secret"
            exit 1
        fi
    fi
}

# Run health check
health_check() {
    print_header "Running Health Check"
    
    print_info "Waiting 10 seconds for deployment to propagate..."
    sleep 10
    
    print_info "Sending test request to $WORKER_URL..."
    
    # Send a minimal valid request
    response=$(curl -s -w "\n%{http_code}" \
        -X POST "$WORKER_URL" \
        -H "Content-Type: application/json" \
        -H "Origin: https://codex-cryptica.com" \
        -d '{
            "contents": [{"role": "user", "parts": [{"text": "health check"}]}],
            "generationConfig": {},
            "model": "gemini-3-flash-preview"
        }')
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    print_info "Response status: $status_code"
    
    # Check response
    case $status_code in
        200)
            print_success "Worker is responding correctly (200 OK)"
            # Try to parse response
            if echo "$body" | jq . > /dev/null 2>&1; then
                print_success "Response is valid JSON"
            fi
            ;;
        400|401)
            print_info "Worker is responding (expected for test request)"
            ;;
        403)
            print_error "CORS check failed - origin not allowed"
            print_info "Check ALLOWED_ORIGINS in wrangler.toml"
            ;;
        *)
            print_error "Unexpected response code: $status_code"
            print_info "Response body: $body"
            ;;
    esac
}

# Show deployment info
show_info() {
    print_header "Deployment Information"
    
    echo -e "Worker Name:  ${GREEN}$WORKER_NAME${NC}"
    echo -e "Worker URL:   ${GREEN}$WORKER_URL${NC}"
    echo -e "Directory:    ${GREEN}$WORKER_DIR${NC}"
    echo ""
    print_info "Useful commands:"
    echo "  wrangler tail              - View live logs"
    echo "  wrangler status            - Check worker status"
    echo "  wrangler secret list       - List configured secrets"
    echo "  wrangler deploy --dry-run  - Test deployment locally"
}

# Main execution
main() {
    print_header "Oracle Proxy Worker Deployment"
    
    # Parse arguments
    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            deploy_worker
            check_secret
            health_check
            show_info
            print_success "Deployment complete!"
            ;;
        check)
            check_prerequisites
            ;;
        secret)
            check_prerequisites
            check_secret
            ;;
        health)
            health_check
            ;;
        info)
            show_info
            ;;
        *)
            echo "Usage: $0 {deploy|check|secret|health|info}"
            echo ""
            echo "Commands:"
            echo "  deploy  - Full deployment (default)"
            echo "  check   - Check prerequisites"
            echo "  secret  - Configure API key secret"
            echo "  health  - Run health check"
            echo "  info    - Show deployment information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
