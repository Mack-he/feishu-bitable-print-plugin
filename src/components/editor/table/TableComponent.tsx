import React, { useState, useCallback } from 'react';
import { TableComponent as TableComponentType } from '@/types/editor';

interface TableComponentProps {
  component: TableComponentType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TableComponentType>) => void;
  onDelete: () => void;
  onCopy: () => void;
}

export const TableComponent: React.FC<TableComponentProps> = ({
  component,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onCopy,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tableData, setTableData] = useState<string[][]>([
    ['', '', ''],
    ['', '', ''],
  ]);

  const handleMouseEnter = useCallback(() => {
    if (!isSelected && !isEditing) {
      setIsHovered(true);
    }
  }, [isSelected, isEditing]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected) {
      onSelect();
    }
  }, [isSelected, onSelect]);

  const handleEditTable = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setIsHovered(false);
  }, []);

  const handleCellChange = useCallback((row: number, col: number, value: string) => {
    const newData = [...tableData];
    newData[row] = [...newData[row]];
    newData[row][col] = value;
    setTableData(newData);
    onUpdate({ content: { type: 'simple-table', data: newData } });
  }, [tableData, onUpdate]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
  }, [onCopy]);

  const addRow = useCallback(() => {
    const newRow = new Array(tableData[0]?.length || 3).fill('');
    const newData = [...tableData, newRow];
    setTableData(newData);
    onUpdate({ content: { type: 'simple-table', data: newData } });
  }, [tableData, onUpdate]);

  const addColumn = useCallback(() => {
    const newData = tableData.map(row => [...row, '']);
    setTableData(newData);
    onUpdate({ content: { type: 'simple-table', data: newData } });
  }, [tableData, onUpdate]);

  const deleteRow = useCallback((rowIndex: number) => {
    if (tableData.length > 1) {
      const newData = tableData.filter((_, index) => index !== rowIndex);
      setTableData(newData);
      onUpdate({ content: { type: 'simple-table', data: newData } });
    }
  }, [tableData, onUpdate]);

  const deleteColumn = useCallback((colIndex: number) => {
    if (tableData[0]?.length > 1) {
      const newData = tableData.map(row => row.filter((_, index) => index !== colIndex));
      setTableData(newData);
      onUpdate({ content: { type: 'simple-table', data: newData } });
    }
  }, [tableData, onUpdate]);

  const shouldShowHoverToolbar = isHovered && !isSelected && !isEditing;
  const shouldShowSelectionBorder = isSelected && !isEditing;

  return (
    <div 
      className="table-component relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ 
        padding: 0, 
        margin: '10px',
        display: 'inline-block',
      }}
    >
      {/* 1. 拖拽手柄 - 左侧垂直居中 */}
      {isSelected && !isEditing && (
        <div 
          className="absolute -left-8 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
          style={{ zIndex: 30 }}
        >
          <div className="w-6 h-6 bg-gray-100 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      )}

      {/* 2. 悬浮工具栏 - 顶部右侧 */}
      {shouldShowHoverToolbar && (
        <div 
          className="absolute -top-10 right-0 z-20"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-2 py-1">
            <button
              onClick={handleEditTable}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>编辑表格</span>
            </button>
            
            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
            
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            
            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            <button
              onClick={handleDelete}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 3. 表格主体 */}
      <div className="relative" style={{ padding: 0, margin: 0 }}>
        {/* 选中框 */}
        {shouldShowSelectionBorder && (
          <div 
            className="absolute inset-0 border-2 border-blue-500 pointer-events-none" 
            style={{ zIndex: 5 }}
          />
        )}
        
        <div className="border bg-white" style={{ padding: 0, margin: 0 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {tableData.map((row, rowIndex) => (
                <tr key={rowIndex} className="relative">
                  {/* 行控制条 - 左侧渐变竖条 */}
                  {isSelected && !isEditing && (
                    <td 
                      style={{ 
                        position: 'absolute', 
                        left: -20, 
                        top: 0, 
                        bottom: 0, 
                        width: 16,
                        background: 'linear-gradient(to right, rgba(59, 130, 246, 0.2), transparent)',
                        cursor: 'pointer',
                        zIndex: 20
                      }}
                      onMouseEnter={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <div className="flex items-center justify-center h-full">
                        <div className="relative group">
                          <button className="w-4 h-4 flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          {/* 行菜单 */}
                          <div className="absolute left-full top-0 ml-2 bg-white border rounded shadow-lg p-2 hidden group-hover:block">
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteRow(rowIndex); }}
                              className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 text-red-600"
                            >
                              删除行
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  
                  {row.map((cell, colIndex) => {
                    return (
                      <td 
                        key={colIndex} 
                        className="relative group"
                        style={{ 
                          border: '1px solid #e5e7eb', 
                          padding: '8px',
                          backgroundColor: '#f8fafc',
                          minWidth: '80px',
                          height: '32px',
                        }}
                      >
                        {/* 列控制条 - 顶部渐变横条 */}
                        {isSelected && !isEditing && rowIndex === 0 && (
                          <div 
                            style={{ 
                              position: 'absolute', 
                              top: -20, 
                              left: 0, 
                              right: 0, 
                              height: 16,
                              background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.2), transparent)',
                              cursor: 'pointer',
                              zIndex: 20
                            }}
                            onMouseEnter={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <div className="flex items-center justify-center w-full">
                              <div className="relative group">
                                <button className="w-4 h-4 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                  </svg>
                                </button>
                                {/* 列菜单 */}
                                <div className="absolute top-full left-0 mt-2 bg-white border rounded shadow-lg p-2 hidden group-hover:block">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); deleteColumn(colIndex); }}
                                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 text-red-600"
                                  >
                                    删除列
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 行间添加按钮 */}
                        {isSelected && !isEditing && (
                          <div 
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ zIndex: 15 }}
                          >
                            <button 
                              onClick={(e) => { e.stopPropagation(); addRow(); }}
                              className="w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm"
                            >
                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        )}
                        
                        {/* 列间添加按钮 */}
                        {isSelected && !isEditing && (
                          <div 
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ zIndex: 15 }}
                          >
                            <button 
                              onClick={(e) => { e.stopPropagation(); addColumn(); }}
                              className="w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm"
                            >
                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        )}
                        
                        {isEditing ? (
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              width: '100%', 
                              border: 'none', 
                              background: 'transparent', 
                              outline: 'none',
                              fontSize: '14px',
                            }}
                            placeholder=""
                          />
                        ) : (
                          <span style={{ color: 'transparent' }}>•</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. 左侧加号按钮 */}
      {shouldShowHoverToolbar && (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2">
          <button className="w-6 h-6 bg-gray-100 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

TableComponent.displayName = 'TableComponent';
