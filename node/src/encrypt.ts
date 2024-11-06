import crypto from 'crypto'

interface Payload {
  iv: string;
  cr: string; // Encrypted data
}

// Generate a random 256-bit key on startup
const key = crypto.randomBytes(32)
const algorithm = 'aes-256-cbc'

export function encrypt (text: string): Payload {
  try {
    const ivBuf = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), ivBuf)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return {
      iv: ivBuf.toString('hex'),
      cr: encrypted
    }
  } catch (e) { }

  return {
    cr: '',
    iv: ''
  }
}

export function decrypt (payload: Payload) {
  try {
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), Buffer.from(payload.iv, 'hex'))
    let decrypted = decipher.update(payload.cr, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (e) { }
  return ''
}
