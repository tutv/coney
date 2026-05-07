const {describe, it, before, after} = require('node:test')
const assert = require('node:assert')

const {Coney} = require('../../dist/index')
const {
    checkBroker,
    getRabbit,
    uniqueName,
    cleanupQueue,
    closeConnection,
    waitFor,
    withFreshChannel,
    DEFAULT_PREFIX,
} = require('./helpers')

describe('Coney integration', () => {
    let brokerAvailable = false

    before(async () => {
        brokerAvailable = await checkBroker()
        if (!brokerAvailable) {
            console.warn('[integration] RABBITMQ_URI missing or broker unreachable — skipping')
        }
    })

    after(async () => {
        await closeConnection()
    })

    const skipIfNoBroker = (t) => {
        if (!brokerAvailable) {
            t.skip('Broker not available')
            return true
        }
        return false
    }

    it('opens a connection via createRabbitMQConnection', async (t) => {
        if (skipIfNoBroker(t)) return
        const conn = getRabbit().getConnection()
        assert.ok(conn, 'connection should be set after open()')
        assert.strictEqual(typeof conn.createChannel, 'function')
    })

    it('default prefix is "coney" when none is provided', async (t) => {
        if (skipIfNoBroker(t)) return
        const queueName = uniqueName('defprefix')
        t.after(() => cleanupQueue('coney', queueName))

        const coney = new Coney(getRabbit())
        assert.strictEqual(coney.prefix, 'coney')
        await coney.sendToQueue(queueName, {})

        await withFreshChannel(async (ch) => {
            const stats = await ch.checkQueue(`coney:que.${queueName}`)
            assert.strictEqual(stats.messageCount, 1)
        })
    })

    it('uses a custom prefix in the resolved queue name', async (t) => {
        if (skipIfNoBroker(t)) return
        const customPrefix = 'custom-prefix'
        const queueName = uniqueName('prefixed')
        t.after(() => cleanupQueue(customPrefix, queueName))

        const coney = new Coney(getRabbit(), customPrefix)
        await coney.sendToQueue(queueName, {})

        await withFreshChannel(async (ch) => {
            const stats = await ch.checkQueue(`${customPrefix}:que.${queueName}`)
            assert.strictEqual(stats.messageCount, 1)
        })
    })

    it('sendToQueue persists a message that getQueue can count', async (t) => {
        if (skipIfNoBroker(t)) return
        const queueName = uniqueName('send')
        t.after(() => cleanupQueue(DEFAULT_PREFIX, queueName))

        const coney = new Coney(getRabbit(), DEFAULT_PREFIX)
        await coney.sendToQueue(queueName, {hello: 'world'})
        await coney.sendToQueue(queueName, {hello: 'again'})

        const stats = await coney.getQueue(queueName)
        assert.strictEqual(stats.messageCount, 2)
        assert.strictEqual(stats.consumerCount, 0)
        assert.strictEqual(stats.queue, `${DEFAULT_PREFIX}:que.${queueName}`)
    })

    it('sendToQueue with TTL expires the message', async (t) => {
        if (skipIfNoBroker(t)) return
        const queueName = uniqueName('ttl')
        t.after(() => cleanupQueue(DEFAULT_PREFIX, queueName))

        const coney = new Coney(getRabbit(), DEFAULT_PREFIX)
        await coney.sendToQueue(queueName, {payload: 'expires'}, {ttl: 200})

        const before = await coney.getQueue(queueName)
        assert.strictEqual(before.messageCount, 1)

        await waitFor(async () => {
            const s = await coney.getQueue(queueName)
            return s.messageCount === 0
        }, {timeout: 3000})
    })

    it('consume receives the published payload and reports retries=0', async (t) => {
        if (skipIfNoBroker(t)) return
        const queueName = uniqueName('consume')
        t.after(() => cleanupQueue(DEFAULT_PREFIX, queueName))

        const coney = new Coney(getRabbit(), DEFAULT_PREFIX)
        const received = []

        await coney.consume(queueName, {maxRetries: 0}, async (msg) => {
            received.push({body: msg.body, retries: msg.retries})
        })

        await coney.sendToQueue(queueName, {n: 42, txt: 'ok'})

        await waitFor(() => received.length >= 1, {timeout: 5000})
        assert.deepStrictEqual(received[0].body, {n: 42, txt: 'ok'})
        assert.strictEqual(received[0].retries, 0)
    })

    it('round-trips complex JSON payloads through send → consume', async (t) => {
        if (skipIfNoBroker(t)) return
        const queueName = uniqueName('serial')
        t.after(() => cleanupQueue(DEFAULT_PREFIX, queueName))

        const coney = new Coney(getRabbit(), DEFAULT_PREFIX)
        const received = []
        const payload = {
            str: 'hello',
            num: 12.5,
            bool: true,
            nullVal: null,
            arr: [1, 2, 3],
            nested: {a: {b: {c: 'deep'}}},
        }

        await coney.consume(queueName, {maxRetries: 0}, async (msg) => {
            received.push(msg.body)
        })
        await coney.sendToQueue(queueName, payload)

        await waitFor(() => received.length >= 1, {timeout: 5000})
        assert.deepStrictEqual(received[0], payload)
    })

    it('retries on error using a custom calculateDelay', async (t) => {
        if (skipIfNoBroker(t)) return
        const queueName = uniqueName('retry')
        t.after(() => cleanupQueue(DEFAULT_PREFIX, queueName))

        const coney = new Coney(getRabbit(), DEFAULT_PREFIX)
        const attempts = []
        const delayCalls = []

        await coney.consume(queueName, {
            maxRetries: 2,
            calculateDelay: (retries) => {
                delayCalls.push(retries)
                return 100
            },
        }, async (msg) => {
            attempts.push(msg.retries)
            if (msg.retries < 2) throw new Error('please retry')
        })

        await coney.sendToQueue(queueName, {ping: true})

        await waitFor(() => attempts.length >= 3, {timeout: 8000})
        assert.deepStrictEqual(attempts, [0, 1, 2], 'handler should run 3 times with increasing retry counts')
        assert.deepStrictEqual(delayCalls, [1, 2], 'calculateDelay should be invoked with the next retry count')
    })

    it('drops the message after maxRetries is exceeded', async (t) => {
        if (skipIfNoBroker(t)) return
        const queueName = uniqueName('maxretry')
        t.after(() => cleanupQueue(DEFAULT_PREFIX, queueName))

        const origErr = console.error
        console.error = () => {}
        t.after(() => { console.error = origErr })

        const coney = new Coney(getRabbit(), DEFAULT_PREFIX)
        const attempts = []

        await coney.consume(queueName, {
            maxRetries: 1,
            calculateDelay: () => 50,
        }, async (msg) => {
            attempts.push(msg.retries)
            throw new Error('always fails')
        })

        await coney.sendToQueue(queueName, {boom: true})

        await waitFor(() => attempts.length >= 2, {timeout: 5000})
        await new Promise(r => setTimeout(r, 400))
        assert.deepStrictEqual(attempts, [0, 1], 'handler should run exactly maxRetries+1 times')

        const stats = await coney.getQueue(queueName)
        assert.strictEqual(stats.messageCount, 0, 'queue should be drained after drop')
    })

    it('handler that succeeds without throwing keeps the queue empty', async (t) => {
        if (skipIfNoBroker(t)) return
        const queueName = uniqueName('ack')
        t.after(() => cleanupQueue(DEFAULT_PREFIX, queueName))

        const coney = new Coney(getRabbit(), DEFAULT_PREFIX)
        const seen = []
        await coney.consume(queueName, {maxRetries: 0}, async (msg) => {
            seen.push(msg.body)
        })

        await coney.sendToQueue(queueName, {i: 1})
        await coney.sendToQueue(queueName, {i: 2})
        await coney.sendToQueue(queueName, {i: 3})

        await waitFor(() => seen.length >= 3, {timeout: 5000})
        await new Promise(r => setTimeout(r, 200))

        const stats = await coney.getQueue(queueName)
        assert.strictEqual(stats.messageCount, 0)
        assert.deepStrictEqual(seen.map(x => x.i).sort(), [1, 2, 3])
    })
})
