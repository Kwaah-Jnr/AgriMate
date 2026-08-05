const BASE_URL = 'http://localhost:5000';

async function testRegister() {
  const payload = {
    fullName: 'Diagnostic Transporter',
    username: 'diag_transporter_' + Date.now(),
    email: 'diag_transporter_' + Date.now() + '@test.com',
    phoneNumber: '024' + Math.floor(1000000 + Math.random() * 9000000),
    region: 'Greater Accra',
    password: 'password123',
    role: 'transporter',
    vehicleNumber: 'GT-999-26'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('Status Code:', response.status);
    console.log('Response Body:', data);
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

testRegister();
