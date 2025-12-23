<script lang="ts">
  /**
   * Photo Gallery Component
   * 
   * Full-screen overlay for viewing property photos with:
   * - AI-powered image cleaning
   * - Desktop floating cards layout
   * - Mobile responsive bottom sheet actions
   */
  import { 
    XSVG, 
    InfoCircleSVG
  } from '~ui/assets'
  import type { BasePropertySchema } from '~core/database/schemas'
  import { createGalleryState } from './lib/state/gallery-state.svelte'
  import GalleryImage from './lib/components/gallery-image.svelte'
  import GalleryActions from './lib/components/gallery-actions.svelte'
  import PropertyInfoCard from './lib/components/property-info-card.svelte'

  let { property, onClose }: { property: BasePropertySchema; onClose: () => void } = $props()

  // Initialize gallery state
  const galleryState = createGalleryState()

  // Setup keyboard handling and body overflow lock
  $effect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
      galleryState.cleanup()
    }
  })

  function handleImageError(index: number) {
    galleryState.markImageFailed(index)
  }

  // Reactive getters for state
  function getCleaningState(index: number) {
    return galleryState.getCleaningState(index)
  }

  function getCleanedUrl(index: number) {
    return galleryState.getCleanedUrl(index)
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
    
    <!-- Property Info with Close Button -->
    <div class=".flex .items-center .justify-between .pr-3">
      <PropertyInfoCard {property} variant="mobile" />
      
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
    <PropertyInfoCard {property} variant="desktop" />
  </div>

   <!-- Middle Column: Images (Desktop + Mobile) -->
  <div class=".flex-1 .w-full .h-full .overflow-y-auto md:.pb-[140px] .pb-0 md:.pt-[100px] .pt-0 .scrollbar-hide .z-0">
    <div class=".flex .flex-col .gap-6 .p-4 .max-w-4xl .mx-auto .py-12">
      {#each property.imageURLs as imageUrl, index}
        {@const isFailed = galleryState.isImageFailed(index)}
        {@const cleaningState = getCleaningState(index)}
        {@const cleanedUrl = getCleanedUrl(index)}
        
        {#if !isFailed}
          <GalleryImage 
            {imageUrl} 
            {index}
            cleaningState={cleaningState}
            cleanedUrl={cleanedUrl}
            onImageError={handleImageError}
          />
        {/if}
      {/each}
    </div>
  </div>

  <!-- Desktop: Floating Actions Card (Below Property Card) - hidden on md and below -->
  <div class=".flex md:.hidden .flex-col .fixed .top-[300px] .left-4 .z-20 .pointer-events-none">
    <GalleryActions 
      {property} 
      variant="desktop" 
      bind:appliedState={galleryState.appliedState}
      bind:ignoredState={galleryState.ignoredState}
      {onClose} 
    />
  </div>

  <!-- Mobile Bottom Sheet Actions (Fixed) - visible on md and below, hidden on desktop -->
  <div class=".hidden md:.block .fixed .bottom-0 .left-0 .right-0 .bg-white .border-t .p-3 .pb-safe .z-30">
    <GalleryActions 
      {property} 
      variant="mobile" 
      bind:appliedState={galleryState.appliedState}
      bind:ignoredState={galleryState.ignoredState}
      {onClose} 
    />
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
</style>
