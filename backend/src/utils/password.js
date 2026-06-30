const crypto = require('crypto')

const SCRYPT_KEYLEN = 64

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
  return `${salt}:${hash}`
}

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(':')) return false
  const [salt, hash] = storedHash.split(':')
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN)
  const original = Buffer.from(hash, 'hex')
  if (derived.length !== original.length) return false
  return crypto.timingSafeEqual(derived, original)
}

module.exports = {
  hashPassword,
  verifyPassword
}
