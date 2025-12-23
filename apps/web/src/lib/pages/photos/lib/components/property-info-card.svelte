<script lang="ts">
  import { DimensionsSVG } from '~ui/assets'
  import type { BasePropertySchema } from '~core/database/schemas'

  let { 
    property, 
    variant = 'desktop',
    onClose 
  }: { 
    property: BasePropertySchema
    variant?: 'mobile' | 'desktop'
    onClose?: () => void 
  } = $props()
</script>

{#if variant === 'mobile'}
  <!-- Mobile Property Info Card (inside header) -->
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
  </div>
{:else}
  <!-- Desktop Floating Property Info Card -->
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
{/if}
