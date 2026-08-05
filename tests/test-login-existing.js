const BASE_URL = 'http://localhost:5000';

async function testLoginExisting() {
  const loginPayload = {
    emailOrUsername: 'transporter_1782950689622@test.com',
    password: 'password123'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload)
    });

    const data = await response.json();
    console.log('Status Code:', response.status);
    console.log('Response Body:', data);
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

testLoginExisting();
