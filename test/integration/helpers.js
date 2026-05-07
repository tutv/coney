const path = require('path')
require('dotenv').config({path: path.join(__dirname, '..', '.env')})

const {createRabbitMQConnection} = require('../../dist/index')

const RABBITMQ_URI = process.env.RABBITMQ_URI || ''
const DEFAULT_PREFIX = 'coney-test'

let rabbit = null

async function checkBroker() {
    if (!RABBITMQ_URI) return false
    try {
        rabbit = createRabbitMQConnection({uri: RABBITMQ_URI})
        await rabbit.open()
        return true
    } catch (e) {
        rabbit = null
        return false
    }
}

function getRabbit() {
    if (!rabbit) throw new Error('Broker not connected — call checkBroker first')
    return rabbit
}

function uniqueName(label = 'queue') {
    return `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

async function withFreshChannel(fn) {
    if (!rabbit) return
    const conn = await rabbit.open()
    const channel = await conn.createChannel()
    channel.on('error', () => {})
    try {
        return await fn(channel)
    } finally {
        await channel.close().catch(() => {})
    }
}

async function cleanupQueue(prefix, queueName) {
    if (!rabbit) return
    await withFreshChannel(async (channel) => {
        const fullName = `${prefix}:que.${queueName}`
        const targets = [
            ['queue', fullName],
            ['queue', `${fullName}.requeue`],
            ['exchange', `${fullName}.retry`],
            ['exchange', `${fullName}.requeue`],
        ]
        for (const [kind, name] of targets) {
            try {
                if (kind === 'queue') await channel.deleteQueue(name)
                else await channel.deleteExchange(name)
            } catch (e) {
                // ignore — fresh channel each delete is overkill, but channel error
                // here means the entity didn't exist or was already gone.
                return
            }
        }
    })
}

async function closeConnection() {
    if (!rabbit) return
    const conn = rabbit.getConnection()
    if (conn && typeof conn.close === 'function') {
        await conn.close().catch(() => {})
    }
    rabbit = null
}

async function waitFor(predicate, {timeout = 5000, interval = 50} = {}) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
        if (await predicate()) return true
        await new Promise(r => setTimeout(r, interval))
    }
    throw new Error(`waitFor timed out after ${timeout}ms`)
}

module.exports = {
    checkBroker,
    getRabbit,
    uniqueName,
    cleanupQueue,
    closeConnection,
    waitFor,
    withFreshChannel,
    DEFAULT_PREFIX,
    RABBITMQ_URI,
}
