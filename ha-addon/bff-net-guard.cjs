'use strict'

// Garde réseau du BFF : toutes les requêtes sortantes vers une URL fournie
// (directement ou indirectement) par le navigateur passent par safeRequest().
//
// Pourquoi pas fetch() + un test sur la chaîne du hostname ?
//   - un domaine peut résoudre vers une IP interne (DNS rebinding) ;
//   - fetch() suit les redirections sans nous redonner la main ;
//   - résoudre puis appeler fetch() laisse une fenêtre TOCTOU (fetch re-résout).
// Ici la validation se fait dans le hook `lookup` du socket : l'IP vérifiée est
// exactement celle à laquelle on se connecte. Chaque redirection est un nouveau
// socket, donc revalidée.

const http = require('http')
const https = require('https')
const dns = require('dns')
const net = require('net')
const zlib = require('zlib')

class BlockedAddressError extends Error {
  constructor(message) {
    super(message)
    this.name = 'BlockedAddressError'
    this.code = 'EBLOCKED'
  }
}

class ResponseTooLargeError extends Error {
  constructor(maxBytes) {
    super(`Réponse trop volumineuse (> ${maxBytes} octets)`)
    this.name = 'ResponseTooLargeError'
    this.code = 'ETOOLARGE'
  }
}

// Une liste par famille : net.BlockList compare aussi une IPv4 aux sous-réseaux
// IPv6 via sa forme mappée (::ffff:a.b.c.d) et inversement, ce qui ferait par
// exemple bloquer toute l'IPv4 par la règle ::ffff:0:0/96.
function blockList(type, subnets) {
  const list = new net.BlockList()
  for (const [addr, prefix] of subnets) list.addSubnet(addr, prefix, type)
  return list
}

// Tout ce qui n'est pas de l'unicast public (RFC 6890 & co).
const NON_PUBLIC_V4 = blockList('ipv4', [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
])
const NON_PUBLIC_V6 = blockList('ipv6', [
  ['::', 128], ['::1', 128], ['::ffff:0:0', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48],
  ['100::', 64], ['2001::', 23], ['2001:db8::', 32], ['2002::', 16],
  ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
])
// Seul 2000::/3 est de l'unicast global IPv6.
const GLOBAL_UNICAST_V6 = blockList('ipv6', [['2000::', 3]])

// Réseau local « légitime » pour joindre une instance Ollama : RFC 1918,
// CGNAT (Tailscale & co), loopback, ULA IPv6. Le link-local (169.254/16,
// fe80::/10 — métadonnées cloud) reste exclu.
const LOCAL_V4 = blockList('ipv4', [
  ['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16], ['100.64.0.0', 10], ['127.0.0.0', 8],
])
const LOCAL_V6 = blockList('ipv6', [['::1', 128], ['fc00::', 7]])

/** Extrait l'IPv4 d'une adresse IPv4-mapped (`::ffff:10.0.0.1`), sinon null. */
function unmapIPv4(address) {
  const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)
  return m ? m[1] : null
}

/**
 * @param {string} address IP littérale
 * @param {'public'|'local'} policy
 */
function isAddressAllowed(address, policy) {
  const family = net.isIP(address)
  if (family === 0) return false
  if (policy === 'public') {
    if (family === 4) return !NON_PUBLIC_V4.check(address, 'ipv4')
    return !NON_PUBLIC_V6.check(address, 'ipv6') && GLOBAL_UNICAST_V6.check(address, 'ipv6')
  }
  if (policy === 'local') {
    const v4 = family === 4 ? address : unmapIPv4(address)
    if (v4) return LOCAL_V4.check(v4, 'ipv4')
    return LOCAL_V6.check(address, 'ipv6')
  }
  return false
}

function policyLabel(policy) {
  return policy === 'public' ? 'adresse non publique' : 'adresse hors réseau local'
}

/** Hook `lookup` pour http(s).request : résout puis valide TOUTES les IP. */
function createGuardedLookup(policy) {
  return (hostname, options, callback) => {
    const opts = typeof options === 'object' && options !== null ? options : {}
    dns.lookup(hostname, { family: opts.family, hints: opts.hints, all: true }, (err, addresses) => {
      if (err) return callback(err)
      if (!addresses.length) return callback(new BlockedAddressError(`Aucune adresse pour ${hostname}`))
      const rejected = addresses.find((a) => !isAddressAllowed(a.address, policy))
      if (rejected) {
        return callback(new BlockedAddressError(`URL non autorisée (${policyLabel(policy)})`))
      }
      if (opts.all) return callback(null, addresses)
      callback(null, addresses[0].address, addresses[0].family)
    })
  }
}

/**
 * Valide la forme d'une URL cible (protocole, IP littérale) sans réseau.
 * Les hostnames sont validés à la connexion par createGuardedLookup().
 * @returns {URL}
 */
function assertUrlAllowed(rawUrl, policy) {
  let url
  try {
    url = rawUrl instanceof URL ? rawUrl : new URL(String(rawUrl))
  } catch {
    throw new BlockedAddressError('URL invalide')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedAddressError('Protocole non supporté')
  }
  if (url.username || url.password) {
    throw new BlockedAddressError('Identifiants dans l\'URL non supportés')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  // Node ne passe pas par `lookup` pour une IP littérale : on la vérifie ici.
  if (net.isIP(host) && !isAddressAllowed(host, policy)) {
    throw new BlockedAddressError(`URL non autorisée (${policyLabel(policy)})`)
  }
  return url
}

function decompress(res) {
  const encoding = String(res.headers['content-encoding'] || '').trim().toLowerCase()
  if (encoding === 'gzip' || encoding === 'x-gzip') return res.pipe(zlib.createGunzip())
  if (encoding === 'deflate') return res.pipe(zlib.createInflate())
  if (encoding === 'br') return res.pipe(zlib.createBrotliDecompress())
  return res
}

function requestOnce(url, { method, headers, body, policy, maxBytes, deadline }) {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now()
    if (remaining <= 0) return reject(new Error('Délai dépassé'))

    const transport = url.protocol === 'https:' ? https : http
    const req = transport.request(url, {
      method,
      headers: body !== undefined ? { ...headers, 'Content-Length': Buffer.byteLength(body) } : headers,
      agent: false, // pas de socket réutilisé d'une requête précédente
      lookup: createGuardedLookup(policy),
    })

    const timer = setTimeout(() => req.destroy(new Error('Délai dépassé')), remaining)
    const fail = (err) => {
      clearTimeout(timer)
      reject(err)
    }

    req.on('error', fail)
    req.on('response', (res) => {
      const status = res.statusCode || 0
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume()
        clearTimeout(timer)
        return resolve({ status, headers: res.headers, body: Buffer.alloc(0), redirect: res.headers.location })
      }

      const stream = decompress(res)
      const chunks = []
      let size = 0
      stream.on('data', (chunk) => {
        size += chunk.length
        if (size > maxBytes) {
          req.destroy()
          stream.destroy()
          fail(new ResponseTooLargeError(maxBytes))
          return
        }
        chunks.push(chunk)
      })
      stream.on('error', fail)
      stream.on('end', () => {
        clearTimeout(timer)
        resolve({ status, headers: res.headers, body: Buffer.concat(chunks), redirect: null })
      })
    })

    if (body !== undefined) req.write(body)
    req.end()
  })
}

/**
 * Requête HTTP(S) sortante protégée contre le SSRF.
 *
 * @param {string|URL} rawUrl
 * @param {object} [options]
 * @param {'public'|'local'} [options.policy='public'] plages d'IP autorisées
 * @param {string} [options.method='GET']
 * @param {Record<string,string>} [options.headers]
 * @param {string|Buffer} [options.body]
 * @param {number} [options.timeoutMs=10000] délai global (redirections comprises)
 * @param {number} [options.maxBytes=5242880] taille max du corps décompressé
 * @param {number} [options.maxRedirects=5]
 * @returns {Promise<{ status: number, headers: object, body: Buffer, url: string }>}
 */
async function safeRequest(rawUrl, options = {}) {
  const {
    policy = 'public',
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 10000,
    maxBytes = 5 * 1024 * 1024,
    maxRedirects = 5,
  } = options
  const deadline = Date.now() + timeoutMs
  let url = assertUrlAllowed(rawUrl, policy)
  let currentMethod = method
  let currentBody = body

  for (let hop = 0; ; hop += 1) {
    const res = await requestOnce(url, {
      method: currentMethod,
      headers: { Accept: '*/*', 'Accept-Encoding': 'gzip, deflate, br', ...headers },
      body: currentBody,
      policy,
      maxBytes,
      deadline,
    })
    if (!res.redirect) return { status: res.status, headers: res.headers, body: res.body, url: url.toString() }
    if (hop >= maxRedirects) throw new Error('Trop de redirections')
    url = assertUrlAllowed(new URL(res.redirect, url), policy)
    if (res.status === 303 || ((res.status === 301 || res.status === 302) && currentMethod === 'POST')) {
      currentMethod = 'GET'
      currentBody = undefined
    }
  }
}

module.exports = {
  BlockedAddressError,
  ResponseTooLargeError,
  isAddressAllowed,
  assertUrlAllowed,
  createGuardedLookup,
  safeRequest,
}
