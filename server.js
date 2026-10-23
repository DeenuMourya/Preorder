const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const RADIUS_KM = 3;

const seed = {
  nextRequestId: 1,
  stores: [
    { id: 1, name: 'Lakshmi Kirana', owner: 'Ravi Kumar', phone: '9000000001', lat: 17.3854, lng: 78.4867, active: true },
    { id: 2, name: 'Green Basket', owner: 'Anita Sharma', phone: '9000000002', lat: 17.3912, lng: 78.4811, active: true },
    { id: 3, name: 'City Daily Needs', owner: 'Mohammed Ali', phone: '9000000003', lat: 17.3768, lng: 78.4932, active: true }
  ],
  requests: []
};

function readData() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function numeric(value, name) {
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`${name} must be a number`);
  return result;
}
function haversineKm(lat1, lng1, lat2, lng2) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function nearbyStores(data, lat, lng, radiusKm = RADIUS_KM) {
  return data.stores.filter(store => store.active)
    .map(store => ({ ...store, distanceKm: haversineKm(lat, lng, store.lat, store.lng) }))
    .filter(store => store.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
function error(res, message, status = 400) { return res.status(status).json({ error: message }); }

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true, prototype: 'PreOrder mediator' }));
app.get('/api/stores', (req, res) => res.json(readData().stores));
app.get('/api/stores/nearby', (req, res) => {
  try {
    const lat = numeric(req.query.lat, 'lat');
    const lng = numeric(req.query.lng, 'lng');
    const radiusKm = req.query.radiusKm ? numeric(req.query.radiusKm, 'radiusKm') : RADIUS_KM;
    res.json(nearbyStores(readData(), lat, lng, radiusKm));
  } catch (e) { error(res, e.message); }
});

app.post('/api/digitize', (req, res) => {
  res.json({ source: 'mock-ocr', items: [
    { item: 'Rice', quantity: '5 kg', brand: '' },
    { item: 'Milk', quantity: '2 packets', brand: '' },
    { item: 'Sugar', quantity: '1 kg', brand: '' }
  ] });
});

app.get('/api/requests', (req, res) => {
  const data = readData();
  res.json(data.requests.map(request => ({ ...request, store: data.stores.find(s => s.id === request.assignedStoreId) || null })));
});

app.get('/api/requests/:id', (req, res) => {
  const data = readData();
  const request = data.requests.find(item => item.id === Number(req.params.id));
  if (!request) return error(res, 'Request not found', 404);
  res.json({ ...request, store: data.stores.find(s => s.id === request.assignedStoreId) || null });
});

app.post('/api/requests', (req, res) => {
  try {
    const { customerName, phone, lat, lng, fulfillmentChoice, items } = req.body;
    if (!customerName || !phone || !Array.isArray(items) || items.length === 0) return error(res, 'customerName, phone, and at least one item are required');
    const latitude = numeric(lat, 'lat');
    const longitude = numeric(lng, 'lng');
    if (!['Store_Pickup', 'Hyperlocal_Delivery'].includes(fulfillmentChoice)) return error(res, 'Invalid fulfillment choice');
    const data = readData();
    const matches = nearbyStores(data, latitude, longitude);
    const request = {
      id: data.nextRequestId++, customerName, phone, lat: latitude, lng: longitude,
      fulfillmentChoice, items: items.filter(item => item.item && item.quantity),
      assignedStoreId: matches[0]?.id || null, nearbyStoreIds: matches.map(store => store.id),
      status: matches.length ? 'Transmitted_To_Store' : 'Pending_Store_Matching',
      negotiation: null, verificationCode: null, createdAt: new Date().toISOString()
    };
    if (request.items.length === 0) return error(res, 'At least one valid item is required');
    data.requests.unshift(request); writeData(data);
    res.status(201).json({ request, matches });
  } catch (e) { error(res, e.message); }
});

app.post('/api/requests/:id/respond', (req, res) => {
  const data = readData();
  const request = data.requests.find(item => item.id === Number(req.params.id));
  if (!request) return error(res, 'Request not found', 404);
  const { action, storeId, modifications } = req.body;
  if (!['accept_full', 'reject', 'modify'].includes(action)) return error(res, 'Invalid merchant action');
  if (storeId && !data.stores.some(store => store.id === Number(storeId))) return error(res, 'Store not found');
  request.assignedStoreId = Number(storeId || request.assignedStoreId);
  if (action === 'accept_full') { request.status = 'Accepted_Full'; request.verificationCode = String(Math.floor(100000 + Math.random() * 900000)); request.negotiation = null; }
  if (action === 'reject') { request.status = 'Rejected_By_Store'; request.negotiation = null; }
  if (action === 'modify') { if (!Array.isArray(modifications) || !modifications.length) return error(res, 'Add at least one modification'); request.status = 'Accepted_Partial'; request.negotiation = { modifications, approved: false, updatedAt: new Date().toISOString() }; }
  writeData(data); res.json(request);
});

app.post('/api/requests/:id/approve', (req, res) => {
  const data = readData();
  const request = data.requests.find(item => item.id === Number(req.params.id));
  if (!request) return error(res, 'Request not found', 404);
  if (request.status !== 'Accepted_Partial' || !request.negotiation) return error(res, 'No pending modification to approve');
  request.negotiation.approved = true; request.status = 'Accepted_Full'; request.verificationCode = String(Math.floor(100000 + Math.random() * 900000));
  writeData(data); res.json(request);
});

app.listen(PORT, () => console.log(`PreOrder prototype running at http://localhost:${PORT}`));
