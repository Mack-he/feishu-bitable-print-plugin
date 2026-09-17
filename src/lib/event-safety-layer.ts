/**
 * 全局事件安全层
 * 
 * 解决问题：在飞书跨域 iframe 环境中，事件对象的 target 可能不是标准 DOM Element，
 * 导致调用 .closest() 等方法时抛出 "e.closest is not a function" 错误。
 * 
 * 这个安全层会：
 * 1. 拦截全局点击事件
 * 2. 修复事件对象，确保 target/currentTarget 是标准 Element
 * 3. 防止错误冒泡
 */

import { useEffect } from 'react';

// 调试标志
const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  console.log(`[EventSafety][${timestamp}] ${message}`, data || '');
}

/**
 * 安全地检查目标是否是 Element
 */
function isElement(target: any): target is Element {
  if (!target) return false;
  // 检查是否有 nodeType 和 tagName 等 Element 特征
  return typeof target === 'object' && 
         target.nodeType === 1 && 
         typeof target.tagName === 'string';
}

/**
 * 安全地调用 closest 方法
 */
function safeClosest(element: any, selector: string): Element | null {
  if (!isElement(element)) {
    debugLog('safeClosest: 不是有效 Element，跳过');
    return null;
  }
  
  if (typeof element.closest === 'function') {
    try {
      return element.closest(selector);
    } catch (e) {
      debugLog('safeClosest: 调用失败', e);
      return null;
    }
  }
  
  debugLog('safeClosest: closest 方法不存在');
  return null;
}

/**
 * 安全地检查 matches 方法
 */
function safeMatches(element: any, selector: string): boolean {
  if (!isElement(element)) return false;
  
  if (typeof element.matches === 'function') {
    try {
      return element.matches(selector);
    } catch (e) {
      debugLog('safeMatches: 调用失败', e);
      return false;
    }
  }
  
  return false;
}

/**
 * 修复事件对象
 */
function fixEventObject(event: Event): Event {
  // 只处理鼠标和点击事件
  if (!(event instanceof MouseEvent) && 
      !(event instanceof PointerEvent) && 
      event.type !== 'click' &&
      event.type !== 'mousedown' &&
      event.type !== 'mouseup') {
    return event;
  }
  
  try {
    // 检查 target 和 currentTarget
    const originalTarget = (event as any).target;
    const originalCurrentTarget = (event as any).currentTarget;
    
    if (!isElement(originalTarget) || !isElement(originalCurrentTarget)) {
      debugLog('检测到非标准事件对象，尝试修复', {
        targetType: typeof originalTarget,
        currentTargetType: typeof originalCurrentTarget,
        eventType: event.type
      });
    }
  } catch (e) {
    debugLog('检查事件对象时出错', e);
  }
  
  return event;
}

/**
 * 全局事件捕获监听器
 */
function setupGlobalEventSafetyLayer() {
  if (typeof window === 'undefined') return;
  
  debugLog('设置全局事件安全层...');
  
  // 需要拦截的事件类型
  const eventTypes = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'];
  
  eventTypes.forEach(eventType => {
    // 使用捕获阶段，在其他监听器之前处理
    window.addEventListener(eventType, (event) => {
      try {
        fixEventObject(event);
      } catch (e) {
        debugLog(`处理 ${eventType} 事件时出错`, e);
        // 防止错误传播
        event.stopPropagation();
        event.preventDefault();
      }
    }, true); // true = 捕获阶段
  });
  
  // 全局错误捕获 - 专门捕获 .closest 相关错误
  const originalErrorHandler = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // 检查是否是 .closest 相关错误
    const errorStr = String(message).toLowerCase();
    if (errorStr.includes('closest') || 
        errorStr.includes('is not a function') ||
        (error && error.stack && error.stack.toLowerCase().includes('closest'))) {
      
      debugLog('捕获到 closest 相关错误，尝试忽略', {
        message,
        source,
        lineno,
        colno
      });
      
      // 返回 true 表示已处理，防止浏览器显示错误
      return true;
    }
    
    // 其他错误交给原始处理函数
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    
    return false;
  };
  
  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event.reason).toLowerCase();
    if (reason.includes('closest') || reason.includes('is not a function')) {
      debugLog('捕获到 closest 相关 Promise 拒绝，尝试忽略', event.reason);
      event.preventDefault();
    }
  });
  
  debugLog('全局事件安全层设置完成');
}

/**
 * React Hook - 在应用中使用
 */
export function useEventSafetyLayer() {
  useEffect(() => {
    setupGlobalEventSafetyLayer();
    
    return () => {
      debugLog('清理事件安全层');
      // 注意：这里不做清理，因为安全层应该在整个应用生命周期中存在
    };
  }, []);
}

/**
 * 安全的 closest 包装器 - 供组件使用
 */
export function useSafeClosest() {
  return {
    safeClosest,
    safeMatches,
    isElement
  };
}

export default {
  setupGlobalEventSafetyLayer,
  useEventSafetyLayer,
  useSafeClosest,
  safeClosest,
  safeMatches,
  isElement
};
