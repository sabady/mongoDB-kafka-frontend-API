#!/bin/bash

# SOPS Setup Script for Unity API
# This script helps set up SOPS encryption for secrets

set -e

echo "🔐 Setting up SOPS encryption for Unity API..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if SOPS is installed
if ! command -v sops &> /dev/null; then
    print_error "SOPS is not installed. Please install it first:"
    echo "  macOS: brew install sops"
    echo "  Ubuntu/Debian: sudo apt-get install sops"
    echo "  Or download from: https://github.com/mozilla/sops/releases"
    exit 1
fi

print_status "SOPS is installed: $(sops --version)"

# Check if age is installed
if ! command -v age &> /dev/null; then
    print_error "age is not installed. Please install it first:"
    echo "  macOS: brew install age"
    echo "  Ubuntu/Debian: sudo apt-get install age"
    echo "  Or download from: https://github.com/FiloSottile/age/releases"
    exit 1
fi

print_status "age is installed: $(age --version)"

# Generate age keypair if it doesn't exist
if [ ! -f ".age-key" ]; then
    print_step "Generating new age keypair..."
    age-keygen -o .age-key
    print_status "Generated .age-key"
    
    # Extract public key
    PUBLIC_KEY=$(age-keygen -y .age-key)
    echo "Public key: $PUBLIC_KEY"
    echo ""
    print_warning "IMPORTANT: Add this public key to your .sops.yaml file"
    print_warning "Also, add .age-key to your .gitignore file"
else
    print_status "Using existing .age-key"
    PUBLIC_KEY=$(age-keygen -y .age-key)
    echo "Public key: $PUBLIC_KEY"
fi

# Update .sops.yaml with the actual public key
print_step "Updating .sops.yaml with your public key..."
sed -i.bak "s|age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p|$PUBLIC_KEY|g" .sops.yaml
rm -f .sops.yaml.bak

print_status "Updated .sops.yaml with your public key"

# Encrypt the environment files
print_step "Encrypting environment files..."

if [ -f "env.dev.yaml" ]; then
    sops -e env.dev.yaml > env.dev.enc.yaml
    print_status "Encrypted env.dev.yaml -> env.dev.enc.yaml"
else
    print_warning "env.dev.yaml not found, skipping encryption"
fi

if [ -f "Kubernetes/kubernetes-secrets.enc.yaml" ]; then
    # This file should already be encrypted, but let's verify
    if sops -d Kubernetes/kubernetes-secrets.enc.yaml &> /dev/null; then
        print_status "Kubernetes secrets file is already encrypted"
    else
        print_warning "Kubernetes secrets file appears to be unencrypted"
    fi
fi

# Update .gitignore
print_step "Updating .gitignore..."
if ! grep -q ".age-key" .gitignore; then
    echo "" >> .gitignore
    echo "# SOPS age key" >> .gitignore
    echo ".age-key" >> .gitignore
    print_status "Added .age-key to .gitignore"
fi

if ! grep -q "*.enc.yaml" .gitignore; then
    echo "" >> .gitignore
    echo "# SOPS encrypted files" >> .gitignore
    echo "*.enc.yaml" >> .gitignore
    print_status "Added *.enc.yaml to .gitignore"
fi

# Create encryption helper script
print_step "Creating encryption helper script..."
cat > scripts/encrypt-secrets.sh << 'EOF'
#!/bin/bash

# Encrypt secrets with SOPS
# Usage: ./scripts/encrypt-secrets.sh

set -e

echo "🔐 Encrypting secrets with SOPS..."

# Encrypt environment files
if [ -f "env.dev.yaml" ]; then
    sops -e env.dev.yaml > env.dev.enc.yaml
    echo "✅ Encrypted env.dev.yaml -> env.dev.enc.yaml"
fi

if [ -f "env.prod.yaml" ]; then
    sops -e env.prod.yaml > env.prod.enc.yaml
    echo "✅ Encrypted env.prod.yaml -> env.prod.enc.yaml"
fi

# Encrypt Kubernetes secrets
if [ -f "Kubernetes/kubernetes-secrets.yaml" ]; then
    sops -e Kubernetes/kubernetes-secrets.yaml > Kubernetes/kubernetes-secrets.enc.yaml
    echo "✅ Encrypted kubernetes-secrets.yaml -> kubernetes-secrets.enc.yaml"
fi

echo "🎉 All secrets encrypted successfully!"
echo "Remember to commit the encrypted files (.enc.yaml) to git"
echo "But NEVER commit the unencrypted files or .age-key"
EOF

chmod +x scripts/encrypt-secrets.sh
print_status "Created scripts/encrypt-secrets.sh"

# Create decryption helper script
print_step "Creating decryption helper script..."
cat > scripts/decrypt-secrets.sh << 'EOF'
#!/bin/bash

# Decrypt secrets with SOPS
# Usage: ./scripts/decrypt-secrets.sh

set -e

echo "🔓 Decrypting secrets with SOPS..."

# Decrypt environment files
if [ -f "env.dev.enc.yaml" ]; then
    sops -d env.dev.enc.yaml > env.dev.yaml
    echo "✅ Decrypted env.dev.enc.yaml -> env.dev.yaml"
fi

if [ -f "env.prod.enc.yaml" ]; then
    sops -d env.prod.enc.yaml > env.prod.yaml
    echo "✅ Decrypted env.prod.enc.yaml -> env.prod.yaml"
fi

# Decrypt Kubernetes secrets
if [ -f "Kubernetes/kubernetes-secrets.enc.yaml" ]; then
    sops -d Kubernetes/kubernetes-secrets.enc.yaml > Kubernetes/kubernetes-secrets.yaml
    echo "✅ Decrypted kubernetes-secrets.enc.yaml -> kubernetes-secrets.yaml"
fi

echo "🎉 All secrets decrypted successfully!"
echo "Remember to add decrypted files to .gitignore"
echo "And clean them up after use for security"
EOF

chmod +x scripts/decrypt-secrets.sh
print_status "Created scripts/decrypt-secrets.sh"

echo ""
print_status "🎉 SOPS setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Review and commit the encrypted files (.enc.yaml)"
echo "2. Add .age-key to your .gitignore (already done)"
echo "3. Share the .age-key securely with your team"
echo "4. Use scripts/encrypt-secrets.sh to encrypt new secrets"
echo "5. Use scripts/decrypt-secrets.sh to decrypt for local development"
echo ""
echo "⚠️  IMPORTANT: Never commit .age-key or unencrypted secret files!"
echo "✅ Encrypted files (.enc.yaml) are safe to commit"
