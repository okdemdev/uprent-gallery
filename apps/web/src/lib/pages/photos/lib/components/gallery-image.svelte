<script lang="ts">
  /**
   * Gallery image component with AI cleaning functionality.
   * Displays a single image with a "Remove clutter" button and loading states.
   */
  import { WandSVG } from '~ui/assets'
  import type { CleaningState } from '../state/gallery-state.svelte'
  import ImageComparisonSlider from './image-comparison-slider.svelte'
  import api from '~api'

  let { 
    imageUrl, 
    index,
    cleaningState = $bindable('idle'),
    cleanedUrl = $bindable(undefined),
    onImageError
  }: { 
    imageUrl: string
    index: number
    cleaningState: CleaningState
    cleanedUrl: string | undefined
    onImageError: (index: number) => void
  } = $props()

  async function handleCleanImage() {
    if (cleaningState === 'loading' || cleaningState === 'done') return

    cleaningState = 'loading'

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
      cleanedUrl = URL.createObjectURL(cleanedBlob)
      cleaningState = 'done'
    } catch (e) {
      console.error('Error cleaning image:', e)
      cleaningState = 'error'
      
      // Reset to idle after showing error
      setTimeout(() => {
        cleaningState = 'idle'
      }, 2000)
    }
  }

  function handleError() {
    onImageError(index)
  }
</script>

<div 
  class=".relative .group"
  class:cleaning-container={cleaningState === 'loading'}
>
  {#if cleaningState === 'done' && cleanedUrl}
    <!-- Before/After Comparison View -->
    <ImageComparisonSlider 
      originalUrl={imageUrl} 
      {cleanedUrl} 
      {index} 
    />
  {:else}
    <!-- Normal Image View -->
    <div class=".relative">
      <img 
        src={imageUrl} 
        alt="Property view {index + 1}"
        class=".w-full .h-auto .rounded-lg .shadow-xl .bg-black .ring-1 .ring-white/10"
        class:cleaning-pulse={cleaningState === 'loading'}
        loading={index > 2 ? 'lazy' : 'eager'}
        onerror={handleError}
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
        onclick={handleCleanImage}
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

<style>
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
</style>
