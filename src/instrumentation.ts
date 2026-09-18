/**
 * Next.js 启动钩子：服务启动时拉起应用内置的部门定时同步调度器
 * 见 src/lib/department-scheduler.ts（开关与时间点都在那里说明）
 */
export async function register() {
  // 构建阶段不要拉起来：构建过程会短暂启动服务实例，跑同步会写数据
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  // 只有 Node 运行时能做这件事（Edge 运行时没有数据库连接与定时器）
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { startDepartmentScheduler } = await import('@/lib/department-scheduler');
    startDepartmentScheduler();
  } catch (error) {
    console.error('[Instrumentation] 启动部门定时同步调度器失败:', error);
  }
}