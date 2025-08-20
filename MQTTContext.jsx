import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMqttService } from './index';

// 创建MQTT上下文
const MQTTContext = createContext(undefined);

// MQTTProvider组件
export const MQTTProvider = ({ children, config = {}, defaultTopic = 'clien', defaultQos = 1, autoSubscribe = true, autoConnect = true }) => {
  const { connect, disconnect, subscribe, unsubscribe, publish, isConnected, subscribeList } = useMqttService(config);

  // 全局消息状态
  const [globalMessages, setGlobalMessages] = useState([]);

  // 全局消息处理函数
  const handleGlobalMessage = (topic, message) => {
    // console.log(`[Global] Received message on topic ${topic}: ${message}`);
    const parsedMessage = processJsonMessage(message);
    // 过滤只保留senderId为jaylin的消息
    if (parsedMessage && parsedMessage.senderId !== 'jaylin') {
      setGlobalMessages(prev => [...prev, { topic, message: parsedMessage, timestamp: new Date() }]);
    } else {
      // console.log(`[Global] Message filtered out (senderId is not jaylin or invalid JSON)`);
    }
  };

  // 提供获取全局消息的方法
  const getGlobalMessages = () => globalMessages;

  // 订阅主题
  const doSubscribe = async (topic = defaultTopic, qos = defaultQos) => {
    try {
      await subscribe(topic, qos, handleGlobalMessage);
    } catch (error) {
      console.error('Subscribe error:', error);
    }
  };

  // 连接MQTT并在组件挂载时设置订阅
  useEffect(() => {
    if (autoConnect) connect((status,err)=>{
      if(status === 'connectSuccess'){
        // doSubscribe();
      }else{
        console.error('-----------------MQTT Connection failed:',status, err);
      }
    });
    return () => {
      disconnect();
      setGlobalMessages([]);
    };
  }, []);

  // 连接成功自动订阅 
  useEffect(() => {
    // console.log('change subscribe', isConnected, autoSubscribe);
    if (isConnected && autoSubscribe) {
      doSubscribe();
    }
  }, [isConnected, autoSubscribe]);

  const processJsonMessage = (message) => {
    if (!message) return null;
    // 移除可能存在的换行符和回车符
    const cleanedMessage = message.replace(/[\r\n]/g, '');
    try {
      // 解析JSON字符串
      const parsedData = JSON.parse(cleanedMessage);
      return parsedData;
    } catch (error) {
      console.error('Failed to parse JSON message:', error);
      return cleanedMessage;
    }
  };

  // 处理发送信息
  const handlePushMessage = async (topic, message, senderId = 'jaylin', qos = defaultQos, retain = false) => {
    const newMessage = typeof message === 'object' ? JSON.stringify({ ...message, senderId: senderId || 'jaylin' }) : JSON.stringify({ senderId: senderId || 'jaylin', message });
    return await publish(topic, newMessage, qos, retain);
  };

  return (
    <MQTTContext.Provider
      value={{
        connect,
        disconnect,
        globalMessages,
        getGlobalMessages,
        doSubscribe,
        unsubscribe,
        handlePushMessage,
        isConnected,
        subscribeList
      }}
    >
      {children}
    </MQTTContext.Provider>
  );
};

// 导出useMQTTContext钩子
export const useMQTTContext = () => {
  const context = useContext(MQTTContext);
  if (context === undefined) {
    throw new Error('useMQTTContext must be used within a MQTTProvider');
  }
  return context;
};