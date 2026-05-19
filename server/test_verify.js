const http = require('http');
function post(path, body) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: '127.0.0.1', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.write(JSON.stringify(body)); req.end();
  });
}
function get(path, token) {
  return new Promise((resolve) => {
    http.get({ hostname: '127.0.0.1', port: 3000, path, headers: { Authorization: 'Bearer ' + token } }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
  });
}
(async () => {
  const login = await post('/api/login', { username: 'dr_house', password: 'password123' });
  const t = login.token;
  console.log('Login:', login.auth ? 'OK' : 'FAIL');

  const v1 = await get('/api/verify/1', t);
  console.log('Visit 1 (tampered):', v1.status, v1.message);
  const v2 = await get('/api/verify/2', t);
  console.log('Visit 2 (tampered):', v2.status, v2.message);
  const v3 = await get('/api/verify/3', t);
  console.log('Visit 3 (clean)  :', v3.status, v3.message);
  const v4 = await get('/api/verify/4', t);
  console.log('Visit 4 (clean)  :', v4.status, v4.message);

  const bc = await get('/api/blockchain/status', t);
  console.log('Blockchain length:', bc.length);
  console.log('Chain valid      :', bc.isValid);
})();
