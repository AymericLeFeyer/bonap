'use strict'

// node --test ha-addon/bff-net-guard.test.cjs
const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const zlib = require('node:zlib')
const {
  isAddressAllowed,
  assertUrlAllowed,
  safeRequest,
  BlockedAddressError,
  ResponseTooLargeError,
} = require('./bff-net-guard.cjs')

describe('isAddressAllowed — policy public', () => {
  const blocked = [
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:127.0.0.1',
    '::ffff:169.254.169.254', '64:ff9b::a9fe:a9fe', '2002:a9fe:a9fe::1', 'ff02::1',
  ]
  for (const ip of blocked) {
    test(`bloque ${ip}`, () => assert.equal(isAddressAllowed(ip, 'public'), false))
  }
  for (const ip of ['1.1.1.1', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111']) {
    test(`autorise ${ip}`, () => assert.equal(isAddressAllowed(ip, 'public'), true))
  }
  test('refuse une chaîne non IP', () => assert.equal(isAddressAllowed('example.com', 'public'), false))
})

describe('isAddressAllowed — policy local (Ollama)', () => {
  for (const ip of ['192.168.1.10', '10.0.0.5', '172.20.0.2', '100.100.1.1', '127.0.0.1', '::1', 'fd00::5', '::ffff:192.168.1.10']) {
    test(`autorise ${ip}`, () => assert.equal(isAddressAllowed(ip, 'local'), true))
  }
  for (const ip of ['169.254.169.254', 'fe80::1', '::ffff:169.254.169.254', '8.8.8.8', '2606:4700::1']) {
    test(`bloque ${ip}`, () => assert.equal(isAddressAllowed(ip, 'local'), false))
  }
})

describe('assertUrlAllowed', () => {
  test('refuse les protocoles non http(s)', () => {
    assert.throws(() => assertUrlAllowed('file:///etc/passwd', 'public'), BlockedAddressError)
    assert.throws(() => assertUrlAllowed('gopher://1.1.1.1/', 'public'), BlockedAddressError)
  })
  test('refuse les IP littérales internes, y compris encodées', () => {
    for (const url of [
      'http://169.254.169.254/latest/meta-data/',
      'http://127.1/',
      'http://2130706433/',
      'http://0x7f000001/',
      'http://[::1]:11434/',
      'http://[::ffff:7f00:1]/',
    ]) {
      assert.throws(() => assertUrlAllowed(url, 'public'), BlockedAddressError, url)
    }
  })
  test('refuse les identifiants dans l’URL', () => {
    assert.throws(() => assertUrlAllowed('http://user:pass@1.1.1.1/', 'public'), BlockedAddressError)
  })
  test('laisse passer un hostname (validé à la connexion)', () => {
    assert.equal(assertUrlAllowed('https://www.marmiton.org/x', 'public').hostname, 'www.marmiton.org')
  })
})

describe('safeRequest', () => {
  let server
  let base
  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/redirect-metadata') {
        res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' })
        return res.end()
      }
      if (req.url === '/redirect-self') {
        res.writeHead(302, { location: '/ok' })
        return res.end()
      }
      if (req.url === '/big') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        return res.end(Buffer.alloc(2048, 'a'))
      }
      if (req.url === '/gzip') {
        res.writeHead(200, { 'content-type': 'text/plain', 'content-encoding': 'gzip' })
        return res.end(zlib.gzipSync('compressé'))
      }
      if (req.url === '/echo') {
        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', () => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ method: req.method, body }))
        })
        return
      }
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('ok')
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${server.address().port}`
  })
  after(() => server.close())

  test('policy public : refuse localhost résolu par DNS (anti-rebinding)', async () => {
    const port = server.address().port
    await assert.rejects(safeRequest(`http://localhost:${port}/ok`, { policy: 'public' }), BlockedAddressError)
  })

  test('policy public : refuse une IP littérale interne', async () => {
    await assert.rejects(safeRequest(`${base}/ok`, { policy: 'public' }), BlockedAddressError)
  })

  test('policy local : joint le réseau local', async () => {
    const res = await safeRequest(`${base}/ok`, { policy: 'local' })
    assert.equal(res.status, 200)
    assert.equal(res.body.toString(), 'ok')
  })

  test('policy local : un hostname résolu en local passe par le lookup', async () => {
    const port = server.address().port
    const res = await safeRequest(`http://localhost:${port}/ok`, { policy: 'local' })
    assert.equal(res.body.toString(), 'ok')
  })

  test('revalide chaque redirection', async () => {
    await assert.rejects(safeRequest(`${base}/redirect-metadata`, { policy: 'local' }), BlockedAddressError)
    const res = await safeRequest(`${base}/redirect-self`, { policy: 'local' })
    assert.equal(res.body.toString(), 'ok')
  })

  test('maxRedirects: 0 refuse de suivre', async () => {
    await assert.rejects(safeRequest(`${base}/redirect-self`, { policy: 'local', maxRedirects: 0 }), /redirections/)
  })

  test('borne la taille de la réponse', async () => {
    await assert.rejects(safeRequest(`${base}/big`, { policy: 'local', maxBytes: 1024 }), ResponseTooLargeError)
  })

  test('décompresse gzip', async () => {
    const res = await safeRequest(`${base}/gzip`, { policy: 'local' })
    assert.equal(res.body.toString('utf8'), 'compressé')
  })

  test('envoie méthode et corps', async () => {
    const res = await safeRequest(`${base}/echo`, { policy: 'local', method: 'POST', body: '{"a":1}' })
    assert.deepEqual(JSON.parse(res.body.toString()), { method: 'POST', body: '{"a":1}' })
  })
})

describe('bff-settings', () => {
  const { validateSettingsPatch, sanitizeSettings } = require('./bff-settings.cjs')

  test('accepte une clé connue', () => {
    assert.deepEqual(validateSettingsPatch({ bonap_theme: 'dark' }), { ok: true, patch: { bonap_theme: 'dark' } })
  })
  test('refuse une clé inconnue, une valeur non string ou trop longue', () => {
    assert.equal(validateSettingsPatch({ evil: 'x' }).ok, false)
    assert.equal(validateSettingsPatch({ bonap_theme: { a: 1 } }).ok, false)
    assert.equal(validateSettingsPatch({ bonap_theme: 'x'.repeat(17 * 1024) }).ok, false)
    assert.equal(validateSettingsPatch(['bonap_theme']).ok, false)
    assert.equal(validateSettingsPatch(JSON.parse('{"__proto__":"x"}')).ok, false)
  })
  test('retire la clé API de bonap_llm_config', () => {
    const value = JSON.stringify({ provider: 'openai', apiKey: 'sk-secret', model: 'gpt-4o' })
    const result = validateSettingsPatch({ bonap_llm_config: value })
    assert.equal(result.ok, true)
    assert.deepEqual(JSON.parse(result.patch.bonap_llm_config), { provider: 'openai', model: 'gpt-4o' })
  })
  test('purge un fichier existant', () => {
    const cleaned = sanitizeSettings({
      bonap_llm_config: JSON.stringify({ provider: 'google', apiKey: 'AIza' }),
      bonap_theme: 'light',
      injected: '<script>',
    })
    assert.deepEqual(cleaned, { bonap_llm_config: '{"provider":"google"}', bonap_theme: 'light' })
  })
})
