# PreOrder Prototype

A lightweight prototype for the PreOrder digital mediator workflow. It connects customers with nearby stores without maintaining store inventory or a product catalog.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000.

## Image upload, camera, and OCR

The customer screen now supports:

- Uploading a parchi image from a computer or phone.
- Opening the phone camera with the `environment` camera preference.
- Capturing a photo directly in the browser.
- Running OCR with Tesseract.js in the browser.
- Converting detected lines into editable item and quantity fields.
- Reviewing and correcting the result before creating a request.

Tesseract.js is loaded from jsDelivr at runtime, so the first OCR run requires an internet connection. The image is processed in the browser and is not uploaded to this prototype server. OCR quality depends on lighting, focus, handwriting, language, and image quality. The current parser is intentionally simple and works best with printed or clearly written English item lists.

For camera access, run the application on `localhost` or HTTPS and grant browser camera permission. If camera access is unavailable, use the image upload control.

## Prototype endpoints

- `GET /api/health`
- `GET /api/stores/nearby?lat=17.385&lng=78.486&radiusKm=3`
- `POST /api/digitize` — legacy mock OCR endpoint
- `GET /api/requests`
- `POST /api/requests`
- `GET /api/requests/:id`
- `POST /api/requests/:id/respond`
- `POST /api/requests/:id/approve`

## Scope and limitations

This demo intentionally uses a JSON file instead of PostgreSQL/PostGIS so it runs with one dependency and no cloud credentials. Store matching uses a JavaScript Haversine calculation. Authentication, payments, notifications, and real-time updates are omitted. A production version should use authenticated users, object storage, a real OCR provider with multilingual support, and transactional request state transitions.
