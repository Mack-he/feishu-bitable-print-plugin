import { TaskCard } from './TaskCard';
import { BitableRecord, BitableField, BitableView } from '@/types/bitable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface GalleryViewProps {
  records: BitableRecord[];
  fields: BitableField[];
  view: BitableView;
}

export function GalleryView({ records, fields, view }: GalleryViewProps) {
  const [groupBy, setGroupBy] = useState<string>('none');

  const statusField = fields.find(f => f.id === view.fieldConfig.statusField);
  const statusOptions = statusField?.options || [];

  let displayRecords = records;
  let groupedData: Record<string, BitableRecord[]> = {};

  if (groupBy === 'status' && statusOptions.length > 0) {
    groupedData = statusOptions.reduce((acc, status) => {
      acc[status] = records.filter(record => {
        const statusValue = view.fieldConfig.statusField 
          ? record.fields[view.fieldConfig.statusField]
          : null;
        return statusValue === status;
      });
      return acc;
    }, {} as Record<string, BitableRecord[]>);
  } else {
    displayRecords = records;
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">共 {records.length} 个任务</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">分组:</span>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无</SelectItem>
                {statusOptions.length > 0 && (
                  <SelectItem value="status">按状态</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {groupBy === 'status' && statusOptions.length > 0 ? (
          <div className="space-y-6">
            {statusOptions.map((status) => {
              const groupRecords = groupedData[status] || [];
              if (groupRecords.length === 0) return null;
              return (
                <div key={status}>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {status} ({groupRecords.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groupRecords.map((record) => (
                      <TaskCard
                        key={record.id}
                        record={record}
                        fields={fields}
                        titleFieldId={view.fieldConfig.titleField}
                        statusFieldId={view.fieldConfig.statusField}
                        assigneeFieldId={view.fieldConfig.assigneeField}
                        priorityFieldId={fields.find(f => f.name === '优先级')?.id}
                        progressFieldId={fields.find(f => f.name === '进度')?.id}
                        tagsFieldId={fields.find(f => f.name === '标签')?.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {records.map((record) => (
              <TaskCard
                key={record.id}
                record={record}
                fields={fields}
                titleFieldId={view.fieldConfig.titleField}
                statusFieldId={view.fieldConfig.statusField}
                assigneeFieldId={view.fieldConfig.assigneeField}
                priorityFieldId={fields.find(f => f.name === '优先级')?.id}
                progressFieldId={fields.find(f => f.name === '进度')?.id}
                tagsFieldId={fields.find(f => f.name === '标签')?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
