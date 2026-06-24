const { subscriber } = require('../../utils/redis')
const { computeAndStore } = require('./calculator')

const CHANNEL = 'application_events'

async function startSubscriber() {
    // ioredis auto-connects — no .connect() call needed
    await subscriber.subscribe(CHANNEL)

    subscriber.on('message', async (channel, message) => {
        if (channel !== CHANNEL) return

        let event
        try {
            event = JSON.parse(message)
        } catch (err) {
            console.error('[Subscriber] Failed to parse message:', err.message)
            return
        }

        if (event.type !== 'application.status.changed') return

        if (!event.payload?.userId) {
            console.warn('[Subscriber] Event missing userId:', event)
            return
        }

        console.log(`[Subscriber] Received ${event.type} for user ${event.payload.userId}`)

        try {
            await computeAndStore(event.payload.userId)
        } catch (err) {
            console.error(`[Subscriber] Compute failed for ${event.payload.userId}:`, err.message)
        }
    })

    console.log(`[Subscriber] Listening on channel: ${CHANNEL}`)
}

module.exports = { startSubscriber }