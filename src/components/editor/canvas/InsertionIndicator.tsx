'use client';

import React from 'react';

interface InsertionIndicatorProps {
  type?: 'horizontal' | 'vertical-left' | 'vertical-right';
}

export const InsertionIndicator: React.FC<InsertionIndicatorProps> = ({ type = 'horizontal' }) => {
  if (type === 'vertical-left' || type === 'vertical-right') {
    // 垂直模式：左右插入
    return (
      <div 
        className="insertion-indicator-vertical"
        style={{
          width: '4px',
          height: '100%',
          minHeight: '60px',
          backgroundColor: '#1890ff',
          borderRadius: '2px',
          margin: '0 4px',
          boxShadow: '0 0 8px rgba(24, 144, 255, 0.5)',
          animation: 'pulseVertical 1s infinite ease-in-out',
          zIndex: 10,
          flexShrink: 0,
          alignSelf: 'stretch',
        }}
      >
        <style>{`
          @keyframes pulseVertical {
            0%, 100% { opacity: 0.6; transform: scaleX(1); }
            50% { opacity: 1; transform: scaleX(1.3); }
          }
        `}</style>
      </div>
    );
  }

  // 水平模式：上下插入
  return (
    <div 
      className="insertion-indicator"
      style={{
        width: '100%',
        height: '4px',
        backgroundColor: '#1890ff',
        borderRadius: '2px',
        margin: '4px 0',
        boxShadow: '0 0 8px rgba(24, 144, 255, 0.5)',
        animation: 'pulse 1s infinite ease-in-out',
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
};
