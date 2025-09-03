# SOPS Setup Guide for Unity API

This guide explains how to set up and use SOPS (Secrets OPerationS) for encrypting sensitive configuration files in the Unity API project.

## 🔐 What is SOPS?

SOPS (Secrets OPerationS) is a tool for encrypting and decrypting files containing sensitive information. It's designed to work well with GitOps workflows, allowing you to commit encrypted secrets to version control while keeping them secure.

## 🚀 Quick Setup

### 1. Install Prerequisites

#### Install SOPS
```bash
# macOS
brew install sops

# Ubuntu/Debian
sudo apt-get install sops

# Or download from: https://github.com/mozilla/sops/releases
```

#### Install age (encryption tool)
```bash
# macOS
brew install age

# Ubuntu/Debian
sudo apt-get install age

# Or download from: https://github.com/FiloSottile/age/releases
```

### 2. Run Setup Script
```bash
chmod +x scripts/setup-sops.sh
./scripts/setup-sops.sh
```

This script will:
- Generate an age keypair
- Update `.sops.yaml` with your public key
- Encrypt existing secret files
- Update `.gitignore`
- Create helper scripts

## 📁 File Structure

After setup, your project will have:

```
unity-api/
├── .sops.yaml                    # SOPS configuration
├── .age-key                      # Private encryption key (DO NOT COMMIT)
├── env.dev.yaml                  # Development environment (unencrypted)
├── env.dev.enc.yaml             # Development environment (encrypted)
├── env.prod.yaml                # Production environment (unencrypted)
├── env.prod.enc.yaml           # Production environment (encrypted)
├── Kubernetes/
│   ├── kubernetes-secrets.enc.yaml  # Kubernetes secrets (encrypted)
│   └── mongodb-deployment.yaml      # MongoDB deployment
├── scripts/
│   ├── setup-sops.sh            # Initial setup script
│   ├── encrypt-secrets.sh       # Encrypt secrets
│   └── decrypt-secrets.sh       # Decrypt secrets
└── .github/
    └── workflows/
        └── deploy.yml            # GitHub Actions deployment
```

## 🔄 Daily Usage

### Encrypting New Secrets
```bash
# Edit your secret file (e.g., env.dev.yaml)
vim env.dev.yaml

# Encrypt it
./scripts/encrypt-secrets.sh

# Commit the encrypted file
git add env.dev.enc.yaml
git commit -m "Update encrypted secrets"
```

### Decrypting for Local Development
```bash
# Decrypt secrets for local use
./scripts/decrypt-secrets.sh

# Use the decrypted files
# ... your development work ...

# Clean up decrypted files (for security)
rm env.dev.yaml
rm Kubernetes/kubernetes-secrets.yaml
```

### Manual Encryption/Decryption
```bash
# Encrypt a file
sops -e env.dev.yaml > env.dev.enc.yaml

# Decrypt a file
sops -d env.dev.enc.yaml > env.dev.yaml

# Edit encrypted file in place
sops env.dev.enc.yaml
```

## 🚀 GitHub Actions Integration

The GitHub Actions workflow automatically:

1. **Installs SOPS** in the CI/CD environment
2. **Decrypts secrets** before deployment
3. **Applies secrets** to Kubernetes
4. **Cleans up** decrypted files for security

### Required GitHub Secrets

Add these to your repository secrets:

- `KUBE_CONFIG`: Base64-encoded kubeconfig file
- `SOPS_AGE_KEY`: Your age private key (optional, for custom decryption)

## 🔒 Security Best Practices

### ✅ DO
- Commit encrypted files (`.enc.yaml`) to Git
- Share the `.age-key` securely with your team
- Use different keys for different environments
- Rotate keys regularly
- Use strong, unique passwords in secret files

### ❌ DON'T
- Commit unencrypted secret files
- Commit the `.age-key` file
- Share private keys in public repositories
- Use the same keys across multiple projects
- Store production keys in development environments

## 🛠️ Troubleshooting

### Common Issues

#### 1. "SOPS not found" error
```bash
# Install SOPS first
brew install sops  # macOS
sudo apt-get install sops  # Ubuntu/Debian
```

#### 2. "age not found" error
```bash
# Install age first
brew install age  # macOS
sudo apt-get install age  # Ubuntu/Debian
```

#### 3. Decryption fails
```bash
# Check if you have the correct .age-key
ls -la .age-key

# Verify the key works
age-keygen -y .age-key
```

#### 4. GitHub Actions decryption fails
- Ensure the workflow has access to the repository
- Check if the age key is properly configured
- Verify the encrypted files are committed

### Debug Commands

```bash
# Check SOPS version
sops --version

# Check age version
age --version

# Verify encryption
sops -d env.dev.enc.yaml | head -5

# List encrypted files
find . -name "*.enc.yaml"
```

## 🔄 Key Rotation

To rotate your encryption keys:

1. **Generate new keypair**
   ```bash
   age-keygen -o .age-key.new
   ```

2. **Update .sops.yaml** with the new public key

3. **Re-encrypt all files**
   ```bash
   ./scripts/encrypt-secrets.sh
   ```

4. **Test decryption** with the new key

5. **Update team** with the new private key

6. **Remove old key** and commit changes

## 📚 Additional Resources

- [SOPS Documentation](https://github.com/mozilla/sops)
- [age Documentation](https://github.com/FiloSottile/age)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [GitHub Actions](https://docs.github.com/en/actions)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the SOPS and age documentation
3. Check GitHub Actions logs for deployment issues
4. Open an issue in the repository

---

**Remember**: Security is everyone's responsibility. Keep your keys safe and never commit sensitive information to version control!
