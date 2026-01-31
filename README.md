# Hotel Booking Workflow Service

A simplified internal booking workflow service built with NestJS, featuring async processing via BullMQ, Postgres persistence, and a mock vendor API with retry logic.

## Features

- **Booking transitions**: pending → confirmed / failed
- **Async processing**: BullMQ handles vendor API calls in background
- **Retry logic**: Exponential backoff (5 attempts: 1s, 2s, 4s, 8s, 16s)
- **Idempotency**: Client-provided X-Idempotency-Key prevents duplicates
- **Mock vendor API**: 30% failure rate with random delays (100ms-2s)
- **Logging**: Winston with console + daily rotating error log files

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Run with Docker

```bash
# Start all services (app, postgres, redis)
docker compose up --build

# Run database migrations (in separate terminal)
docker compose exec app npx sequelize-cli db:migrate
```

The API is available at `http://localhost:4050`

### Local Development

```bash
# Install dependencies
npm install

# Start Postgres and Redis
docker compose up db redis -d

# Run migrations
npx sequelize-cli db:migrate

# Start in dev mode
npm run start:dev
```

## API Endpoints

### Create Booking

```bash
curl -X POST http://localhost:4050/bookings \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: unique-key-123" \
  -d '{
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "checkIn": "2026-02-15",
    "checkOut": "2026-02-20",
    "roomType": "deluxe"
  }'

curl -X POST http://localhost:4050/bookings \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: unique-key-456" \
  -d '{
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "checkIn": "2026-02-15",
    "checkOut": "2026-02-20",
    "roomType": "deluxe"
  }'
```

Failed Response Example:

```bash
app-1    | 2026-01-31T13:53:24.685Z [error]: Booking 2 failed on attempt 1 {"bookingId":2,"attempt":1,"error":"Vendor service unavailable (503)","stack":"VendorUnavailableError: Vendor service unavailable (503)\n    at MockVendorService.randomError (/app/dist/shared/services/mock-vendor.service.js:38:13)\n    at MockVendorService.createBooking (/app/dist/shared/services/mock-vendor.service.js:22:24)\n    at async BookingProcessor.process (/app/dist/modules/booking/booking.processor.js:41:36)\n    at async /app/node_modules/bullmq/dist/cjs/classes/worker.js:569:32"}
app-1    | 2026-01-31T13:53:24.770Z [error]: Job failed for booking 2 {"bookingId":2,"attempt":1,"error":"Vendor service unavailable (503)","willRetry":true}
app-1    | 2026-01-31T13:53:25.772Z [info]: Processing booking 2, attempt 2
app-1    | 2026-01-31T13:53:26.380Z [info]: Booking 2 confirmed with vendor ID: VENDOR-22a872d4-3606-4966-913a-9071d74038de
app-1    | 2026-01-31T13:53:26.386Z [info]: Job completed for booking 2
```

Response (201 Created):

```json
{
  "data": {
    "id": 1,
    "idempotencyKey": "unique-key-123",
    "status": "pending",
    "vendorBookingId": null,
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "checkIn": "2026-02-15",
    "checkOut": "2026-02-20",
    "roomType": "deluxe",
    "failureReason": null,
    "retryCount": 0,
    "createdAt": "2026-01-31T12:00:00.000Z",
    "updatedAt": "2026-01-31T12:00:00.000Z"
  }
}
```

### Get Booking by ID

```bash
curl http://localhost:4050/bookings/1
```

### List Bookings (Paginated)

```bash
curl "http://localhost:4050/bookings?page=1&limit=10"
```

Response:

```json
{
  "data": [...],
  "meta": {
    "count": 10,
    "total": 25,
    "page": 1,
    "pageCount": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Booking Status Flow

```
POST /bookings
      │
      ▼
  ┌─────────┐
  │ pending │
  └────┬────┘
       │ (BullMQ processes async)
       ▼
  ┌─────────────────────────────────┐
  │    Call Mock Vendor API         │
  │    (30% failure, 100-2000ms)    │
  └────────────┬────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
  ┌──────────┐   ┌──────────┐
  │confirmed │   │  retry   │
  └──────────┘   └────┬─────┘
                      │ (up to 5 attempts)
                      ▼
                 ┌──────────┐
                 │  failed  │
                 └──────────┘
```

## Environment Variables

| Variable           | Default     | Description                    |
| ------------------ | ----------- | ------------------------------ |
| DATABASE_HOST      | localhost   | Postgres host                  |
| DATABASE_PORT      | 5436        | Postgres port                  |
| DATABASE_NAME      | booking     | Database name                  |
| DATABASE_USER      | postgres    | Database user                  |
| DATABASE_PASSWORD  | postgres    | Database password              |
| REDIS_HOST         | localhost   | Redis host                     |
| REDIS_PORT         | 6379        | Redis port                     |
| PORT               | 4050        | App port                       |
| NODE_ENV           | development | Environment                    |
| MAX_RETRY_ATTEMPTS | 5           | Max vendor API retries         |
| RETRY_DELAY_MS     | 1000        | Base retry delay (exponential) |

## Logs

Error logs are written to `logs/booking-errors-YYYY-MM-DD.log` with:

- Timestamp
- Booking ID
- Attempt number
- Error message
- Stack trace

## Testing

```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```
