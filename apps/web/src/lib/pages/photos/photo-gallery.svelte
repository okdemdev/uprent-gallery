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
<div class=".fixed .inset-0 .z-[1000] .bg-black/80 .backdrop-blur-md .flex .flex-col md:.flex-row .overflow-hidden">
  
  <!-- Mobile Header (Fixed) -->
  <header class=".flex .md:hidden .items-center .justify-between .p-3 .bg-white/90 .backdrop-blur .border-b .z-20 .absolute .top-0 .left-0 .right-0">
     <div class=".flex .flex-col">
        <span class=".font-bold .text-sm .text-gray-900">{property.cityName}</span>
        <span class=".text-xs .text-gray-500">{formatPrice(property.price)}</span>
     </div>
     <button 
      class=".p-2 .rounded-full .bg-gray-100 .text-gray-600"
      onclick={onClose}
    >
      <XSVG class=".h-5 .w-5" />
    </button>
  </header>

   <!-- Left Column: Property Info (Desktop) -->
   <div class=".hidden .md:flex .flex-col .w-[360px] .shrink-0 .p-6 .gap-6 .h-full .overflow-y-auto">
      
      <!-- Info Card -->
      <div class=".bg-white .rounded-2xl .shadow-lg .overflow-hidden .flex .flex-col">
          <div class=".p-6 .flex .flex-col .gap-4">
              <div>
                  <h2 class=".font-bold .text-xl .text-gray-900 .leading-tight">{property.title}</h2>
                  <div class=".text-gray-500 .mt-1">{property.cityName}</div>
              </div>
              
              <div class=".flex .items-baseline .gap-2">
                 <span class=".text-2xl .font-bold .text-gray-900">{formatPrice(property.price)}</span>
                 <span class=".text-sm .text-gray-500">/month</span>
              </div>

              <div class=".grid .grid-cols-2 .gap-y-4 .gap-x-2 .text-sm .pt-2 .border-t .border-gray-100">
                 <div class=".flex .flex-col">
                    <span class=".text-xs .text-gray-400 .uppercase .tracking-wider">Area</span>
                    <span class=".font-medium .text-gray-900">{property.area} m²</span>
                 </div>
                 <div class=".flex .flex-col">
                    <span class=".text-xs .text-gray-400 .uppercase .tracking-wider">Rooms</span>
                    <span class=".font-medium .text-gray-900">{property.extraFields?.rooms ?? '-'}</span>
                 </div>
                 <div class=".flex .flex-col">
                    <span class=".text-xs .text-gray-400 .uppercase .tracking-wider">Interior</span>
                    <span class=".font-medium .text-gray-900">{property.extraFields?.interior ?? '-'}</span>
                 </div>
                 <div class=".flex .flex-col">
                    <span class=".text-xs .text-gray-400 .uppercase .tracking-wider">Available</span>
                    <span class=".font-medium .text-gray-900">{property.extraFields?.availableSince ?? 'Now'}</span>
                 </div>
              </div>
          </div>
          
           <!-- Legal Footer in Left Card -->
           <div class=".bg-gray-50 .p-4 .text-xs .text-gray-500 .border-t .border-gray-100 .flex .gap-2">
              <InfoCircleSVG class=".h-4 .w-4 .shrink-0 .mt-0.5" />
              <span>
                  Photos from <a href={property.sourceURL} target="_blank" class=".underline .hover:.text-gray-700">{property.sourceName}</a>
              </span>
           </div>
      </div>

   </div>

   <!-- Middle Column: Images (Desktop) | Full Content (Mobile) -->
  <div class=".flex-1 .h-full .overflow-y-auto .pb-[120px] md:.pb-0 .pt-[60px] md:.pt-0 .scrollbar-hide">
    <div class=".flex .flex-col .gap-4 .p-4 .max-w-4xl .mx-auto .md:py-8">
      {#each property.imageURLs as imageUrl, index}
        <img 
          src={imageUrl} 
          alt="Property view {index + 1}"
          class=".w-full .h-auto .rounded-lg .shadow-lg .bg-gray-800"
          loading={index > 2 ? 'lazy' : 'eager'}
        />
      {/each}
    </div>
  </div>

  <!-- Right Column: Actions (Desktop) -->
  <div class=".hidden .md:flex .flex-col .w-[320px] .shrink-0 .p-6 .gap-6 .h-full">
     
     <!-- Close Button -->
     <div class=".flex .justify-end">
        <button 
          class=".p-2 .rounded-full .bg-white/10 .text-white .hover:.bg-white/20 .transition"
          onclick={onClose}
        >
          <XSVG class=".h-6 .w-6" />
        </button>
     </div>

     <!-- Actions Card -->
     <div class=".bg-white .rounded-2xl .shadow-lg .p-5 .flex .flex-col .gap-4">
        <h3 class=".font-bold .text-gray-900">Actions</h3>
        
        <div class=".flex .flex-col .gap-3">
             <Button primary onClick={handleApply} disabled={appliedState !== 'idle'} size="lg">
                {#if appliedState === 'idle'}
                    <SendSVG slot="icon" />
                    Apply Now
                {:else if appliedState === 'loading'}
                    Applying...
                {:else if appliedState === 'success'}
                    <CheckSVG slot="icon" />
                    Sent!
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
  </div>

  <!-- Mobile Bottom Sheet Actions (Fixed) -->
  <div class=".md:hidden .fixed .bottom-0 .left-0 .right-0 .bg-white .border-t .p-4 .pb-safe .z-30">
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
