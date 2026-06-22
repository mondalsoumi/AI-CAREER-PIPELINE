const assert = require('assert');

async function runTests() {
  const baseUrl = 'http://localhost:8001/auth';
  const email = `test-${Date.now()}@example.com`;
  const password = 'CorrectPassword123';
  const wrongPassword = 'WrongPassword999';
  const name = 'Test User';

  console.log(`Starting Auth Service Verification with email: ${email}`);

  // 1. Register the user
  console.log('\n--- 1. Testing Registration ---');
  const registerRes = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  
  const registerData = await registerRes.json();
  console.log(`Registration Status: ${registerRes.status}`);
  console.log('Registration Response:', JSON.stringify(registerData, null, 2));
  assert.strictEqual(registerRes.status, 201, 'Registration should succeed with status 201');
  assert.ok(registerData.token, 'Registration should return a token');
  assert.ok(registerData.user, 'Registration should return user details');
  assert.strictEqual(registerData.user.email, email.toLowerCase(), 'Email should match');

  // 2. Login with wrong password
  console.log('\n--- 2. Testing Login with WRONG Password ---');
  const loginWrongRes = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: wrongPassword })
  });

  const loginWrongData = await loginWrongRes.json();
  console.log(`Login Wrong PW Status: ${loginWrongRes.status}`);
  console.log('Login Wrong PW Response:', JSON.stringify(loginWrongData, null, 2));
  assert.strictEqual(loginWrongRes.status, 401, 'Login with wrong password should fail with status 401');
  assert.strictEqual(loginWrongData.error, 'Invalid email or password', 'Should return invalid password message');

  // 3. Login with correct password
  console.log('\n--- 3. Testing Login with CORRECT Password ---');
  const loginCorrectRes = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const loginCorrectData = await loginCorrectRes.json();
  console.log(`Login Correct PW Status: ${loginCorrectRes.status}`);
  console.log('Login Correct PW Response:', JSON.stringify(loginCorrectData, null, 2));
  assert.strictEqual(loginCorrectRes.status, 200, 'Login with correct password should succeed with status 200');
  assert.ok(loginCorrectData.token, 'Login should return token');

  // 4. Access protected profile route with token
  console.log('\n--- 4. Testing Profile Fetch with Token ---');
  const token = loginCorrectData.token;
  const meRes = await fetch(`${baseUrl}/me`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const meData = await meRes.json();
  console.log(`Profile Fetch Status: ${meRes.status}`);
  console.log('Profile Fetch Response:', JSON.stringify(meData, null, 2));
  assert.strictEqual(meRes.status, 200, 'Profile fetch should succeed with status 200');
  assert.strictEqual(meData.email, email.toLowerCase(), 'Profile email should match');

  console.log('\n======================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY!');
  console.log('Wrong password rejection is CONFIRMED.');
  console.log('======================================');
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed:');
  console.error(err);
  process.exit(1);
});
