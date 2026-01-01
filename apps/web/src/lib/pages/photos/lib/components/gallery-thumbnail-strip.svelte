<script lang="ts">
  /**
   * Thumbnail navigation panel for the photo gallery.
   * Desktop: Vertical scrollable panel on right side
   * Mobile: Horizontal scrollable strip for bottom sheet
   */
  
  let { 
    imageURLs,
    currentIndex = 0,
    failedIndices = new Set<number>(),
    variant = 'desktop',
    onThumbnailClick
  }: { 
    imageURLs: string[]
    currentIndex: number
    failedIndices: Set<number>
    variant: 'desktop' | 'mobile'
    onThumbnailClick: (index: number) => void
  } = $props()

  let scrollContainer: HTMLDivElement

  // Auto-scroll to keep current thumbnail visible
  $effect(() => {
    if (!scrollContainer) return
    
    const thumbnailSize = variant === 'desktop' ? 64 : 56 // width/height + gap
    const containerSize = variant === 'desktop' 
      ? scrollContainer.clientHeight 
      : scrollContainer.clientWidth
    const scrollPosition = currentIndex * thumbnailSize - (containerSize / 2) + (thumbnailSize / 2)
    
    if (variant === 'desktop') {
      scrollContainer.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      })
    } else {
      scrollContainer.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      })
    }
  })

  // Filter out failed images
  const validImages = $derived(
    imageURLs.map((url, index) => ({ url, index }))
      .filter(({ index }) => !failedIndices.has(index))
  )

  // Get current position in valid images (1-indexed for display)
  const currentPosition = $derived(
    validImages.findIndex(({ index }) => index === currentIndex) + 1
  )
</script>

{#if variant === 'desktop'}
  <!-- Desktop: Floating vertical thumbnails -->
  <div class=".flex .flex-col .items-center .gap-2 .pointer-events-auto">
    <!-- Counter badge -->
    <div class=".bg-white/90 .backdrop-blur-sm .rounded-full .px-2.5 .py-1 .shadow-lg .text-xs .font-semibold .text-black .ring-1 .ring-black/5">
      {currentPosition > 0 ? currentPosition : 1}/{validImages.length}
    </div>
    
    <!-- Scrollable floating thumbnails -->
    <div 
      bind:this={scrollContainer}
      class=".flex .flex-col .gap-2 .overflow-y-auto .scrollbar-hide .max-h-[calc(100vh-140px)] .p-1"
    >
      {#each validImages as { url, index }}
        <button
          class="thumbnail .shrink-0 .w-14 .h-14 .rounded-xl .overflow-hidden .transition-all .duration-200 .shadow-lg .bg-black .outline-none"
          class:active={index === currentIndex}
          onclick={() => onThumbnailClick(index)}
          title="Go to image {index + 1}"
        >
          <img 
            src={url} 
            alt="Thumbnail {index + 1}"
            class=".w-full .h-full .object-cover"
            loading="lazy"
          />
        </button>
      {/each}
    </div>
  </div>
{:else}
  <!-- Mobile: Horizontal scrollable strip -->
  <div class=".flex .flex-col .gap-1.5">
    <!-- Counter -->
    <div class=".flex .items-center .justify-between .px-1">
      <span class=".text-xs .font-semibold .text-black">Photos</span>
      <span class=".text-xs .font-medium .text-black-300">{currentPosition > 0 ? currentPosition : 1}/{validImages.length}</span>
    </div>
    
    <!-- Scrollable thumbnails -->
    <div 
      bind:this={scrollContainer}
      class=".flex .gap-2 .overflow-x-auto .scrollbar-hide .p-1"
    >
      {#each validImages as { url, index }}
        <button
          class="thumbnail .shrink-0 .w-12 .h-12 .rounded-lg .overflow-hidden .transition-all .duration-200 .outline-none"
          class:active={index === currentIndex}
          onclick={() => onThumbnailClick(index)}
          title="Go to image {index + 1}"
        >
          <img 
            src={url} 
            alt="Thumbnail {index + 1}"
            class=".w-full .h-full .object-cover"
            loading="lazy"
          />
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .thumbnail {
    box-shadow: 0 0 0 2px transparent;
  }
  
  .thumbnail.active {
    box-shadow: 0 0 0 2px #bd2e4f;
    transform: scale(1.05);
  }
  
  .thumbnail:hover:not(.active) {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
  }
  
  .thumbnail:focus {
    outline: none;
  }
  
  /* Hide scrollbar */
  :global(.scrollbar-hide::-webkit-scrollbar) {
    display: none;
  }
  :global(.scrollbar-hide) {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
