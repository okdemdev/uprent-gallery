<script lang="ts">
  import { XSVG, InfoCircleSVG } from '~ui/assets'
  import type { BasePropertySchema } from '~core/database/schemas'

  let { property, onClose }: { property: BasePropertySchema; onClose: () => void } = $props()

  let showDisclaimer = $state(false)

  $effect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
    }
  })

  function formatPrice(price: number | undefined): string {
    if (price === undefined) return 'Price on request'
    return `€ ${price.toLocaleString('nl-NL')}`
  }
</script>

<!-- Full-screen overlay -->
<div class=".fixed .inset-0 .z-[1000] .bg-black/90">
  <!-- Fixed left panel (property card + legal banner) -->
  <div class=".fixed .top-4 .left-4 .z-[1010] .flex .flex-col .gap-2 sm:.flex-row sm:.items-start sm:.gap-3">
    <!-- Property info card -->
    <div class=".flex .gap-3 .p-3 .bg-white .rounded-lg .shadow-lg .w-max">
      <img 
        src={property.previewImageURL} 
        alt={property.title}
        class=".w-10 .h-10 .object-cover .rounded .shrink-0"
      />
      <div class=".flex .flex-col .min-w-0">
        <span class=".text-sm .font-semibold .text-gray-900 .leading-tight">{property.title}</span>
        <span class=".text-xs .text-gray-400 .leading-tight">{property.cityName}</span>
        <div class=".flex .items-center .gap-2 .mt-1 .text-xs .text-gray-600">
          <span class=".font-semibold .text-gray-900">{formatPrice(property.price)}</span>
          <span class=".text-gray-400">📐 {property.area} m²</span>
        </div>
      </div>
    </div>

    <!-- Legal banner with hover tooltip -->
    <div 
      class=".relative .bg-white .rounded-lg .shadow-lg .p-3 .cursor-default"
      role="group"
      onmouseenter={() => showDisclaimer = true}
      onmouseleave={() => showDisclaimer = false}
    >
      <div class=".flex .items-center .gap-2 .text-xs .text-gray-600">
        <InfoCircleSVG class=".h-4 .w-4 .text-red-400 .shrink-0" />
        <span>These photos are from <a href={property.sourceURL} target="_blank" rel="noopener noreferrer" class=".text-red-500 .font-medium hover:.underline">{property.sourceName}</a></span>
      </div>
      
      <!-- Tooltip disclaimer (absolute, no layout shift) -->
      {#if showDisclaimer}
        <div class=".absolute .top-full .left-0 .mt-2 .p-3 .bg-white .rounded-lg .shadow-xl .text-xs .text-gray-500 .leading-relaxed .w-64 .z-[1020]">
          The property images shown are embedded from publicly available third-party sources. 
          Uprent does not host, store, or claim ownership of these images.
        </div>
      {/if}
    </div>
  </div>

  <!-- Fixed close button -->
  <button 
    class=".fixed .top-4 .right-4 .z-[1010] .flex .items-center .justify-center .h-10 .w-10 .rounded-full .bg-red-500 .text-white .border-0 .cursor-pointer .transition-colors .shadow-lg hover:.bg-red-600"
    onclick={onClose}
    aria-label="Close gallery"
  >
    <XSVG class=".h-5 .w-5" />
  </button>

  <!-- Scrollable images section (starts from top) -->
  <div class=".absolute .inset-0 .overflow-y-auto .pt-4 .px-4 .pb-4">
    <div class=".flex .flex-col .items-center .gap-4 .max-w-4xl .mx-auto">
      {#each property.imageURLs as imageUrl, index}
        <img 
          src={imageUrl} 
          alt="Property image {index + 1} of {property.imageURLs.length}"
          class=".w-full .object-contain .rounded-xl .shadow-2xl"
        />
      {/each}
    </div>
  </div>
</div>
