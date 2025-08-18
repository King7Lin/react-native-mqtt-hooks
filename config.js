export const config = {
    host: '',
    port: 8883,
    clientId: `id_${Math.random().toString(36).substring(2, 10)}`,
    username: 'username',
    password: 'password',
    keepalive: 60,
    protocol: 'wss',
    protocolVersion: 4,
    transport: 'websocket',
    wsOptions: {
        rejectUnauthorized: false,
    },
    clean: true,
    maxReconnectAttempts: 5,
    initialReconnectDelay: 1000,
    
}
export const persistentConfig = {
    host: '',
    port: 8883,
    clientId: `id`,
    username: 'username',
    password: 'password',
    keepalive: 60,
    protocol: 'wss',
    protocolVersion: 4,
    transport: 'websocket',
    wsOptions: {
        rejectUnauthorized: false,
    },
    clean: false,
    maxReconnectAttempts: 5, //最大重连次数
    initialReconnectDelay: 1000, //重连延迟
}