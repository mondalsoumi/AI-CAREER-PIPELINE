const assert = require('assert');

async function runTests() {
  const gatewayUrl = 'http://localhost:8000/api/auth';
  const email = `gateway-${Date.now()}@example.com`;
  const password = 'PasswordGate123';
  const name = 'Gateway Test User';

  console.log(`Starting API Gateway Verification via Port 8000 (Targeting email: ${email})`);

  // Check 1: Register via Port 8000
  console.log('\n--- Check 1: Register via Port 8000 ---');
  const registerRes = await fetch(`${gatewayUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  
  const registerData = await registerRes.json();
  console.log(`Registration Status: ${registerRes.status}`);
  console.log('Registration Response:', JSON.stringify(registerData, null, 2));
  assert.strictEqual(registerRes.status, 201, 'Registration via Gateway should succeed with 201');
  assert.ok(registerData.token, 'Registration should return token');

  // Check 2: Login via Port 8000
  console.log('\n--- Check 2: Login via Port 8000 ---');
  const loginRes = await fetch(`${gatewayUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const loginData = await loginRes.json();
  console.log(`Login Status: ${loginRes.status}`);
  console.log('Login Response:', JSON.stringify(loginData, null, 2));
  assert.strictEqual(loginRes.status, 200, 'Login via Gateway should succeed with 200');
  assert.ok(loginData.token, 'Login should return token');
  const token = loginData.token;

  // Check 3: Request profile via Port 8000 without token (expect 401)
  console.log('\n--- Check 3: Request Profile without Token ---');
  const meNoTokenRes = await fetch(`${gatewayUrl}/me`, {
    method: 'GET'
  });

  const meNoTokenData = await meNoTokenRes.json();
  console.log(`Me (No Token) Status: ${meNoTokenRes.status}`);
  console.log('Me (No Token) Response:', JSON.stringify(meNoTokenData, null, 2));
  assert.strictEqual(meNoTokenRes.status, 401, 'Profile fetch without token should be blocked by Gateway with 401');
  assert.strictEqual(meNoTokenData.error, 'Authorization header with Bearer token is required', 'Should match Gateway middleware error message');

  // Check 4: Request profile via Port 8000 with token (expect 200)
  console.log('\n--- Check 4: Request Profile with Token ---');
  const meWithTokenRes = await fetch(`${gatewayUrl}/me`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const meWithTokenData = await meWithTokenRes.json();
  console.log(`Me (With Token) Status: ${meWithTokenRes.status}`);
  console.log('Me (With Token) Response:', JSON.stringify(meWithTokenData, null, 2));
  assert.strictEqual(meWithTokenRes.status, 200, 'Profile fetch with token should succeed via Gateway');
  assert.strictEqual(meWithTokenData.email, email.toLowerCase(), 'Profile email should match registered user');

  // Check 5: Request profile via Port 8000 with invalid token (expect 401)
  console.log('\n--- Check 5: Request Profile with Invalid Token ---');
  const meInvalidTokenRes = await fetch(`${gatewayUrl}/me`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer invalid_token_here' }
  });

  const meInvalidTokenData = await meInvalidTokenRes.json();
  console.log(`Me (Invalid Token) Status: ${meInvalidTokenRes.status}`);
  console.log('Me (Invalid Token) Response:', JSON.stringify(meInvalidTokenData, null, 2));
  assert.strictEqual(meInvalidTokenRes.status, 401, 'Profile fetch with invalid token should be rejected with 401');

  console.log('\n=================================================');
  console.log('ALL API GATEWAY PROXY VERIFICATION CHECKS PASSED!');
  console.log('=================================================');
}

runTests().catch(err => {
  console.error('\n❌ Gateway Test execution failed:');
  console.error(err);
  process.exit(1);
});
