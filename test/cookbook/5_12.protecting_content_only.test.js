const test = require('ava')

const recipe = require('./recipes').get('5.12')
const { enc: verifiers } = require('./verifiers')

const { JWE, JWK: { importKey, generateSync }, JWKS: { KeyStore }, errors: { JWEDecryptionFailed } } = require('../..')

const {
  input: { plaintext, key: jwk },
  encrypting_content: { unprotected }
} = recipe

const key = importKey(jwk)

const keystoreMatchOne = new KeyStore(generateSync(key.kty, key.length, { alg: key.alg, use: key.use }), key)
const keystoreMatchMore = new KeyStore(generateSync(key.kty, key.length, { alg: key.alg, use: key.use, kid: key.kid }), key, importKey(key))
const keystoreMatchNone = new KeyStore(generateSync(key.kty), generateSync(key.kty))

test(`${recipe.title} - flattened encrypt`, t => {
  const res = JWE.encrypt.flattened(plaintext, key, undefined, unprotected)
  verifiers.flattened(t, res, recipe.output.json_flat)
  t.deepEqual(JWE.decrypt(res, key), Buffer.from(plaintext))
})

test(`${recipe.title} - general encrypt`, t => {
  const res = JWE.encrypt.general(plaintext, key, undefined, unprotected)
  verifiers.general(t, res, recipe.output.json)
  t.deepEqual(JWE.decrypt(res, key), Buffer.from(plaintext))
})

test(`${recipe.title} - flattened decrypt`, t => {
  t.deepEqual(JWE.decrypt(recipe.output.json_flat, key), Buffer.from(plaintext))
})

test(`${recipe.title} - general decrypt`, t => {
  t.deepEqual(JWE.decrypt(recipe.output.json, key), Buffer.from(plaintext))
})

;[keystoreMatchOne, keystoreMatchMore].forEach((keystore, i) => {
  test(`${recipe.title} - flattened decrypt (using keystore ${i + 1}/2)`, t => {
    t.deepEqual(JWE.decrypt(recipe.output.json_flat, keystore), Buffer.from(plaintext))
  })

  test(`${recipe.title} - general decrypt (using keystore ${i + 1}/2)`, t => {
    t.deepEqual(JWE.decrypt(recipe.output.json, keystore), Buffer.from(plaintext))
  })
})

test(`${recipe.title} - flattened verify (failing)`, t => {
  t.throws(() => {
    JWE.decrypt(recipe.output.json_flat, keystoreMatchNone)
  }, { instanceOf: JWEDecryptionFailed, code: 'ERR_JWE_DECRYPTION_FAILED' })
})

test(`${recipe.title} - general verify (failing)`, t => {
  t.throws(() => {
    JWE.decrypt(recipe.output.json, keystoreMatchNone)
  }, { instanceOf: JWEDecryptionFailed, code: 'ERR_JWE_DECRYPTION_FAILED' })
})