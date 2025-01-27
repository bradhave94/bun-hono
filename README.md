# Bun Hono API

A modern, type-safe REST API built with Bun, Hono, and OpenAPI/Swagger documentation. This project demonstrates best practices for building scalable APIs with features like CSRF protection, SQLite integration, error handling, and comprehensive API documentation.

## Features

- 🚀 Built with [Bun](https://bun.sh/) and [Hono](https://hono.dev/)
- 📚 OpenAPI/Swagger documentation with [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- 🔒 CSRF protection with token-based validation
- 💾 SQLite database integration using Bun's native SQLite support
- 🎯 Type-safe request/response handling with [Zod](https://zod.dev/)
- 📝 Structured logging with [Pino](https://getpino.io/)
- ✅ Testing setup with Bun's test runner

## Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bun-hono-api
```

2. Install dependencies:
```bash
bun install
```

3. Copy the environment configuration:
```bash
cp .env.example .env
```

## Environment Configuration

Configure the following environment variables in your `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_VERSION=v1

# Logging
LOG_LEVEL=info

# CORS Configuration
ALLOWED_ORIGINS=https://example.com,https://app.example.com
```

## Usage

### Development

Start the development server with hot reload:

```bash
bun run dev
```

### Production

Start the production server:

```bash
bun run start
```

### Testing

Run the test suite:

```bash
bun test
```

## Project Structure

```
src/
├── app.ts              # Main application setup
├── env.ts             # Environment configuration
├── index.ts           # Application entry point
├── logger.ts          # Logging configuration
├── db/                # Database configuration
│   └── index.ts       # SQLite setup and prepared statements
├── middleware/        # Global middleware
│   ├── cors.ts        # CORS configuration
│   ├── csrf.ts        # CSRF protection
│   └── error-handler.ts # Error handling
├── routes/           # API routes
│   ├── csrf/         # CSRF token endpoints
│   ├── pokemon/      # Pokemon endpoints
│   └── tasks/        # Tasks endpoints
└── types/           # Global type definitions
```

## API Documentation

The API documentation is available at `/docs` when the server is running. You can also access the OpenAPI specification at `/openapi.json`.

### CSRF Protection

The API implements CSRF protection for all mutation operations (POST, PUT, PATCH, DELETE). To make these requests:

1. Get a CSRF token:
```bash
curl http://localhost:3000/api/v1/csrf
```

2. Include the token in subsequent requests:
```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_TOKEN" \
  -d '{"title": "Complete documentation"}'
```

CSRF tokens:
- Are one-time use only
- Expire after 24 hours
- Are IP-bound
- Limited to 10 active tokens per IP

### Available Endpoints

#### Tasks API

- `GET /api/v1/tasks` - List all tasks
- `GET /api/v1/tasks/{id}` - Get a specific task
- `POST /api/v1/tasks` - Create a new task (requires CSRF token)
- `PATCH /api/v1/tasks/{id}` - Update a task (requires CSRF token)
- `DELETE /api/v1/tasks/{id}` - Delete a task (requires CSRF token)

Example request/response:

```bash
# Create a task
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_TOKEN" \
  -d '{"title": "Complete documentation"}'

# Response
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Complete documentation",
  "completed": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Pokemon API

- `GET /api/v1/pokemon` - List Pokemon with pagination
- `GET /api/v1/pokemon/{id}` - Get Pokemon details by ID or name

Example request/response:

```bash
# Get Pokemon details
curl http://localhost:3000/api/v1/pokemon/pikachu

# Response
{
  "id": 25,
  "name": "pikachu",
  "height": 4,
  "weight": 60,
  "types": [
    {
      "type": {
        "name": "electric"
      }
    }
  ],
  "sprites": {
    "front_default": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
  }
}
```

## Database

The project uses SQLite for storing CSRF tokens. The database is automatically initialized with the required schema when the application starts.

### Schema

```sql
CREATE TABLE csrf_tokens (
  token TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_csrf_tokens_ip ON csrf_tokens(ip);
CREATE INDEX idx_csrf_tokens_timestamp ON csrf_tokens(timestamp);
```

## Error Handling

All errors are standardized using the `ApiException` class:

```typescript
throw new ApiException(
  'ERROR_CODE',    // Unique error code
  'Error message', // User-friendly message
  statusCode,      // HTTP status code
  details         // Optional error details
);
```

Common error responses:
- `403 Forbidden` - Missing or invalid CSRF token
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Too many CSRF tokens requested
- `500 Internal Server Error` - Unexpected server error

## Testing Guidelines

1. Test all success and error cases
2. Use descriptive test names
3. Group related tests using `describe`
4. Test edge cases and input validation
5. Mock external services when necessary

## Deployment

1. Build the application:
```bash
bun build ./src/index.ts --target bun
```

2. Set up environment variables on your hosting platform

3. Start the server:
```bash
bun start
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

### Commit Message Format

```
type(scope): subject

body
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   Solution: Change the PORT in your .env file or kill the process using the port:
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

2. **TypeScript errors**
   ```bash
   Error: Cannot find module '@/*'
   ```
   Solution: Check your `tsconfig.json` paths configuration and ensure you're using the correct import paths.

3. **CSRF token errors**
   ```
   403 Forbidden: CSRF token is required
   ```
   Solution: Obtain a new token from `/api/v1/csrf` and include it in the `X-CSRF-Token` header.

4. **Database errors**
   ```
   Error: database is locked
   ```
   Solution: Ensure only one instance of the application is accessing the SQLite database at a time.

For more issues, please check the [issue tracker](https://github.com/your-repo/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.