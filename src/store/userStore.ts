import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  feishuUserId?: string;
}

interface UserStore {
  user: User | null;
  token: string | null;
  hasAuthorizations: boolean;
  
  // 数据库用户 ID（数字主键，用于模板等资源的归属查询）
  dbUserId: number | null;
  
  // 设置用户信息
  setUser: (user: User | null) => void;
  
  // 设置 JWT token
  setToken: (token: string | null) => void;
  
  // 设置数据库用户 ID
  setDbUserId: (id: number | null) => void;
  
  // 设置是否有授权码
  setHasAuthorizations: (has: boolean) => void;
  
  // 退出登录
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasAuthorizations: false,
      dbUserId: null,
      
      setUser: (user: User | null) => {
        console.log('[userStore] setUser 被调用', user);
        set({ user });
      },
      
      setToken: (token: string | null) => {
        console.log('[userStore] setToken 被调用');
        set({ token });
      },
      
      setDbUserId: (id: number | null) => {
        set({ dbUserId: id });
      },
      
      setHasAuthorizations: (has: boolean) => {
        console.log('[userStore] setHasAuthorizations 被调用', has);
        set({ hasAuthorizations: has });
      },
      
      logout: () => {
        console.log('[userStore] logout 被调用');
        set({
          user: null,
          token: null,
          hasAuthorizations: false,
          dbUserId: null,
        });
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        hasAuthorizations: state.hasAuthorizations,
        dbUserId: state.dbUserId,
      }),
    }
  )
);
