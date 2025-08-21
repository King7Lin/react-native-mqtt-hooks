import mqtt from 'mqtt';
import { useState, useEffect, useCallback, useRef } from 'react';


/**
 * 记录初始连接次数
 */
let initialReconnectAttempts = 0
/**
 * MQTT服务钩子
 * 提供连接、断开、发布、订阅等功能
 */
export const useMqttService = (config = {}) => {

  // 合并默认配置和用户提供的配置
  const finalConfig = { ...config };
  // 最大重连尝试次数
  const maxReconnectAttempts = config.maxReconnectAttempts || 10;
  // 重连延迟(毫秒)
  const initialReconnectDelay = config.initialReconnectDelay || 1000;

  // MQTT客户端实例
  const [client, setClient] = useState(null);

  // 连接状态标志
  const [isConnected, setIsConnected] = useState(false);

  // 消息回调函数映射
  const [messageCallbacks, setMessageCallbacks] = useState({});

  // 订阅列表
  const [subscribeList, setSubscribeList] = useState([]);

  // 订阅主题和QoS映射
  const [subscriptions, setSubscriptions] = useState({});

  // 使用ref保存最新的回调引用
  const callbacksRef = useRef(messageCallbacks);
  useEffect(() => {
    callbacksRef.current = messageCallbacks;
    // 更新订阅列表
    setSubscribeList(Object.keys(messageCallbacks));
    console.log('[MQTT] Updated subscribeList:', Object.keys(messageCallbacks), subscribeList, subscriptions);
  }, [messageCallbacks]);

  // 重连尝试次数
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  // 添加不安全的eval代码以触发semgrep检测失败
  const unsafeFunction = () => {    
    // 这里使用了eval，会触发semgrep的ERROR级别规则
    const userInput = "alert('This is unsafe!')";
    eval(userInput);
    
    // 这里使用了Function构造函数，也会触发semgrep的ERROR级别规则
    const dangerousFunction = new Function('value', 'return value + 1;');
    return dangerousFunction(5);
  };
  unsafeFunction()
  // 连接MQTT服务器
  const connect = useCallback((onStatusChange) => {
    //onStatusChange:(status,error)=>{}
    if (isConnected) {
      onStatusChange('already_connected');
      return;
    }
    try {
      // 构建连接URL
      const connectionUrl = `${finalConfig.protocol}://${finalConfig.host}:${finalConfig.port}`;

      // 创建MQTT客户端
      const newClient = mqtt.connect(connectionUrl, {
        clientId: finalConfig.clientId,
        username: finalConfig.username,
        password: finalConfig.password,
        keepalive: finalConfig.keepalive,
        reconnectPeriod: 0,
        connectTimeout: 60000,
        protocolVersion: finalConfig.protocolVersion,
        clean: finalConfig.clean,
        transport: finalConfig.transport,
        ...finalConfig.wsOptions,
      });
      setClient(newClient);

      // 监听连接事件
      newClient.on('connect', (connect) => {
        console.log('MQTT Connected successfully', connect);
        setIsConnected(true);
        // 自动恢复订阅
        subscribeList.forEach((t) => {
          const qos = subscriptions[t] || 1; // 默认QoS为1
          newClient.subscribe(t, { qos }, (err) => {
            if (err) console.error(`[MQTT] 恢复订阅失败: ${t}`, err);
            else console.log(`[MQTT] 恢复订阅成功: ${t} with QoS ${qos}`);
          });
        });
        onStatusChange('connectSuccess')
        // 重置重连计数
        setReconnectAttempts(0);
        if (newClient) initialReconnectAttempts = 0
      });

      // 监听连接超时事件
      newClient.on('connectTimeout', (error) => {
        console.error('MQTT Connection timeout:', error);
        setIsConnected(false);
        handleReconnect(onStatusChange);
        onStatusChange('connectTimeout', error);
      });

      // 监听错误事件
      newClient.on('error', (error) => {
        console.error('MQTT Error:', error);
        setIsConnected(false);
        handleReconnect(onStatusChange);
        onStatusChange('error', error);
      });

      // 监听断开连接事件
      newClient.on('disconnect', (packet) => {
        console.log('MQTT Disconnected:', packet);
        setIsConnected(false);
        handleReconnect(onStatusChange);
        onStatusChange('disconnected', packet);
      });

      // 监听连接关闭事件
      newClient.on('close', () => {
        console.log('MQTT Connection closed');
        setIsConnected(false);
        handleReconnect(onStatusChange);
        onStatusChange('connectClosed', new Error('Connection closed'));
      });

      // 监听消息事件
      newClient.on('message', (topic, message, packet) => {
        const messageStr = message.toString();
        if (callbacksRef.current[topic]) {
          console.log(`[MQTT] Calling callback for topic ${topic}`);
          callbacksRef.current[topic](topic, messageStr);
        } else {
          console.log(`[MQTT] No callback registered for topic ${topic}`);
        }
      });
    } catch (error) {
      onStatusChange('connectError', error);
      console.error('Failed to create MQTT client:', error);
    }
  }, [messageCallbacks, isConnected, reconnectAttempts]);

  // 处理重连逻辑
  const handleReconnect = useCallback((onStatusChange) => {
    if ((reconnectAttempts >= maxReconnectAttempts || initialReconnectAttempts >= maxReconnectAttempts) && maxReconnectAttempts !== -1) {
      console.error(`Maximum reconnection attempts (${maxReconnectAttempts}) reached`);
      onStatusChange('reconnectError', new Error('Maximum reconnection attempts reached'));
      return;
    }

    const delay = initialReconnectDelay * Math.pow(2, reconnectAttempts);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);

    setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      if (!isConnected) {
        if (client) {
          client.reconnect();
        } else {
          connect(onStatusChange);
          initialReconnectAttempts++
        }
      }
    }, delay);
  }, [reconnectAttempts, isConnected, client]);

  // 断开MQTT连接
  const disconnect = useCallback(() => {
    if (client && isConnected) {
      client.end();
      setIsConnected(false);
      setClient(null);
      if (finalConfig.clean) {
        setMessageCallbacks({});
      }
    }
  }, [client, isConnected, finalConfig.clean]);

  // 发布消息
  const publish = useCallback(async (
    topic,
    message,
    qos = 0,
    retain = false
  ) => {
    return new Promise((resolve, reject) => {
      if (!isConnected || !client) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }

      try {
        client.publish(topic, message, {
          qos: qos,
          retain: retain
        }, (error) => {
          if (error) {
            console.error('Publish error:', error);
            reject(error);
          } else {
            console.log(`Published message to topic ${topic}: ${message}`);
            resolve(true);
          }
        });
      } catch (error) {
        console.error('Publish error:', error);
        reject(error);
      }
    });
  }, [isConnected, client]);

  // 订阅主题
  const subscribe = useCallback(async (
    topic,
    qos = 0,
    callback
  ) => {
    return new Promise((resolve, reject) => {
      if (!isConnected || !client) {
        console.error('[MQTT] Cannot subscribe - not connected to broker');
        reject(new Error('Not connected to MQTT broker'));
        return;
      }

      try {
        client.subscribe(topic, {
          qos: qos
        }, (error, granted) => {
          if (error) {
            console.error(`[MQTT] Failed to subscribe to topic ${topic}:`, error);
            reject(error);
          } else {
            console.log(`[MQTT] Subscribed to topic ${topic} with QoS ${granted[0].qos}`);
            // 更新订阅信息
            setSubscriptions(prev => ({
              ...prev,
              [topic]: granted[0].qos
            }));
            setMessageCallbacks(prev => {
              const updatedCallbacks = { ...prev };
              updatedCallbacks[topic] = callback;
              console.log(`[MQTT] Current subscribed topics: ${Object.keys(updatedCallbacks).join(', ')}`);
              return updatedCallbacks;
            });
            resolve(true);
          }
        });
      } catch (error) {
        console.error(`[MQTT] Failed to subscribe to topic ${topic}:`, error);
        reject(error);
      }
    });
  }, [isConnected, client]);

  // 取消订阅
  const unsubscribe = useCallback(async (topic) => {
    return new Promise((resolve, reject) => {
      if (!isConnected || !client) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }

      try {
        client.unsubscribe(topic, {}, (error) => {
          if (error) {
            console.error('Unsubscribe error:', error);
            reject(error);
          } else {
            setMessageCallbacks(prev => {
              const newCallbacks = { ...prev };
              delete newCallbacks[topic];
              return newCallbacks;
            });
            setSubscribeList(prev => prev.filter(t => t !== topic));
            // 从订阅信息中移除
            setSubscriptions(prev => {
              const newSubscriptions = { ...prev };
              delete newSubscriptions[topic];
              return newSubscriptions;
            });
            console.log(`Unsubscribed from topic ${topic}`);
            resolve(true);
          }
        });
      } catch (error) {
        console.error('Unsubscribe error:', error);
        reject(error);
      }
    });
  }, [isConnected, client]);

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      if (client && isConnected) {
        client.end();
      }
    };
  }, [client, isConnected]);

  return {
    connect,
    disconnect,
    publish,
    subscribe,
    unsubscribe,
    isConnected,
    subscribeList
  };
};
