require('dotenv').config({
    path: require('path').join(__dirname, '.env')
})

const rabbit = require('./connections/rabbit')
const {Coney} = require('../dist/index')

const _run = async () => {
    const coney = new Coney(rabbit)

    await coney.consume('test', {
        maxRetries: 3
    }, async (msg) => {
        console.log("MSG", msg.body)
        console.log("RETRIES", msg.retries)
        throw new Error('Hello error')
    })

    // setInterval(async () => {
    await coney.sendToQueue('test', {hello: 'world', time: Date.now()})
    console.log("ADDED")
    // }, 1000)


}

setImmediate(async () => {
    try {
        await _run()
    } catch (error) {
        console.log("ERROR", error)
    }
})

