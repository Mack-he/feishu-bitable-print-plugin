import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { BitableRecord, BitableField, BitableView } from '@/types/bitable';

interface GridViewProps {
  records: BitableRecord[];
  fields: BitableField[];
  view: BitableView;
}

export function GridView({ records, fields, view }: GridViewProps) {
  // 过滤出需要显示的字段（排除描述等长文本字段）
  const displayFields = fields.filter(f => f.name !== '描述');

  const renderCellContent = (field: BitableField, value: any) => {
    switch (field.type) {
      case 'select':
        return value ? (
          <Badge variant="outline" className="text-xs">
            {value}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case 'multiSelect':
        return value && value.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {value.map((v: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {v}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case 'person':
        return value ? (
          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-[10px]">{value[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs">{value}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case 'date':
        return value ? (
          <span className="text-xs">{new Date(value).toLocaleDateString('zh-CN')}</span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case 'number':
        return value !== undefined && value !== null ? (
          <span className="text-xs">{value}</span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case 'text':
      default:
        return value ? (
          <span className="text-xs truncate max-w-[200px] block">{value}</span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-slate-500';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              {displayFields.map((field) => (
                <TableHead key={field.id} className="text-xs font-semibold">
                  {field.name}
                  {field.isPrimary && <span className="ml-1 text-yellow-500">★</span>}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id} className="hover:bg-muted/50">
                {displayFields.map((field) => {
                  const value = record.fields[field.id];
                  
                  // 特殊处理进度字段
                  if (field.name === '进度' && typeof value === 'number') {
                    return (
                      <TableCell key={field.id}>
                        <div className="flex items-center gap-2">
                          <Progress value={value} className="h-1.5 flex-1" />
                          <span className="text-xs w-8 text-right">{value}%</span>
                        </div>
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell key={field.id} className="text-xs">
                      {renderCellContent(field, value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {records.length === 0 && (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          暂无数据
        </div>
      )}
    </div>
  );
}
