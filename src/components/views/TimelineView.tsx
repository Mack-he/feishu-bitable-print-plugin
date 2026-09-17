import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BitableRecord, BitableField, BitableView } from '@/types/bitable';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TimelineViewProps {
  records: BitableRecord[];
  fields: BitableField[];
  view: BitableView;
}

export function TimelineView({ records, fields, view }: TimelineViewProps) {
  const dateFieldId = view.fieldConfig.dateField;
  
  // 按日期排序
  const sortedRecords = [...records].sort((a, b) => {
    const dateA = dateFieldId ? new Date(a.fields[dateFieldId]).getTime() : 0;
    const dateB = dateFieldId ? new Date(b.fields[dateFieldId]).getTime() : 0;
    return dateA - dateB;
  });

  // 按日期分组
  const groupedByDate = sortedRecords.reduce((acc, record) => {
    const dateValue = dateFieldId ? record.fields[dateFieldId] : null;
    const date = dateValue ? new Date(dateValue).toLocaleDateString('zh-CN') : '未设置日期';
    
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(record);
    return acc;
  }, {} as Record<string, BitableRecord[]>);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      '待开始': 'bg-slate-500',
      '进行中': 'bg-blue-500',
      '已完成': 'bg-green-500',
      '已延期': 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      '低': 'bg-slate-200 text-slate-700',
      '中': 'bg-blue-100 text-blue-700',
      '高': 'bg-orange-100 text-orange-700',
      '紧急': 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="h-full">
      <ScrollArea className="h-full pr-4">
        <div className="max-w-4xl mx-auto">
          {Object.entries(groupedByDate).map(([date, dateRecords]) => (
            <div key={date} className="mb-8">
              {/* 日期标题 */}
              <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="font-semibold text-sm">{date}</h3>
                <span className="text-xs text-muted-foreground">{dateRecords.length} 个任务</span>
                <div className="flex-1 border-t border-border" />
              </div>

              {/* 时间线卡片 */}
              <div className="space-y-3 ml-2">
                {dateRecords.map((record, idx) => {
                  const title = view.fieldConfig.titleField 
                    ? record.fields[view.fieldConfig.titleField] 
                    : '未命名任务';
                  const status = view.fieldConfig.statusField 
                    ? record.fields[view.fieldConfig.statusField] 
                    : null;
                  const assignee = view.fieldConfig.assigneeField 
                    ? record.fields[view.fieldConfig.assigneeField] 
                    : null;
                  const priority = record.fields.field_3;
                  const tags = record.fields.field_8 || [];
                  const description = record.fields.field_9;
                  const progress = record.fields.field_7;

                  return (
                    <Card key={record.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex gap-4">
                        {/* 时间指示器 */}
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(status || '')}`} />
                          {idx !== dateRecords.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-2" />
                          )}
                        </div>

                        {/* 内容 */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm">{title}</h4>
                            <div className="flex items-center gap-2">
                              {status && (
                                <Badge variant="outline" className="text-xs">
                                  {status}
                                </Badge>
                              )}
                              {priority && (
                                <Badge className={`text-xs ${getPriorityColor(priority)}`}>
                                  {priority}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {description && (
                            <p className="text-xs text-muted-foreground mb-3">
                              {description}
                            </p>
                          )}

                          {tags && tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {tags.map((tag: string, tagIdx: number) => (
                                <Badge key={tagIdx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {progress !== undefined && progress !== null && (
                                <span>进度: {progress}%</span>
                              )}
                            </div>
                            {assignee && (
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs">
                                    {assignee[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">{assignee}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
