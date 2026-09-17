'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Key,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LicenseState } from '@/hooks/useLicense';
import { formatLicenseCode } from '@/lib/license-utils';

interface LicenseStatusProps {
  licenseState: LicenseState;
  userId: string;
  userName: string;
  onRenew: (code: string) => Promise<boolean>;
  isRenewing: boolean;
}

/**
 * 授权状态显示组件
 */
export function LicenseStatus({
  licenseState,
  userId,
  userName,
  onRenew,
  isRenewing,
}: LicenseStatusProps) {
  const [showRenewInput, setShowRenewInput] = useState(false);
  const [renewCode, setRenewCode] = useState('');
  const [renewError, setRenewError] = useState<string | null>(null);
  const [renewSuccess, setRenewSuccess] = useState(false);

  // 格式化日期
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 处理续期输入
  const handleRenewInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();
    value = value.replace(/[^A-Z0-9]/g, '');
    
    const groups: string[] = [];
    for (let i = 0; i < value.length && i < 16; i += 4) {
      groups.push(value.substring(i, i + 4));
    }
    
    setRenewCode(groups.join('-'));
    setRenewError(null);
  };

  // 提交续期
  const handleRenewSubmit = async () => {
    if (renewCode.replace(/-/g, '').length !== 16) {
      setRenewError('请输入完整的16位授权码');
      return;
    }

    setRenewError(null);
    const success = await onRenew(renewCode);
    
    if (success) {
      setRenewSuccess(true);
      setTimeout(() => {
        setShowRenewInput(false);
        setRenewCode('');
        setRenewSuccess(false);
      }, 2000);
    } else {
      setRenewError('授权码无效或已被使用');
    }
  };

  // 获取状态图标
  const StatusIcon = () => {
    switch (licenseState.status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expiring':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Key className="h-4 w-4 text-gray-500" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    switch (licenseState.status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'expiring':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'expired':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!licenseState.hasLicense) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>未检测到有效授权</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Key className="h-4 w-4" />
            授权状态
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(getStatusColor())}
          >
            <StatusIcon />
            <span className="ml-1">{licenseState.statusMessage}</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 text-sm">
        {/* 授权码信息 */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">授权码</span>
          <span className="font-mono">
            {licenseState.licenseCode 
              ? formatLicenseCode(licenseState.licenseCode)
              : '-'
            }
          </span>
        </div>
        
        {/* 有效期类型 */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">授权类型</span>
          <span>
            {licenseState.durationDays 
              ? `${licenseState.durationDays}天`
              : '-'
            }
          </span>
        </div>
        
        {/* 到期时间 */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">到期时间</span>
          <span className={cn(
            licenseState.daysRemaining <= 7 && "text-orange-600 font-medium"
          )}>
            {formatDate(licenseState.validUntil)}
          </span>
        </div>

        {/* 续期提醒 */}
        {licenseState.status === 'expiring' && (
          <Alert className="mt-3 border-orange-200 bg-orange-50">
            <Clock className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-700 text-xs">
              授权即将到期，请及时续期以避免影响使用
            </AlertDescription>
          </Alert>
        )}

        {/* 续期输入框 */}
        {showRenewInput ? (
          <div className="space-y-2 mt-3 pt-3 border-t">
            <label className="text-xs font-medium">输入新授权码续期</label>
            <Input
              value={renewCode}
              onChange={handleRenewInputChange}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              maxLength={19}
              disabled={isRenewing}
              className={cn(
                "text-center font-mono uppercase",
                renewError && "border-red-500"
              )}
            />
            
            {renewError && (
              <p className="text-xs text-red-500">{renewError}</p>
            )}
            
            {renewSuccess && (
              <p className="text-xs text-green-500">续期成功！</p>
            )}
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowRenewInput(false);
                  setRenewCode('');
                  setRenewError(null);
                }}
              >
                <X className="h-3 w-3 mr-1" />
                取消
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={renewCode.replace(/-/g, '').length !== 16 || isRenewing}
                onClick={handleRenewSubmit}
              >
                {isRenewing ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                确认续期
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => setShowRenewInput(true)}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            续期授权
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default LicenseStatus;
