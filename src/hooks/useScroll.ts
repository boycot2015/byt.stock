import { nextTick } from 'vue'

export function useScroll() {
  const getHeaderHeight = (): number => {
    const header = document.querySelector('header')
    const nav = document.querySelector('.nav') as HTMLElement | null
    let height = 0
    if (header) {
      height += header.offsetHeight
    }
    if (nav) {
      height += nav.offsetHeight
    }
    return height + 20
  }

  const scrollToElement = async (selector: string, delay: number = 100): Promise<void> => {
    await nextTick()

    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))

    const element = document.querySelector(selector)
    if (!element) {
      console.warn(`Element not found: ${selector}`)
      return
    }

    // const headerHeight = getHeaderHeight()

    // element.scrollIntoView({ behavior: 'smooth', block: 'start' })

    await new Promise((resolve) => setTimeout(resolve, 50))

    // const currentScrollY = window.scrollY
    const elementTop = element.getBoundingClientRect().top
    const windowTop = window.innerHeight * 0.09

    const offset = elementTop - windowTop
    if (offset !== 0) {
      window.scrollBy({
        top: offset,
        behavior: 'smooth',
      })
    }
  }

  const scrollToTop = (behavior: 'smooth' | 'auto' = 'smooth'): void => {
    window.scrollTo({
      top: 0,
      behavior,
    })
  }

  const scrollByOffset = (offset: number, behavior: 'smooth' | 'auto' = 'smooth'): void => {
    window.scrollBy({
      top: offset,
      behavior,
    })
  }

  return {
    scrollToElement,
    scrollToTop,
    scrollByOffset,
    getHeaderHeight,
  }
}
