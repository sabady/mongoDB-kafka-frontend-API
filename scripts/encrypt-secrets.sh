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
