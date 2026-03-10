import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

const SMOOBU_API = 'https://login.smoobu.com/api';
const headers = {
  'Api-Key': process.env.SMOOBU_API_KEY!,
  'Content-Type': 'application/json'
};

test.describe('Smoobu API — Availability & Property Tests', () => {

  test('API is reachable and returns properties', async ({ request }) => {
    const response = await request.get(`${SMOOBU_API}/apartments`, { headers });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    console.log('Properties found:', JSON.stringify(data, null, 2));
  });

});
