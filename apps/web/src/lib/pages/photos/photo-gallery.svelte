<script lang="ts">
  import { 
    XSVG, 
    InfoCircleSVG, 
    ExternalLinkSVG,
    CheckSVG, 
    ThumbDownSVG,
    SendSVG,
    ChevronDownSVG
  } from '~ui/assets'
  import { Button } from '~ui/components'
  import type { BasePropertySchema } from '~core/database/schemas'

  let { property, onClose }: { property: BasePropertySchema; onClose: () => void } = $props()

  // State for actions
  let appliedState = $state<'idle' | 'loading' | 'success' | 'error'>('idle')
  let ignoredState = $state<'idle' | 'loading' | 'success' | 'error'>('idle')
  let showMobileInfo = $state(false)

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

  async function handleApply() {
    if (appliedState === 'loading' || appliedState === 'success') return
    appliedState = 'loading'
    try {
      await fetch('properties/autoApply', { method: 'POST' })
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
      await fetch('properties/markAsNotInterested', { method: 'POST' })
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
    <div class=".flex .items-center .gap-2 .px-3 .py-2 .text-xs .border-b .border-gray-100">
      <InfoCircleSVG class=".h-3.5 .w-3.5 .text-gray-400 .shrink-0" />
      <span class=".text-gray-600">
        These photos are from <a href={property.sourceURL} target="_blank" class=".text-red-500 .font-medium">{property.sourceName}</a>
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
        <h3 class=".font-bold .text-sm .text-gray-900 .truncate">{property.title}</h3>
        <p class=".text-xs .text-gray-500">{property.cityName}</p>
        <div class=".flex .items-center .gap-3 .mt-0.5 .text-xs .text-gray-700">
          <span class=".font-semibold">€ {property.price}</span>
          <span>⌂ {property.area} m²</span>
        </div>
      </div>
      
      <!-- Close Button -->
      <button 
        class=".p-2 .rounded-full .bg-gray-100 .text-gray-600 .shrink-0"
        onclick={onClose}
      >
        <XSVG class=".h-5 .w-5" />
      </button>
    </div>
  </header>

  <!-- Desktop: Legal Attribution Banner (Top-Left) - hidden on md and below -->
  <div class=".flex md:.hidden .absolute .top-4 .left-4 .z-30">
    <div class=".bg-white .rounded-lg .shadow-lg .px-3 .py-2 .flex .items-center .gap-2 .text-sm">
      <InfoCircleSVG class=".h-4 .w-4 .text-gray-400" />
      <span class=".text-gray-600">
        These photos are from <a href={property.sourceURL} target="_blank" class=".text-red-500 .font-medium hover:.underline">{property.sourceName}</a>
      </span>
    </div>
  </div>

  <!-- Desktop: Close Button (Top-Right) - hidden on md and below -->
  <div class=".flex md:.hidden .absolute .top-4 .right-4 .z-30">
    <button 
      class=".p-2 .rounded-full .bg-red-500 .text-white hover:.bg-red-600 .transition .shadow-lg"
      onclick={onClose}
    >
      <XSVG class=".h-5 .w-5" />
    </button>
  </div>

  <!-- Left Column (Desktop): Compact Property Info Card - hidden on md and below -->
  <div class=".flex md:.hidden .flex-col .fixed .top-16 .left-4 .z-20 .pointer-events-none">
    <div class=".bg-white .rounded-xl .shadow-2xl .overflow-hidden .pointer-events-auto .w-[180px] .ring-1 .ring-black/5">
      <!-- Property Thumbnail -->
      <img 
        src={property.imageURLs[0]} 
        alt="Property preview"
        class=".w-full .h-20 .object-cover"
      />
      
      <!-- Property Info -->
      <div class=".p-3">
        <h3 class=".font-bold .text-sm .text-gray-900 .leading-tight .truncate">{property.title}</h3>
        <p class=".text-xs .text-gray-500 .mt-0.5">{property.cityName}</p>
        
        <div class=".flex .items-center .gap-3 .mt-2 .text-xs .text-gray-700">
          <span class=".font-semibold">€ {property.price}</span>
          <span class=".flex .items-center .gap-1">
            <span>⌂</span>
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
        <img 
          src={imageUrl} 
          alt="Property view {index + 1}"
          class=".w-full .h-auto .rounded-lg .shadow-xl .bg-gray-900 .ring-1 .ring-white/10"
          loading={index > 2 ? 'lazy' : 'eager'}
        />
      {/each}
    </div>
  </div>

  <!-- Right Column (Desktop): Compact Floating Actions Card - hidden on md and below -->
  <div class=".flex md:.hidden .flex-col .fixed .top-16 .right-4 .z-20 .pointer-events-none">
    <div class=".bg-white .rounded-xl .shadow-2xl .p-4 .flex .flex-col .gap-3 .pointer-events-auto .w-[200px] .ring-1 .ring-black/5">
      <h3 class=".font-semibold .text-sm .text-gray-900">Interested?</h3>
      
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
</style>

