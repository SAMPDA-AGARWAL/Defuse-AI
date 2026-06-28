const sendPushNotification = async (pushSubscription, title, body, data = {}) => {
  // Placeholder — integrate web-push library for production
  console.log('📱 Push:', { title, body, data })
  return true
}

const sendWhatsAppMessage = async (phoneNumber, message) => {
  if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID.startsWith('YOUR')) {
    console.log('📲 WhatsApp (no Twilio):', { phoneNumber, message })
    return
  }
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  await twilio.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: `whatsapp:${phoneNumber}`,
    body: message
  })
}

module.exports = { sendPushNotification, sendWhatsAppMessage }
