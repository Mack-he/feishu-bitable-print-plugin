import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BitableRecord, BitableField, BitableView } from '@/types/bitable';
import { TaskCard } from './TaskCard';

interface KanbanViewProps {
  records: BitableRecord[];
  fields: BitableField[];
  view: BitableView;
}

export function KanbanView({ records, fields, view }: KanbanViewProps) {
  const statusField = fields.find(f => f.id === view.fieldConfig.statusField);
  const statusOptions = statusField?.options || ['待开始', '进行中', '已完成', '已延期'];

  const getColumnColor = (status: string) => {
    const colors: Record<string, string> = {
      '待开始': 'bg-slate-100 border-slate-200',
      '进行中': 'bg-blue-50 border-blue-200',
      '已完成': 'bg-green-50 border-green-200',
      '已延期': 'bg-red-50 border-red-200',
    };
    return colors[status] || 'bg-gray-50 border-gray-200';
  };

  const groupedRecords = statusOptions.reduce((acc, status) => {
    acc[status] = records.filter(record => {
      const statusValue = view.fieldConfig.statusField 
        ? record.fields[view.fieldConfig.statusField]
        : null;
      return statusValue === status;
    });
    return acc;
  }, {} as Record<string, BitableRecord[]>);

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {statusOptions.map((status) => {
        const columnRecords = groupedRecords[status] || [];
        return (
          <div key={status} className="flex-shrink-0 w-80">
            <div className={`rounded-lg border-2 ${getColumnColor(status)} p-3 h-full flex flex-col`}>
              {/* 列标题 */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{status}</h3>
                <span className="text-xs text-muted-foreground bg-white px-2 py-0.5 rounded-full">
                  {columnRecords.length}
                </span>
              </div>

              {/* 卡片列表 */}
              <ScrollArea className="flex-1 pr-2">
                <div className="flex flex-col gap-3">
                  {columnRecords.map((record) => (
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
                  {columnRecords.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      暂无任务
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        );
      })}
    </div>
  );
}
