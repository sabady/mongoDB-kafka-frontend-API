# API

A modern, secure, and scalable backend API built with Node.js, Express, and TypeScript.

## 🚀 Features

- **TypeScript**: Full TypeScript support with strict type checking
- **Express.js**: Fast, unopinionated web framework
- **MongoDB Integration**: Data persistence with Mongoose ODM
- **Kafka Integration**: Real-time message processing with KRaft mode
- **Web Application**: Customer-facing web interface with purchase system
- **Security**: Helmet, CORS, rate limiting, and security headers
- **Logging**: Winston structured logging with Morgan HTTP logger
- **Compression**: Response compression for better performance
- **Environment Configuration**: Flexible environment variable management
- **Health Checks**: Comprehensive health monitoring endpoints
- **Error Handling**: Global error handling with proper HTTP status codes
- **Rate Limiting**: API rate limiting to prevent abuse
- **SOPS Encryption**: Secure secrets management for GitOps workflows

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
This starts the server with nodemon for automatic reloading.

### Web Application (Full Stack)
```bash
# Start the complete web application (API + Kafka Producer + Web UI)
./scripts/start-web-app.sh

# Test the web application
./scripts/test-web-app.sh

# Access the web application
open http://localhost:3000
```

### Production Mode
```bash
npm run build
npm start
```

## 📚 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run dev:producer` - Start Kafka producer service
- `npm run dev:all` - Start both API and producer services
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run start:producer` - Start Kafka producer service
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## 🌐 API Endpoints

### Web Application
- `GET /` - Customer-facing web application
- `GET /health` - Server health status
- `GET /health/detailed` - Detailed health check with dependencies
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe
- `GET /health/metrics` - System metrics

### Users API
- `GET /api/users` - Get all users (with pagination and filtering)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (soft delete)
- `GET /api/users/:id/events` - Get user events

### Events API
- `GET /api/events` - Get all events (with pagination and filtering)
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create new event
- `GET /api/events/stats` - Get event statistics
- `POST /api/events/retry` - Retry failed events
- `GET /api/events/type/:type` - Get events by type

### Kafka Producer Service (Port 3001)
- `GET /health` - Producer health check
- `POST /produce` - Send message to Kafka
- `POST /purchase` - Send purchase event to Kafka

## 🔧 Configuration

The application can be configured using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `ALLOWED_ORIGINS` | localhost:3000 | CORS allowed origins |

## 🏗️ Project Structure

```
api/
├── src/
│   └── index.ts          # Main application entry point
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── env.example           # Environment variables template
└── README.md             # This file
```

## 🔒 Security Features

- **Helmet**: Security headers for protection against common vulnerabilities
- **CORS**: Configurable Cross-Origin Resource Sharing
- **Rate Limiting**: Prevents API abuse with configurable limits
- **Input Validation**: JSON body size limits and validation
- **Error Handling**: Secure error messages (no sensitive data in production)
- **SOPS Encryption**: Secrets encrypted with SOPS for secure GitOps workflows
- **Kubernetes Secrets**: Secure secret management for containerized deployments

## 🧪 Testing

```bash
npm test
```

## 📝 Code Quality

```bash
npm run lint        # Check for linting issues
npm run lint:fix    # Automatically fix linting issues
```

## 🚀 Deployment

### Local Development
1. Build the application: `npm run build`
2. Decrypt secrets: `./scripts/decrypt-secrets.sh`
3. Set environment variables
4. Start the server: `npm start`

### Kubernetes Deployment
1. Set up SOPS encryption: `./scripts/setup-sops.sh`
2. Encrypt secrets: `./scripts/encrypt-secrets.sh`
3. Push encrypted secrets to Git
4. GitHub Actions will automatically deploy to Kubernetes

### SOPS Setup
For detailed SOPS setup instructions, see [docs/SOPS_SETUP.md](docs/SOPS_SETUP.md)

### Web Application
For detailed web application documentation, see [docs/WEB_APPLICATION.md](docs/WEB_APPLICATION.md)

### API Documentation
For complete API documentation, see [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository.
