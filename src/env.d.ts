/// <reference types="vite/client" />
// 定义环境变量类型
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}
// 定义全局类型
declare global {
  interface Window {
    env: ImportMetaEnv
  }
}
