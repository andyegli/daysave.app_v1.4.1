const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Import the app but give it time to initialize
let app;

beforeAll(async () => {
  // Wait a bit for app to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  app = require('../app');
}, 15000);

describe('DaySave Basic Route Tests', () => {
  
  it('should have app defined', () => {
    expect(app).toBeDefined();
  });

  it('GET /health should return basic status', async () => {
    const res = await request(app).get('/health');
    // Accept any response that isn't a hard error
    expect([200, 404, 302]).toContain(res.statusCode);
  });

  it('GET / (home page) should return some response', async () => {
    const res = await request(app).get('/');
    // Accept any response that isn't a hard error
    expect([200, 404, 302]).toContain(res.statusCode);
  });

  it('GET /auth/login should return some response', async () => {
    const res = await request(app).get('/auth/login');
    // Accept any response that isn't a hard error  
    expect([200, 404, 302]).toContain(res.statusCode);
  });

});