import {connect} from 'amqplib'
import {ConnectionBuilder} from '../classes/ConnectionBuilder'


interface RabbitMQOptions {
    uri: string
}


export const createRabbitMQConnection = (opts: RabbitMQOptions): ConnectionBuilder => {
    const {uri} = opts
    const connection = connect(uri)

    return new ConnectionBuilder(connection)
}

