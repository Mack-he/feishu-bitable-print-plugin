/**
 * DOM 安全操作工具函数
 * 用于防止 "closest is not a function" 等类型错误
 */

/**
 * 安全的 closest 方法
 * 在调用 element.closest() 前检查 element 是否是有效的 Element
 */
export function safeClosest(element: unknown, selector: string): Element | null {
  if (!element) {
    return null;
  }
  
  // 检查是否是 Element 实例
  if (!(element instanceof Element)) {
    return null;
  }
  
  try {
    return element.closest(selector);
  } catch (error) {
    console.warn('[DOM] safeClosest error:', error);
    return null;
  }
}

/**
 * 安全检查是否是 Element
 */
export function isElement(value: unknown): value is Element {
  return value instanceof Element;
}

/**
 * 安全检查是否是 EventTarget
 */
export function isEventTarget(value: unknown): value is EventTarget {
  return value instanceof EventTarget;
}

/**
 * 安全获取事件目标元素
 */
export function getEventTargetElement(event: Event): Element | null {
  const target = event.target;
  
  if (target instanceof Element) {
    return target;
  }
  
  return null;
}

/**
 * 安全检查元素是否匹配选择器
 */
export function safeMatches(element: unknown, selector: string): boolean {
  if (!element || !(element instanceof Element)) {
    return false;
  }
  
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}

/**
 * 安全查询选择器
 */
export function safeQuerySelector(selector: string, context: Document | Element = document): Element | null {
  try {
    return context.querySelector(selector);
  } catch {
    return null;
  }
}

/**
 * 安全查询所有选择器
 */
export function safeQuerySelectorAll(selector: string, context: Document | Element = document): NodeListOf<Element> {
  try {
    return context.querySelectorAll(selector);
  } catch {
    return [] as unknown as NodeListOf<Element>;
  }
}

/**
 * 防止事件冒泡的包装器
 */
export function stopPropagationSafe(event: Event): void {
  try {
    event.stopPropagation();
  } catch {
    // 忽略错误
  }
}

/**
 * 阻止默认行为的包装器
 */
export function preventDefaultSafe(event: Event | React.SyntheticEvent): void {
  try {
    event.preventDefault();
  } catch {
    // 忽略错误
  }
}
