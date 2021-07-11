require('dotenv').config({
    path: require('path').join(__dirname, '.env')
})

const rabbit = require('./connections/rabbit')
const {Coney} = require('../dist/index')

const _run = async () => {
    const coney = new Coney(rabbit)

    await coney.handleJob('test', {noAck: true}, async (msg) => {
        console.log("MSG", msg)
    })

    setInterval(async () => {
        await coney.addJob('test', {hello: 'world'})
        console.log("ADDED")
    }, 1000)


}

setImmediate(async () => {
    try {
        await _run()
    } catch (error) {
        console.log("ERROR", error)
    }
})

