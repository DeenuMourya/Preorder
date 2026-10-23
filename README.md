# PreOrder Prototype

A lightweight prototype for the PreOrder digital mediator workflow. It connects customers with nearby stores without maintaining store inventory or a product catalog.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000.

Use **Customer mode** to create a request. Use **Merchant mode** to accept, reject, or propose substitutions. The application persists demo data in `data.json`, which is created automatically on startup.

## Prototype endpoints

- `GET /api/health`
- `GET /api/stores/nearby?lat=17.385&lng=78.486&radiusKm=3`
- `POST /api/digitize` — mock parchi OCR
- `GET /api/requests`
- `POST /api/requests`
- `GET /api/requests/:id`
- `POST /api/requests/:id/respond`
- `POST /api/requests/:id/approve`

## Scope and limitations

This demo intentionally uses a JSON file instead of PostgreSQL/PostGIS so it runs with one dependency and no cloud credentials. Store matching uses a JavaScript Haversine calculation. OCR, authentication, payments, notifications, and real-time updates are mocked or omitted. A production version should use PostgreSQL/PostGIS, authenticated users, object storage, a real OCR provider, and transactional request state transitions.
