import axios from 'axios'
const apiURL = import.meta.env.VITE_API_URL
const request = axios.create({
  baseURL: apiURL,
  timeout: 10000,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 这里可以添加token等请求头
    // config.headers.Authorization = 'Bearer mock-token'
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 0) {
      console.error('请求错误:', res.msg)
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    return res.data
  },
  (error) => {
    console.error('响应错误:', error)
    return Promise.reject(error)
  },
)

export default request
