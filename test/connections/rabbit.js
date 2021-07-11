const {createRabbitMQConnection} = require('../../dist/index')

const RABBITMQ_URI = process.env.RABBITMQ_URI || ''
const rabbit = createRabbitMQConnection({
    uri: RABBITMQ_URI
})

module.exports = rabbit

