'use client';

import { useEffect } from 'react';

/**
 * 全局事件安全层（终极增强版）
 * 修复飞书 iframe 事件导致的 e.closest 问题
 * 
 * 问题分析：
 * - 在飞书跨域 iframe 中，事件对象的 target 可能不是标准 DOM Element
 * - 导致调用 .closest() 等方法时抛出 "e.closest is not a function" 错误
 * - 这个错误会中断 JS 执行，导致选中事件回调无法执行
 * 
 * 解决方案：
 * 1. 全局错误捕获 - 阻止 closest 错误传播
 * 2. 事件对象防御 - 在事件处理前修复 target
 * 3. 原型方法保护 - 包装 closest 等敏感方法
 * 4. 事件监听器包装 - 自动包裹所有 addEventListener
 */
export function EventSafetyLayer() {
  useEffect(() => {
    console.log('[EventSafetyLayer] 🛡️ ======== 初始化事件安全层 ========');

    // ============================================
    // 1. 全局错误捕获 - 第一层防线
    // ============================================
    const originalErrorHandler = window.onerror;
    window.onerror = function(
      message: string | Event, 
      source?: string, 
      lineno?: number, 
      colno?: number, 
      error?: Error
    ): boolean {
      const errorMsg = String(message).toLowerCase();
      const stack = error?.stack?.toLowerCase() || '';
      
      // 专门捕获 closest 相关错误
      if (errorMsg.includes('closest') || 
          errorMsg.includes('is not a function') ||
          stack.includes('closest') ||
          stack.includes('isnodeinoutercontrolledzone') ||
          stack.includes('handleiframeclick')) {
        
        console.warn('[EventSafetyLayer] 🎯 捕获到飞书 SDK 错误，已阻止崩溃:', {
          message: String(message).substring(0, 100),
          source: source?.substring(source.lastIndexOf('/') + 1),
          lineno,
          colno
        });
        
        // 返回 true 表示已处理，阻止错误传播
        return true;
      }
      
      // 其他错误交给原始处理函数
      if (originalErrorHandler) {
        return originalErrorHandler.call(window, message as string, source!, lineno!, colno!, error!);
      }
      
      return false;
    };

    // ============================================
    // 2. Promise 拒绝捕获 - 第二层防线
    // ============================================
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason).toLowerCase();
      
      if (reason.includes('closest') || 
          reason.includes('is not a function') ||
          reason.includes('handleiframeclick')) {
        console.warn('[EventSafetyLayer] 🎯 捕获到 closest 相关 Promise 拒绝，已阻止:', 
          String(event.reason).substring(0, 100));
        event.preventDefault();
        event.stopPropagation();
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // ============================================
    // 2.5 拦截 console.error - 阻止飞书 SDK 错误日志
    // ============================================
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const errorMsg = args.map(arg => String(arg)).join(' ').toLowerCase();
      
      // 拦截飞书 SDK 相关的错误
      if (errorMsg.includes('closest') || 
          errorMsg.includes('is not a function') ||
          errorMsg.includes('isnodeinoutercontrolledzone') ||
          errorMsg.includes('handleiframeclick') ||
          errorMsg.includes('lark') ||
          errorMsg.includes('bitable')) {
        // 静默忽略这些错误
        return;
      }
      
      // 其他错误正常输出
      originalConsoleError.apply(console, args);
    };
    
    console.log('[EventSafetyLayer] ✅ console.error 已拦截');

    // ============================================
    // 3. 安全的 Element 原型方法包装 - 第三层防线
    // ============================================
    if (typeof Element !== 'undefined') {
      // 保存原始方法
      const originalClosest = Element.prototype.closest;
      const originalMatches = Element.prototype.matches;
      const originalQuerySelector = Element.prototype.querySelector;
      const originalQuerySelectorAll = Element.prototype.querySelectorAll;
      
      // 包装 closest 方法
      Element.prototype.closest = function(this: Element, selector: string): Element | null {
        try {
          // 防御性检查：确保 this 是有效的 Element
          if (!this || typeof this !== 'object' || !(this instanceof Element)) {
            console.warn('[EventSafetyLayer] closest 被非 Element 对象调用');
            return null;
          }
          return originalClosest.call(this, selector);
        } catch (e) {
          console.warn('[EventSafetyLayer] Element.closest 调用失败，安全返回 null');
          return null;
        }
      };
      
      // 包装 matches 方法
      Element.prototype.matches = function(this: Element, selector: string): boolean {
        try {
          if (!this || typeof this !== 'object' || !(this instanceof Element)) {
            return false;
          }
          return originalMatches.call(this, selector);
        } catch (e) {
          return false;
        }
      };
      
      // 包装 querySelector 方法
      Element.prototype.querySelector = function(this: Element, selector: string): Element | null {
        try {
          if (!this || typeof this !== 'object' || !(this instanceof Element)) {
            return null;
          }
          return originalQuerySelector.call(this, selector);
        } catch (e) {
          return null;
        }
      };
      
      // 包装 querySelectorAll 方法
      Element.prototype.querySelectorAll = function(this: Element, selector: string): NodeListOf<Element> {
        try {
          if (!this || typeof this !== 'object' || !(this instanceof Element)) {
            return document.querySelectorAll('nothing'); // 返回空 NodeList
          }
          return originalQuerySelectorAll.call(this, selector);
        } catch (e) {
          return document.querySelectorAll('nothing');
        }
      };
      
      console.log('[EventSafetyLayer] ✅ Element 原型方法已安全包装');
    }

    // ============================================
    // 4. 包装 addEventListener - 第四层防线
    // ============================================
    const originalAddEventListener = window.addEventListener;
    
    window.addEventListener = function(
      type: string, 
      listener: EventListenerOrEventListenerObject | null, 
      options?: boolean | AddEventListenerOptions
    ): void {
      if (!listener) {
        return originalAddEventListener.call(this, type, null as unknown as EventListenerOrEventListenerObject, options);
      }
      
      // 创建安全包装器
      const safeListener = function(this: typeof window, event: Event) {
        try {
          // 防御性检查事件对象
          if (event && event.target) {
            const target = event.target as any;
            // 如果 target 不是标准 Element，创建一个代理
            if (typeof target === 'object' && target !== null && !(target instanceof Element)) {
              // 静默处理，不输出日志以避免性能问题
              // console.warn('[EventSafetyLayer] 检测到非标准事件 target，已创建安全代理');
              
              // 创建代理对象，拦截 closest 等方法
              const safeTarget = new Proxy(target, {
                get(obj, prop) {
                  if (prop === 'closest' || prop === 'matches' || prop === 'querySelector') {
                    return () => null;
                  }
                  return obj[prop];
                }
              });
              
              // 安全地定义 target 属性：先检查是否可配置
              try {
                const descriptor = Object.getOwnPropertyDescriptor(event, 'target');
                if (!descriptor || descriptor.configurable) {
                  Object.defineProperty(event, 'target', {
                    value: safeTarget,
                    writable: false,
                    configurable: true
                  });
                } else {
                  // 如果不可配置，就不尝试重新定义，静默处理
                  console.warn('[EventSafetyLayer] target 属性不可配置，跳过重定义');
                }
              } catch (e) {
                // 捕获任何错误，继续执行
                console.warn('[EventSafetyLayer] 重定义 target 属性失败，已跳过');
              }
            }
          }
          
          // 调用原始监听器
          if (typeof listener === 'function') {
            listener.call(this, event);
          } else {
            listener.handleEvent.call(this, event);
          }
        } catch (error) {
          // 捕获监听器中的错误
          const errorMsg = String(error).toLowerCase();
          if (errorMsg.includes('closest') || errorMsg.includes('is not a function')) {
            // 静默处理 closest 错误，避免频繁日志输出
            // console.warn('[EventSafetyLayer] 捕获到监听器中的 closest 错误，已阻止崩溃');
          } else {
            // 其他错误重新抛出
            throw error;
          }
        }
      };
      
      // 存储原始监听器引用以便清理
      (safeListener as any)._originalListener = listener;
      
      return originalAddEventListener.call(this, type, safeListener, options);
    };

    // ============================================
    // 5. 事件捕获阶段的防御 - 第五层防线
    // ============================================
    const eventTypes = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'];
    
    const captureHandler = (event: Event) => {
      // 在捕获阶段检查并修复事件对象
      try {
        const target = event.target as any;
        if (target && typeof target === 'object' && !(target instanceof Element)) {
          // 标记为非标准 target，后续处理时会用到
          (event as any)._isNonStandardTarget = true;
        }
      } catch (e) {
        // 忽略检查错误
      }
    };
    
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, captureHandler, true);
    });

    console.log('[EventSafetyLayer] 🛡️ ======== 事件安全层初始化完成 ========');

    // ============================================
    // 清理函数
    // ============================================
    return () => {
      console.log('[EventSafetyLayer] 清理事件安全层');
      
      window.onerror = originalErrorHandler;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
      
      // 注意：我们不恢复 Element 原型方法和 addEventListener，
      // 因为那样可能会导致其他代码出错
      
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, captureHandler, true);
      });
    };
  }, []);

  return null;
}

export default EventSafetyLayer;
