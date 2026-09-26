// Testes de integração da API com o test runner nativo do Node (sem dependências extra).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/server');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

test('GET /health devolve UP', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'UP');
});

test('cabeçalhos de segurança aplicados pelo Helmet', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const csp = response.headers.get('content-security-policy');
  assert.ok(csp.includes("script-src 'self'"));
  assert.ok(!csp.includes("script-src 'self' 'unsafe-inline'"));
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
});

test('CORS não autoriza origens externas por omissão', async () => {
  const response = await fetch(`${baseUrl}/api/v1/team`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('rate limiting anuncia os limites (RFC draft-7)', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.ok(response.headers.get('ratelimit'));
});

test('API da equipa devolve dados', async () => {
  const response = await fetch(`${baseUrl}/api/v1/team`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(body.count > 0);
});

test('o dashboard é servido a partir de public/', async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<html/i);
});

test('ficheiros do projeto não são expostos por HTTP', async () => {
  for (const file of ['/package.json', '/src/server.js', '/node_modules/express/package.json', '/.gitleaks.toml']) {
    const response = await fetch(`${baseUrl}${file}`);
    assert.equal(response.status, 404, `${file} não devia estar acessível`);
  }
});
