const BASE_URL = 'http://localhost:5000';

async function testLogin() {
  // Let's first register a transporter
  const email = 'login_test_transporter_' + Date.now() + '@test.com';
  const payload = {
    fullName: 'Diagnostic Transporter',
    username: 'login_transporter_' + Date.now(),
    email: email,
    phoneNumber: '024' + Math.floor(1000000 + Math.random() * 9000000),
    region: 'Greater Accra',
    password: 'password123',
    role: 'transporter',
    vehicleNumber: 'GT-999-26'
  };

  try {
    const regResponse = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const regData = await regResponse.json();
    console.log('Reg Status:', regResponse.status);

    // Now log in using the email
    const loginPayload = {
      emailOrUsername: email,
      password: 'password123'
    };

    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload)
    });

    const loginData = await loginResponse.json();
    console.log('Login Status:', loginResponse.status);
    console.log('Login Body:', loginData);
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

testLogin();
