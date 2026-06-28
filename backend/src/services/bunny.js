const axios = require('axios')

const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'difuse-ai'
const API_KEY = process.env.BUNNY_API_KEY
const BASE_URL = `https://sg.storage.bunnycdn.com/${STORAGE_ZONE}`
const CDN_URL = process.env.BUNNY_CDN_URL || `https://sg.storage.bunnycdn.com/${STORAGE_ZONE}`

const uploadFile = async (fileBuffer, filename, mimeType = 'image/jpeg') => {
  const path = `uploads/${Date.now()}-${filename}`
  await axios.put(`${BASE_URL}/${path}`, fileBuffer, {
    headers: {
      AccessKey: API_KEY,
      'Content-Type': mimeType
    }
  })
  return `${CDN_URL}/${path}`
}

const uploadScreenshot = async (fileBuffer, originalName, mimeType) => {
  const path = `screenshots/${Date.now()}-${originalName}`
  await axios.put(`${BASE_URL}/${path}`, fileBuffer, {
    headers: { AccessKey: API_KEY, 'Content-Type': mimeType }
  })
  return `${CDN_URL}/${path}`
}

const uploadVoice = async (fileBuffer, filename) => {
  const path = `voice/${Date.now()}-${filename}`
  await axios.put(`${BASE_URL}/${path}`, fileBuffer, {
    headers: { AccessKey: API_KEY, 'Content-Type': 'audio/mpeg' }
  })
  return `${CDN_URL}/${path}`
}

module.exports = { uploadFile, uploadScreenshot, uploadVoice }
