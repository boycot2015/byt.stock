<template>
  <div class="empty-container flex flex-col items-center justify-center w-full" :style="containerStyle">
    <!-- 图片 -->
    <div v-if="showImage" class="empty-image flex items-center justify-center" :style="imageWrapperStyle">
      <!-- 自定义图片 URL -->
      <img v-if="image" :src="image" alt="empty" class="object-contain" :style="imageStyleFinal" />
      <!-- 自定义图片组件（如图标组件） -->
      <component :is="imageComponent" v-else-if="imageComponent" :style="imageStyleFinal" />
      <!-- 默认 SVG -->
      <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg"><title>暂无数据</title><g transform="translate(0 1)" fill="none" fill-rule="evenodd"><ellipse fill="#f5f5f5" cx="32" cy="33" rx="32" ry="7"></ellipse><g fill-rule="nonzero" stroke="#d9d9d9"><path d="M55 12.8 44.9 1.3Q44 0 42.9 0H21.1q-1.2 0-2 1.3L9 12.8V22h46z"></path><path d="M41.6 16c0-1.7 1-3 2.2-3H55v18.1c0 2.2-1.3 3.9-3 3.9H12c-1.7 0-3-1.7-3-3.9V13h11.2c1.2 0 2.2 1.3 2.2 3s1 2.9 2.2 2.9h14.8c1.2 0 2.2-1.4 2.2-3" fill="#fafafa"></path></g></g></svg>
    </div>

    <!-- 文字描述 -->
    <div v-if="description" class="empty-description mt-4 text-center text-sm text-gray-400" :style="descriptionStyle">
      {{ description }}
    </div>

    <!-- 插槽 -->
    <slot v-if="$slots.default" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface EmptyProps {
  /** 自定义图片 URL，传入后优先显示该图片 */
  image?: string
  /** 文字描述 */
  description?: string
  /** 是否显示图片，默认 true */
  showImage?: boolean
  /** 图片宽度 */
  imageWidth?: string | number
  /** 图片高度 */
  imageHeight?: string | number
  /** 图片 style */
  imageStyle?: Record<string, string | number>
  /** 描述 style */
  descriptionStyle?: Record<string, string | number>
  /** 容器 style */
  containerStyle?: Record<string, string | number>
  /** 图片外层 style */
  imageWrapperStyle?: Record<string, string | number>
  /** 自定义图片组件（如图标组件），优先级低于 image URL，高于默认 SVG */
  imageComponent?: any
}

const props = withDefaults(defineProps<EmptyProps>(), {
  image: undefined,
  description: '暂无数据',
  showImage: true,
  imageWidth: 160,
  imageHeight: 120,
  imageStyle: undefined,
  descriptionStyle: undefined,
  containerStyle: undefined,
  imageWrapperStyle: undefined,
  imageComponent: undefined,
})

/**
 * 合并后的图片 style（包含宽高）
 */
const imageStyleFinal = computed(() => {
  return {
    width: props.imageWidth,
    height: props.imageHeight,
    ...props.imageStyle,
  }
})
</script>

<style scoped>
.empty-container {
  min-height: 120px;
}

.empty-svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
