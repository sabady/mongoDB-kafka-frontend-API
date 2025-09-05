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
