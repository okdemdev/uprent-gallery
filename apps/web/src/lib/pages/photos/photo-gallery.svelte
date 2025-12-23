<script lang="ts">
  import { 
    XSVG, 
    InfoCircleSVG, 
    ExternalLinkSVG,
    CheckSVG, 
    ThumbDownSVG,
    SendSVG,
    ChevronDownSVG,
    DimensionsSVG,
    WandSVG
  } from '~ui/assets'
  import { Button } from '~ui/components'
  import type { BasePropertySchema } from '~core/database/schemas'
  import api from '~api'

  let { property, onClose }: { property: BasePropertySchema; onClose: () => void } = $props()

  // State for actions
  let appliedState = $state<'idle' | 'loading' | 'success' | 'error'>('idle')
  let ignoredState = $state<'idle' | 'loading' | 'success' | 'error'>('idle')
  let showMobileInfo = $state(false)

  // State for AI image cleaning
  let cleaningStates = $state<Map<number, 'idle' | 'loading' | 'done' | 'error'>>(new Map())
  let cleanedImageUrls = $state<Map<number, string>>(new Map())
  let sliderPositions = $state<Map<number, number>>(new Map())
  let failedImages = $state<Set<number>>(new Set())

  function getCleaningState(index: number): 'idle' | 'loading' | 'done' | 'error' {
    return cleaningStates.get(index) ?? 'idle'
  }

  function getCleanedUrl(index: number): string | undefined {
    return cleanedImageUrls.get(index)
  }

  function getSliderPosition(index: number): number {
    return sliderPositions.get(index) ?? 50
  }

  function setSliderPosition(index: number, position: number) {
    const newPositions = new Map(sliderPositions)
    newPositions.set(index, Math.max(0, Math.min(100, position)))
    sliderPositions = newPositions
  }

  function handleImageError(index: number) {
    const newFailed = new Set(failedImages)
    newFailed.add(index)
    failedImages = newFailed
  }

  async function handleCleanImage(imageUrl: string, index: number) {
    const currentState = getCleaningState(index)
    if (currentState === 'loading' || currentState === 'done') return

    // Set loading state
    const newStates = new Map(cleaningStates)
    newStates.set(index, 'loading')
    cleaningStates = newStates

    try {
      // Fetch the original image as a blob
      const imageResponse = await fetch(imageUrl)
      const imageBlob = await imageResponse.blob()

      // Create File object for the API
      const imageFile = new File([imageBlob], 'image.jpg', { type: imageBlob.type })

      // Call API using the Eden client
      const { data, error } = await api.properties.cleanImage.post({ image: imageFile })

      if (error || !data) throw new Error('Failed to clean image')

      // Get the cleaned image from response
      const cleanedBlob = data.cleanedImage as Blob
      
      // Create object URL for display
      const cleanedUrl = URL.createObjectURL(cleanedBlob)
      
      // Update state
      const newUrls = new Map(cleanedImageUrls)
      newUrls.set(index, cleanedUrl)
      cleanedImageUrls = newUrls

      const doneStates = new Map(cleaningStates)
      doneStates.set(index, 'done')
      cleaningStates = doneStates

      // Initialize slider at 50%
      setSliderPosition(index, 50)
    } catch (e) {
      console.error('Error cleaning image:', e)
      const errorStates = new Map(cleaningStates)
      errorStates.set(index, 'error')
      cleaningStates = errorStates
      
      // Reset to idle after showing error
      setTimeout(() => {
        const resetStates = new Map(cleaningStates)
        resetStates.set(index, 'idle')
        cleaningStates = resetStates
      }, 2000)
    }
  }

  // Slider drag handling
  let isDragging = $state<number | null>(null)

  function handleSliderMouseDown(index: number, e: MouseEvent) {
    isDragging = index
    updateSliderFromEvent(index, e)
  }

  function handleSliderTouchStart(index: number, e: TouchEvent) {
    isDragging = index
    updateSliderFromTouch(index, e)
  }

  function handleMouseMove(e: MouseEvent) {
    if (isDragging !== null) {
      updateSliderFromEvent(isDragging, e)
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (isDragging !== null) {
      updateSliderFromTouch(isDragging, e)
    }
  }

  function handleMouseUp() {
    isDragging = null
  }

  function updateSliderFromEvent(index: number, e: MouseEvent) {
    const target = (e.currentTarget as HTMLElement)?.closest('.comparison-container') as HTMLElement
    if (!target) return
    const rect = target.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(index, percentage)
  }

  function updateSliderFromTouch(index: number, e: TouchEvent) {
    const touch = e.touches[0]
    const target = (e.currentTarget as HTMLElement)?.closest('.comparison-container') as HTMLElement
    if (!target) return
    const rect = target.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(index, percentage)
  }

  $effect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'

    // Global mouse/touch handlers for slider
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging !== null) {
        const container = document.querySelector(`[data-image-index="${isDragging}"]`) as HTMLElement
        if (container) {
          const rect = container.getBoundingClientRect()
          const x = e.clientX - rect.left
          const percentage = (x / rect.width) * 100
          setSliderPosition(isDragging, percentage)
        }
      }
    }
    const handleGlobalMouseUp = () => { isDragging = null }
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging !== null) {
        const touch = e.touches[0]
        const container = document.querySelector(`[data-image-index="${isDragging}"]`) as HTMLElement
        if (container) {
          const rect = container.getBoundingClientRect()
          const x = touch.clientX - rect.left
          const percentage = (x / rect.width) * 100
          setSliderPosition(isDragging, percentage)
        }
      }
    }
    const handleGlobalTouchEnd = () => { isDragging = null }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchmove', handleGlobalTouchMove)
    window.addEventListener('touchend', handleGlobalTouchEnd)

    return () => {
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchmove', handleGlobalTouchMove)
      window.removeEventListener('touchend', handleGlobalTouchEnd)
      document.body.style.overflow = ''
      
      // Cleanup object URLs
      cleanedImageUrls.forEach(url => URL.revokeObjectURL(url))
    }
  })

  function formatPrice(price: number | undefined): string {
    if (price === undefined) return 'Price on request'
    return `€ ${price.toLocaleString('nl-NL')}`
  }

  async function handleApply() {
    if (appliedState === 'loading' || appliedState === 'success') return
    appliedState = 'loading'
    try {
      await api.properties.autoApply.post()
      appliedState = 'success'
      setTimeout(onClose, 1000)
    } catch (e) {
      console.error(e)
      appliedState = 'error'
    }
  }

  async function handleNotInterested() {
    if (ignoredState === 'loading' || ignoredState === 'success') return
    ignoredState = 'loading'
    try {
      await api.properties.markAsNotInterested.post()
      ignoredState = 'success'
      setTimeout(onClose, 1000)
    } catch (e) {
        console.error(e)
        ignoredState = 'error'
    }
  }

  function openExternal() {
    window.open(property.sourceURL, '_blank', 'noopener,noreferrer')
  }
</script>

<!-- Full-screen overlay with dark blurred background -->
<div class=".fixed .inset-0 .z-[1000] .bg-black/85 .backdrop-blur-md .flex .flex-col .overflow-hidden">
  
  <!-- Mobile Header (Fixed) - visible on md and below, hidden on desktop -->
  <header class=".hidden md:.block .bg-white .z-20 .absolute .top-0 .left-0 .right-0">
    <!-- Legal Banner -->
    <div class=".flex .items-center .gap-2 .px-3 .py-2 .text-xs .border-b .border-black-100">
      <InfoCircleSVG class=".h-3.5 .w-3.5 .text-black-300 .shrink-0" />
      <span class=".text-gray-600">
        These photos are from <a href={property.sourceURL} target="_blank" class=".text-primary .font-medium">{property.sourceName}</a>
      </span>
    </div>
    
    <!-- Property Info Card -->
    <div class=".flex .items-center .gap-3 .p-3">
      <!-- Thumbnail -->
      <img 
        src={property.imageURLs[0]} 
        alt="Property preview"
        class=".w-12 .h-12 .rounded-lg .object-cover .shrink-0"
      />
      
      <!-- Info -->
      <div class=".flex-1 .min-w-0">
        <h3 class=".font-bold .text-sm .text-black .truncate">{property.title}</h3>
        <p class=".text-xs .text-gray-500">{property.cityName}</p>
        <div class=".flex .items-center .gap-3 .mt-0.5 .text-xs .text-gray-700">
          <span class=".font-semibold">€ {property.price}</span>
          <span class=".flex .items-center .gap-1">
            <DimensionsSVG class=".h-3.5 .w-3.5 .shrink-0" />
            <span>{property.area} m²</span>
          </span>
        </div>
      </div>
      
      <!-- Close Button -->
      <button 
        class=".p-2 .rounded-full .bg-primary .text-white .shrink-0"
        onclick={onClose}
      >
        <XSVG class=".h-5 .w-5" />
      </button>
    </div>
  </header>

  <!-- Desktop: Legal Attribution Banner (Top-Left) - hidden on md and below -->
  <div class=".flex md:.hidden .absolute .top-4 .left-4 .z-30">
    <div class=".bg-white .rounded-lg .shadow-lg .px-3 .py-2 .flex .items-center .gap-2 .text-sm">
      <InfoCircleSVG class=".h-4 .w-4 .text-black-300" />
      <span class=".text-gray-600">
        These photos are from <a href={property.sourceURL} target="_blank" class=".text-primary .font-medium hover:.underline">{property.sourceName}</a>
      </span>
    </div>
  </div>

  <!-- Desktop: Close Button (Top-Right) - hidden on md and below -->
  <div class=".flex md:.hidden .absolute .top-4 .right-4 .z-30">
    <button 
      class=".p-2 .rounded-full .bg-primary .text-white hover:.bg-primary-950 .transition .shadow-lg"
      onclick={onClose}
    >
      <XSVG class=".h-5 .w-5" />
    </button>
  </div>

  <!-- Left Column (Desktop): Compact Property Info Card - hidden on md and below -->
  <div class=".flex md:.hidden .flex-col .fixed .top-16 .left-4 .z-20 .pointer-events-none">
    <div class=".bg-white .rounded-xl .shadow-2xl .overflow-hidden .pointer-events-auto .w-[220px] .ring-1 .ring-black/5">
      <!-- Property Thumbnail -->
      <img 
        src={property.imageURLs[0]} 
        alt="Property preview"
        class=".w-full .h-28 .object-cover"
      />
      
      <!-- Property Info -->
      <div class=".p-4">
        <h3 class=".font-bold .text-base .text-black .leading-tight .truncate">{property.title}</h3>
        <p class=".text-sm .text-gray-500 .mt-1">{property.cityName}</p>
        
        <div class=".flex .items-center .gap-3 .mt-3 .text-sm .text-gray-700">
          <span class=".font-semibold">€ {property.price}</span>
          <span class=".flex .items-center .gap-1">
            <DimensionsSVG class=".h-4 .w-4 .shrink-0" />
            <span>{property.area} m²</span>
          </span>
        </div>
      </div>
    </div>
  </div>

   <!-- Middle Column: Images (Desktop + Mobile) -->
  <div class=".flex-1 .w-full .h-full .overflow-y-auto md:.pb-[140px] .pb-0 md:.pt-[100px] .pt-0 .scrollbar-hide .z-0">
    <div class=".flex .flex-col .gap-6 .p-4 .max-w-4xl .mx-auto .py-12">
      {#each property.imageURLs as imageUrl, index}
        {@const cleaningState = getCleaningState(index)}
        {@const cleanedUrl = getCleanedUrl(index)}
        {@const sliderPos = getSliderPosition(index)}
        {@const isFailed = failedImages.has(index)}
        
        {#if !isFailed}
        <div 
          class=".relative .group"
          class:cleaning-container={cleaningState === 'loading'}
        >
          {#if cleaningState === 'done' && cleanedUrl}
            <!-- Before/After Comparison View -->
            <div 
              class="comparison-container .relative .w-full .rounded-lg .shadow-xl .overflow-hidden .cursor-ew-resize .select-none"
              data-image-index={index}
              onmousedown={(e) => handleSliderMouseDown(index, e)}
              ontouchstart={(e) => handleSliderTouchStart(index, e)}
              role="slider"
              aria-label="Drag to compare before and after"
              aria-valuenow={sliderPos}
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
                style="width: {sliderPos}%"
              >
                <img 
                  src={imageUrl} 
                  alt="Original view {index + 1}"
                  class=".h-full .object-cover .object-left"
                  style="width: {100 / (sliderPos / 100)}%"
                  draggable="false"
                />
              </div>
              
              <!-- Slider Divider Line -->
              <div 
                class=".absolute .top-0 .bottom-0 .w-1 .bg-white .shadow-lg .cursor-ew-resize"
                style="left: calc({sliderPos}% - 2px)"
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
          {:else}
            <!-- Normal Image View -->
            <div class=".relative">
              <img 
                src={imageUrl} 
                alt="Property view {index + 1}"
                class=".w-full .h-auto .rounded-lg .shadow-xl .bg-black .ring-1 .ring-white/10"
                class:cleaning-pulse={cleaningState === 'loading'}
                loading={index > 2 ? 'lazy' : 'eager'}
                onerror={() => handleImageError(index)}
              />
              
              {#if cleaningState === 'loading'}
                <!-- Scanning Animation Overlay -->
                <div class=".absolute .inset-0 .rounded-lg .overflow-hidden .pointer-events-none">
                  <div class="scan-bar"></div>
                </div>
              {/if}
              
              <!-- Clean Button -->
              <button 
                class=".absolute .top-3 .right-3 .flex .items-center .gap-1.5 .py-2 .px-3 .rounded-full .bg-white/90 .text-primary .shadow-lg .opacity-0 group-hover:.opacity-100 md:.opacity-100 .transition-opacity .backdrop-blur-sm hover:.bg-white hover:.scale-105 .transform .duration-200 .text-sm .font-medium"
                class:!.opacity-100={cleaningState === 'loading' || cleaningState === 'error'}
                class:!.bg-primary={cleaningState === 'loading'}
                class:!.text-white={cleaningState === 'loading'}
                class:!.bg-red-error={cleaningState === 'error'}
                class:!.cursor-not-allowed={cleaningState === 'loading'}
                onclick={() => handleCleanImage(imageUrl, index)}
                disabled={cleaningState === 'loading'}
                title="Use AI to remove clutter and personal belongings from this image"
              >
                {#if cleaningState === 'loading'}
                  <div class=".animate-spin">
                    <WandSVG class=".h-4 .w-4" />
                  </div>
                  <span>Removing clutter...</span>
                {:else if cleaningState === 'error'}
                  <WandSVG class=".h-4 .w-4" />
                  <span>Retry</span>
                {:else}
                  <WandSVG class=".h-4 .w-4" />
                  <span>Remove clutter</span>
                {/if}
              </button>
            </div>
          {/if}
        </div>
        {/if}
      {/each}
    </div>
  </div>

  <!-- Desktop: Floating Actions Card (Below Location Card) - hidden on md and below -->
  <div class=".flex md:.hidden .flex-col .fixed .top-[300px] .left-4 .z-20 .pointer-events-none">
    <div class=".bg-white .rounded-xl .shadow-2xl .p-4 .flex .flex-col .gap-3 .pointer-events-auto .w-[220px] .ring-1 .ring-black/5">
      <h3 class=".font-semibold .text-sm .text-black">Interested?</h3>
      
      <div class=".flex .flex-col .gap-2">
        <Button primary onClick={handleApply} disabled={appliedState !== 'idle'} size="sm" wide>
          {#if appliedState === 'idle'}
            <SendSVG slot="icon" />
            Apply
          {:else if appliedState === 'loading'}
            Applying...
          {:else if appliedState === 'success'}
            <CheckSVG slot="icon" />
            Sent!
          {:else}
            Error
          {/if}
        </Button>
        
        <Button outline onClick={openExternal} size="sm" wide>
          <ExternalLinkSVG slot="icon" />
          Open
        </Button>
        
        <Button outline destructive onClick={handleNotInterested} disabled={ignoredState !== 'idle'} size="sm" wide>
          {#if ignoredState === 'idle'}
            <ThumbDownSVG slot="icon" />
            Ignore
          {:else if ignoredState === 'loading'}
            ...
          {:else if ignoredState === 'success'}
            Ignored
          {:else}
            Error
          {/if}
        </Button>
      </div>
    </div>
  </div>

  <!-- Mobile Bottom Sheet Actions (Fixed) - visible on md and below, hidden on desktop -->
  <div class=".hidden md:.block .fixed .bottom-0 .left-0 .right-0 .bg-white .border-t .p-4 .pb-safe .z-30">
        <div class=".flex .flex-col .gap-3">
             <Button primary onClick={handleApply} disabled={appliedState !== 'idle'} size="lg">
                {#if appliedState === 'idle'}
                    <SendSVG slot="icon" />
                    Apply
                {:else if appliedState === 'loading'}
                    Applying...
                {:else if appliedState === 'success'}
                    <CheckSVG slot="icon" />
                    Sent
                {:else}
                    Error
                {/if}
            </Button>
             <div class=".grid .grid-cols-2 .gap-3">
                 <Button outline onClick={openExternal}>
                    <ExternalLinkSVG slot="icon" />
                    Open
                </Button>
                <Button outline destructive onClick={handleNotInterested} disabled={ignoredState !== 'idle'}>
                     <ThumbDownSVG slot="icon" />
                     Ignore
                </Button>
            </div>
        </div>
  </div>

</div>

<style>
  /* Hide scrollbar for Chrome, Safari and Opera */
  :global(.scrollbar-hide::-webkit-scrollbar) {
      display: none;
  }
  /* Hide scrollbar for IE, Edge and Firefox */
  :global(.scrollbar-hide) {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
  }

  /* AI Image Cleaning Animations */
  
  /* Scanning bar that moves left to right */
  .scan-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent,
      rgba(189, 46, 79, 0.3),
      rgba(189, 46, 79, 0.8),
      rgba(189, 46, 79, 0.3),
      transparent
    );
    box-shadow: 
      0 0 20px rgba(189, 46, 79, 0.8),
      0 0 40px rgba(189, 46, 79, 0.5),
      0 0 60px rgba(189, 46, 79, 0.3);
    animation: scan 2s ease-in-out infinite;
  }

  @keyframes scan {
    0% {
      left: -10%;
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      left: 110%;
      opacity: 0;
    }
  }

  /* Pulsing glow border around image during cleaning */
  :global(.cleaning-pulse) {
    animation: pulse-glow 1.5s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 
        0 0 5px rgba(189, 46, 79, 0.5),
        0 0 10px rgba(189, 46, 79, 0.3),
        inset 0 0 5px rgba(189, 46, 79, 0.1);
    }
    50% {
      box-shadow: 
        0 0 15px rgba(189, 46, 79, 0.8),
        0 0 30px rgba(189, 46, 79, 0.5),
        inset 0 0 10px rgba(189, 46, 79, 0.2);
    }
  }

  /* Comparison container styling */
  :global(.comparison-container) {
    touch-action: none;
  }
</style>

