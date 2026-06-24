const Redis = require('ioredis')
const config = require('../src/config')

// Two separate Redis connections are required:
// ioredis cannot use the same connection for both subscribe and regular commands.
// subscriber: dedicated to listening on application_events channel
// cache:      dedicated to GET/SET caching operations

const subscriber = new Redis(config.redisUrl, {
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 200, 5000),
})

const cache = new Redis(config.redisUrl, {
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 200, 5000),
})

subscriber.on('connect', () => console.log('[Redis Subscriber] Connected'))
subscriber.on('error', (e) => console.error('[Redis Subscriber] Error:', e.message))
cache.on('connect', () => console.log('[Redis Cache] Connected'))
cache.on('error', (e) => console.error('[Redis Cache] Error:', e.message))

module.exports = { subscriber, cache }