import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { BitableRecord, BitableField } from '@/types/bitable';

interface TaskCardProps {
  record: BitableRecord;
  fields: BitableField[];
  titleFieldId?: string;
  statusFieldId?: string;
  assigneeFieldId?: string;
  priorityFieldId?: string;
  progressFieldId?: string;
  tagsFieldId?: string;
  onClick?: () => void;
}

export function TaskCard({
  record,
  fields,
  titleFieldId,
  statusFieldId,
  assigneeFieldId,
  priorityFieldId,
  progressFieldId,
  tagsFieldId,
  onClick,
}: TaskCardProps) {
  const getFieldById = (fieldId: string) => fields.find(f => f.id === fieldId);
  
  const title = titleFieldId ? record.fields[titleFieldId] : '未命名任务';
  const status = statusFieldId ? record.fields[statusFieldId] : null;
  const assignee = assigneeFieldId ? record.fields[assigneeFieldId] : null;
  const priority = priorityFieldId ? record.fields[priorityFieldId] : null;
  const progress = progressFieldId ? record.fields[progressFieldId] : 0;
  const tags = tagsFieldId ? record.fields[tagsFieldId] : [];

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
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* 标题和状态 */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-sm flex-1 mr-2 line-clamp-2">{title}</h3>
        {status && (
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(status)}`} />
        )}
      </div>

      {/* 描述 */}
      {record.fields.field_9 && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {record.fields.field_9}
        </p>
      )}

      {/* 标签 */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map((tag: string, idx: number) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* 进度 */}
      {progress !== undefined && progress !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">进度</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* 底部信息 */}
      <div className="flex items-center justify-between pt-2 border-t">
        {/* 优先级 */}
        {priority && (
          <Badge className={`text-xs ${getPriorityColor(priority)}`}>
            {priority}
          </Badge>
        )}

        {/* 负责人 */}
        {assignee && (
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">{assignee[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{assignee}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
