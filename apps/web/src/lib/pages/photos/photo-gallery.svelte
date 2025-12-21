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
<div class=".fixed .inset-0 .z-[1000] .bg-black/90 .flex .flex-col">
  <!-- Header section - single horizontal row -->
  <header class=".flex .items-start .gap-2 .p-2 .shrink-0 md:.p-4">
    
    <!-- Property info card (compact, stacked) -->
    <div class=".flex .flex-col .gap-2 .p-2 .bg-white .rounded-lg .shadow-lg .shrink-0 .border .border-gray-200 .min-w-[124px]">
      <div class=".font-bold .text-xs .text-gray-900 .leading-tight md:.text-sm">{property.title}</div>
      
      <div class=".flex .gap-2 .items-start">
        <img 
          src={property.previewImageURL} 
          alt={property.title}
          class=".w-12 .h-12 .object-cover .rounded .shrink-0"
        />
        <div class=".flex .flex-col .justify-between .h-12 .text-[10px] .text-gray-500 md:.text-xs">
          <div class=".truncate .max-w-[100px]">{property.cityName}</div>
          <div class=".font-bold .text-gray-900">{formatPrice(property.price)}</div>
          <div class=".items-center .flex .gap-1">
            <span class=".text-[8px]">📐</span>
            <span>{property.area} m²</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Legal banner -->
    <div 
      class=".flex .shrink .items-center .gap-2 .rounded .border .border-gray-200 .bg-gray-50 .p-2 .px-3"
      role="group"
      onmouseenter={() => showDisclaimer = true}
      onmouseleave={() => showDisclaimer = false}
    >
      <InfoCircleSVG class=".h-3 .w-3 .shrink-0 .text-gray-500" />
      <span class=".break-words .text-left .text-[10px]">These photos are from <a href={property.sourceURL} target="_blank" rel="noopener noreferrer" class=".text-primary .underline">{property.sourceName}</a></span>
    </div>

    <!-- Close button - far right -->
    <button 
      class=".ml-auto .flex .items-center .justify-center .h-8 .w-8 .rounded-full .bg-red-500 .text-white .border-0 .cursor-pointer .shrink-0 hover:.bg-red-600"
      onclick={onClose}
      aria-label="Close gallery"
    >
      <XSVG class=".h-4 .w-4" />
    </button>
  </header>

  <!-- Scrollable images section -->
  <main class=".flex-1 .overflow-y-auto .px-2 .pb-2 md:.px-4 md:.pb-4">
    <div class=".flex .flex-col .items-center .gap-3 .max-w-4xl .mx-auto md:.gap-4">
      {#each property.imageURLs as imageUrl, index}
        <img 
          src={imageUrl} 
          alt="Property image {index + 1} of {property.imageURLs.length}"
          class=".w-full .object-contain .rounded-lg .shadow-2xl md:.rounded-xl"
        />
      {/each}
    </div>
  </main>
</div>
