const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app'); // Make sure app.js exports the Express app

describe('DaySave Route Integration Tests', () => {
  it('GET /files should return 200 and show file management', async () => {
    const res = await request(app).get('/files');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/File Management Home/);
  });

  it('POST /files/upload should upload a file and redirect', async () => {
    const testFile = path.join(__dirname, 'testfile.txt');
    fs.writeFileSync(testFile, 'test content');
    const res = await request(app)
      .post('/files/upload')
      .attach('file', testFile);
    expect(res.statusCode).toBe(302); // Redirect after upload
    fs.unlinkSync(testFile);
  });

  it('GET /contacts should return 200', async () => {
    const res = await request(app).get('/contacts');
    expect(res.statusCode).toBe(200);
  });

  it('GET /content should return 200', async () => {
    const res = await request(app).get('/content');
    expect(res.statusCode).toBe(200);
  });

  it('GET /admin/users should return 200', async () => {
    const res = await request(app).get('/admin/users');
    expect(res.statusCode).toBe(200);
  });

  it('GET /social should return 200', async () => {
    const res = await request(app).get('/social');
    expect(res.statusCode).toBe(200);
  });
});