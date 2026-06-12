export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  immediate: boolean = false,
): {
  (...args: Parameters<T>): Promise<ReturnType<T>>
  cancel(): void
} {
  // 1.定义一个定时器, 保存上一次的定时器
  let timer: ReturnType<typeof setTimeout> | null = null
  let isInvoke = false

  // 2.真正执行的函数
  const _debounce = function (this: object, ...args: Parameters<T>) {
    return new Promise((resolve) => {
      // 取消上一次的定时器
      if (timer) clearTimeout(timer)

      // 判断是否需要立即执行
      if (immediate && !isInvoke) {
        const result = fn.apply(this, args)
        resolve(result)
        isInvoke = true
      } else {
        // 延迟执行
        timer = setTimeout(() => {
          // 外部传入的真正要执行的函数, 拿到函数返回值并调用resolve
          const result = fn.apply(this, args)
          resolve(result)
          isInvoke = false
          timer = null
        }, delay)
      }
    })
  }

  // 封装取消功能
  _debounce.cancel = function () {
    if (timer) clearTimeout(timer)
    timer = null
    isInvoke = false
  }

  return _debounce as {
    (...args: Parameters<T>): Promise<ReturnType<T>>
    cancel(): void
  }
}

export function formatVolume(volume: number): string {
  if (volume < 10000) {
    return volume.toString()
  } else if (volume < 100000000) {
    return (volume / 10000).toFixed(2) + '万'
  } else {
    return (volume / 100000000).toFixed(2) + '亿'
  }
}
export function checkIsFound(code: string) {
  return !!['15', '16', '51', '52', '58'].find((item) => code.startsWith(item))
}
