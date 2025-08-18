# Custom MQTT Hooks for React

一个基于React Hooks的MQTT客户端库，提供简单易用的API来连接、发布和订阅MQTT消息。支持自动重连、消息处理和全局状态管理。

## 特性

- 使用React Hooks API
- 支持连接、断开、发布、订阅、取消订阅功能
- 自动重连机制
- 全局消息状态管理
- 配置灵活，支持多种MQTT连接选项
- 提供MQTTProvider和useMQTTContext进行全局状态管理

## 安装

1. 将此文件夹复制到你的项目中

2. 修改你的package.json文件，添加本地依赖：
   ```json
   "dependencies": {
     "custom-mqtt": "file:./custom-mqtt"
   }
   ```

3. 安装依赖
   ```bash
   npm install
   # 或
   yarn install
   ```

4. 安装mqtt依赖
   ```bash
   npm install mqtt
   # 或
   yarn add mqtt
   ```

## 使用示例

### 基础使用

```jsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput } from 'react-native';
import { useMqttService } from 'custom-mqtt';

const MqttDemoScreen = () => {
  const [topic, setTopic] = useState('test/topic');
  const [message, setMessage] = useState('Hello MQTT!');
  const [receivedMessages, setReceivedMessages] = useState([]);

  // 使用MQTT服务
  const { connect, disconnect, publish, isConnected } = useMqttService({
    host: 'your-mqtt-host',
    port: 8443,
    username: 'your-username',
    password: 'your-password',
    clientId: 'unique-client-id'
  });

  // 连接MQTT服务器
  useEffect(() => {
    connect((status, error) => {
      if (status === 'connectSuccess') {
        console.log('MQTT连接成功');
      } else {
        console.error('MQTT连接失败:', status, error);
      }
    });

    return () => {
      disconnect();
    };
  }, []);

  // 处理接收到的消息
  const handleMessage = (receivedTopic, receivedMessage) => {
    setReceivedMessages(prev => [...prev, { topic: receivedTopic, message: receivedMessage }]);
  };

  // 订阅主题
  useEffect(() => {
    if (isConnected) {
      // subscribe方法需要通过useMqttService返回
      // 这里为了简化示例，假设subscribe方法可用
      // 实际使用中，subscribe方法在useMqttService中通过setMessageCallbacks设置回调
    }
  }, [isConnected]);

  // 发布消息
  const handlePublish = async () => {
    try {
      await publish(topic, message, 1);
      alert('消息发布成功');
    } catch (error) {
      alert('消息发布失败: ' + error.message);
    }
  };

  return (
    <View>
      <Text>连接状态: {isConnected ? '已连接' : '未连接'}</Text>
      
      <TextInput
        placeholder="输入主题"
        value={topic}
        onChangeText={setTopic}
      />

      <TextInput
        placeholder="输入消息"
        value={message}
        onChangeText={setMessage}
      />

      <Button title="发布消息" onPress={handlePublish} />

      <Text>接收到的消息:</Text>
      {receivedMessages.map((msg, index) => (
        <View key={index}>
          <Text>主题: {msg.topic}</Text>
          <Text>消息: {msg.message}</Text>
        </View>
      ))}
    </View>
  );
};

export default MqttDemoScreen;
```

### 使用MQTTProvider和useMQTTContext

```jsx
import React from 'react';
import { MQTTProvider } from 'custom-mqtt';
import MqttDemoScreen from './MqttDemoScreen';

const App = () => {
  const mqttConfig = {
    host: 'your-mqtt-host',
    port: 8443,
    username: 'your-username',
    password: 'your-password',
    clientId: 'unique-client-id'
  };

  return (
    <MQTTProvider config={mqttConfig}>
      <MqttDemoScreen />
    </MQTTProvider>
  );
};

export default App;
```

在组件中使用useMQTTContext：

```jsx
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useMQTTContext } from 'custom-mqtt';

const MqttComponent = () => {
  const { 
    connect, 
    disconnect, 
    globalMessages, 
    doSubscribe, 
    handlePushMessage, 
    isConnected 
  } = useMQTTContext();

  useEffect(() => {
    connect((status, error) => {
      if (status === 'connectSuccess') {
        console.log('MQTT连接成功');
        // 连接成功后订阅主题
        doSubscribe('test/topic', 1);
      } else {
        console.error('MQTT连接失败:', status, error);
      }
    });

    return () => {
      disconnect();
    };
  }, []);

  const sendMessage = async () => {
    try {
      await handlePushMessage('test/topic', 'Hello from MQTT!', 'jaylin', 1);
      console.log('消息发送成功');
    } catch (error) {
      console.error('消息发送失败:', error);
    }
  };

  return (
    <View>
      <Text>连接状态: {isConnected ? '已连接' : '未连接'}</Text>
      <Text>接收到的消息:</Text>
      {globalMessages.map((msg, index) => (
        <View key={index}>
          <Text>主题: {msg.topic}</Text>
          <Text>消息: {JSON.stringify(msg.message)}</Text>
        </View>
      ))}
    </View>
  );
};

export default MqttComponent;
```

## API参考

### useMqttService(config)

创建MQTT服务实例。

**参数:**
- `config` (Object): MQTT连接配置
  - `host` (string): MQTT服务器地址
  - `port` (number): MQTT服务器端口
  - `username` (string): 用户名
  - `password` (string): 密码
  - `clientId` (string): 客户端ID
  - 其他MQTT连接选项...

**返回值:**
- `connect(onStatusChange)`: 连接MQTT服务器
- `disconnect()`: 断开MQTT连接
- `publish(topic, message, qos, retain)`: 发布消息
- `isConnected`: 连接状态

### MQTTProvider

提供MQTT上下文的组件。

**Props:**
- `config` (Object): MQTT连接配置
- `defaultTopic` (string): 默认订阅主题
- `defaultQos` (number): 默认QoS级别
- `autoSubscribe` (boolean): 是否自动订阅
- `autoConnect` (boolean): 是否自动连接

### useMQTTContext

获取MQTT上下文的Hook。

**返回值:**
- `connect(onStatusChange)`: 连接MQTT服务器
- `disconnect()`: 断开MQTT连接
- `globalMessages`: 全局消息列表
- `getGlobalMessages()`: 获取全局消息列表
- `doSubscribe(topic, qos)`: 订阅主题
- `unsubscribe(topic)`: 取消订阅主题
- `handlePushMessage(topic, message, senderId, qos, retain)`: 发送消息
- `isConnected`: 连接状态
- `subscribeList`: 订阅列表

## 配置选项

MQTT客户端支持多种配置选项，这些选项可以在创建MQTT服务实例或使用MQTTProvider时传入。

### 基本配置选项

- `host` (string): MQTT服务器地址
- `port` (number): MQTT服务器端口，默认为8883
- `clientId` (string): 客户端ID，如果不提供将自动生成一个随机ID
- `username` (string): 用户名
- `password` (string): 密码
- `keepalive` (number): 保活时间（秒），默认为60秒
- `protocol` (string): 协议类型，支持 'wss' (WebSocket Secure) 等
- `protocolVersion` (number): MQTT协议版本，默认为4 (MQTT v3.1.1)
- `transport` (string): 传输方式，例如 'websocket'
- `clean` (boolean): 是否使用干净会话，默认为true

### 高级配置选项

- `wsOptions` (Object): WebSocket选项
  - `rejectUnauthorized` (boolean): 是否拒绝未经授权的连接，默认为false
- `maxReconnectAttempts` (number): 最大重连尝试次数，默认为5
- `initialReconnectDelay` (number): 初始重连延迟（毫秒），默认为1000

### 预定义配置

项目提供了两个预定义的配置对象：

1. `config`: 基本配置，使用随机生成的clientId和干净会话
2. `persistentConfig`: 持久化配置，使用固定的clientId和非干净会话，适用于需要接收离线消息的场景

```javascript
import { config, persistentConfig } from './config';

// 使用基本配置
const { connect, disconnect, publish } = useMqttService(config);

// 使用持久化配置
const { connect, disconnect, publish } = useMqttService(persistentConfig);
```

```

