// 飞书客户端 API 类型声明
declare global {
  interface Window {
    feishu?: {
      auth: {
        getUserTicket: () => Promise<string>;
      };
    };
  }
}

export {};
