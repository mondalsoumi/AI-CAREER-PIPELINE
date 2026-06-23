const Redis = require('ioredis')
const config = require('../config')

let publisher = null

const getPublisher = () => {
  if (!publisher) {
    publisher = new Redis(config.redisUrl, {
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    })

    publisher.on('connect', () => console.log('[Redis Publisher] Connected'))
    publisher.on('error', (err) => console.error('[Redis Publisher] Error:', err.message))
  }
  return publisher
}

// Event channel - Analytics Service subscribes to this
const CHANNEL = 'application_events'

const publishEvent = async (eventType, payload) => {
  try {
    const client = getPublisher()
    const message = JSON.stringify({
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    })
    await client.publish(CHANNEL, message)
    console.log(`[Redis Publisher] Event published: ${eventType}`)
  } catch (err) {
    // Log but never crash the service over a failed event publish
    console.error(`[Redis Publisher] Failed to publish ${eventType}:`, err.message)
  }
}

module.exports = { publishEvent }
