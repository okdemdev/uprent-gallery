<script lang="ts">
  /**
   * Before/After image comparison slider component.
   * Allows users to drag a divider to compare original and cleaned images.
   */

  let { 
    originalUrl, 
    cleanedUrl, 
    index 
  }: { 
    originalUrl: string
    cleanedUrl: string
    index: number 
  } = $props()

  let sliderPosition = $state(50)
  let isDragging = $state(false)

  function handleMouseDown(e: MouseEvent) {
    isDragging = true
    updateSliderFromEvent(e)
  }

  function handleTouchStart(e: TouchEvent) {
    isDragging = true
    updateSliderFromTouch(e)
  }

  function updateSliderFromEvent(e: MouseEvent) {
    const target = (e.currentTarget as HTMLElement)?.closest('.comparison-container') as HTMLElement
    if (!target) return
    const rect = target.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    sliderPosition = Math.max(0, Math.min(100, percentage))
  }

  function updateSliderFromTouch(e: TouchEvent) {
    const touch = e.touches[0]
    const target = (e.currentTarget as HTMLElement)?.closest('.comparison-container') as HTMLElement
    if (!target) return
    const rect = target.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const percentage = (x / rect.width) * 100
    sliderPosition = Math.max(0, Math.min(100, percentage))
  }

  $effect(() => {
    if (!isDragging) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = document.querySelector(`[data-image-index="${index}"]`) as HTMLElement
      if (container) {
        const rect = container.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percentage = (x / rect.width) * 100
        sliderPosition = Math.max(0, Math.min(100, percentage))
      }
    }

    const handleGlobalTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const container = document.querySelector(`[data-image-index="${index}"]`) as HTMLElement
      if (container) {
        const rect = container.getBoundingClientRect()
        const x = touch.clientX - rect.left
        const percentage = (x / rect.width) * 100
        sliderPosition = Math.max(0, Math.min(100, percentage))
      }
    }

    const handleEnd = () => { isDragging = false }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleGlobalTouchMove)
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleGlobalTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  })
</script>

<div 
  class="comparison-container .relative .w-full .rounded-lg .shadow-xl .overflow-hidden .cursor-ew-resize .select-none"
  data-image-index={index}
  onmousedown={handleMouseDown}
  ontouchstart={handleTouchStart}
  role="slider"
  aria-label="Drag to compare before and after"
  aria-valuenow={sliderPosition}
  tabindex="0"
>
  <!-- Cleaned Image (Full width, behind) -->
  <img 
    src={cleanedUrl} 
    alt="Cleaned view {index + 1}"
    class=".w-full .h-auto .block"
    draggable="false"
  />
  
  <!-- Original Image (Clipped by slider position) -->
  <div 
    class=".absolute .inset-0 .overflow-hidden"
    style="width: {sliderPosition}%"
  >
    <img 
      src={originalUrl} 
      alt="Original view {index + 1}"
      class=".h-full .object-cover .object-left"
      style="width: {100 / (sliderPosition / 100)}%"
      draggable="false"
    />
  </div>
  
  <!-- Slider Divider Line -->
  <div 
    class=".absolute .top-0 .bottom-0 .w-1 .bg-white .shadow-lg .cursor-ew-resize"
    style="left: calc({sliderPosition}% - 2px)"
  >
    <!-- Slider Handle -->
    <div class=".absolute .top-1/2 .-translate-y-1/2 .-translate-x-1/2 .left-1/2 .w-8 .h-8 .bg-white .rounded-full .shadow-lg .flex .items-center .justify-center .border-2 .border-primary">
      <div class=".flex .gap-0.5">
        <div class=".w-0.5 .h-3 .bg-primary .rounded-full"></div>
        <div class=".w-0.5 .h-3 .bg-primary .rounded-full"></div>
      </div>
    </div>
  </div>
  
  <!-- Labels -->
  <div class=".absolute .bottom-3 .left-3 .bg-black/70 .text-white .text-xs .px-2 .py-1 .rounded .pointer-events-none">
    Before
  </div>
  <div class=".absolute .bottom-3 .right-3 .bg-primary/90 .text-white .text-xs .px-2 .py-1 .rounded .pointer-events-none">
    After ✨
  </div>
</div>

<style>
  /* Comparison container styling */
  :global(.comparison-container) {
    touch-action: none;
  }
</style>
