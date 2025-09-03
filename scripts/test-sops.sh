#!/bin/bash

# Test SOPS encryption/decryption
# This script tests that SOPS is working correctly

set -e

echo "🧪 Testing SOPS encryption/decryption..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if SOPS is installed
if ! command -v sops &> /dev/null; then
    print_error "SOPS is not installed. Please install it first."
    exit 1
fi

# Check if age is installed
if ! command -v age &> /dev/null; then
    print_error "age is not installed. Please install it first."
    exit 1
fi

print_status "SOPS version: $(sops --version)"
print_status "age version: $(age --version)"

# Check if .age-key exists
if [ ! -f ".age-key" ]; then
    print_error ".age-key not found. Please run setup-sops.sh first."
    exit 1
fi

print_status "Found .age-key file"

# Create a test file
TEST_FILE="test-secret.yaml"
print_status "Creating test file: $TEST_FILE"

cat > "$TEST_FILE" << 'EOF'
# Test secret file
apiVersion: v1
kind: Secret
metadata:
  name: test-secret
type: Opaque
data:
  username: dGVzdC11c2Vy  # "test-user" in base64
  password: dGVzdC1wYXNz  # "test-pass" in base64
EOF

# Encrypt the test file
print_status "Encrypting test file..."
sops -e "$TEST_FILE" > "${TEST_FILE}.enc"

if [ -f "${TEST_FILE}.enc" ]; then
    print_status "✅ Successfully encrypted $TEST_FILE -> ${TEST_FILE}.enc"
else
    print_error "❌ Failed to encrypt $TEST_FILE"
    exit 1
fi

# Decrypt the test file
print_status "Decrypting test file..."
sops -d "${TEST_FILE}.enc" > "${TEST_FILE}.dec"

if [ -f "${TEST_FILE}.dec" ]; then
    print_status "✅ Successfully decrypted ${TEST_FILE}.enc -> ${TEST_FILE}.dec"
else
    print_error "❌ Failed to decrypt ${TEST_FILE}.enc"
    exit 1
fi

# Compare original and decrypted files
if diff "$TEST_FILE" "${TEST_FILE}.dec" > /dev/null; then
    print_status "✅ Original and decrypted files match"
else
    print_error "❌ Original and decrypted files do not match"
    exit 1
fi

# Test editing encrypted file in place
print_status "Testing encrypted file editing..."
sops "${TEST_FILE}.enc" --replace-in-place

# Clean up test files
print_status "Cleaning up test files..."
rm -f "$TEST_FILE" "${TEST_FILE}.enc" "${TEST_FILE}.dec"

print_status "🎉 All SOPS tests passed!"
echo ""
echo "Your SOPS setup is working correctly!"
echo "You can now:"
echo "1. Encrypt secrets: ./scripts/encrypt-secrets.sh"
echo "2. Decrypt secrets: ./scripts/decrypt-secrets.sh"
echo "3. Edit encrypted files: sops filename.enc.yaml"
echo ""
echo "Remember to commit encrypted files (.enc.yaml) to git"
echo "But NEVER commit unencrypted files or .age-key"
