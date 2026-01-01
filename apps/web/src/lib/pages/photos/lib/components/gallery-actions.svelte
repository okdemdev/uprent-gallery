<script lang="ts">
  import { Button } from '~ui/components'
  import { 
    ExternalLinkSVG,
    CheckSVG, 
    ThumbDownSVG,
    SendSVG
  } from '~ui/assets'
  import type { BasePropertySchema } from '~core/database/schemas'
  import type { ActionState } from '../state/gallery-state.svelte'
  import api from '~api'

  let { 
    property, 
    variant = 'desktop',
    appliedState = $bindable('idle'),
    ignoredState = $bindable('idle'),
    onClose 
  }: { 
    property: BasePropertySchema
    variant?: 'mobile' | 'desktop'
    appliedState: ActionState
    ignoredState: ActionState
    onClose: () => void 
  } = $props()

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

{#if variant === 'mobile'}
  <!-- Mobile Bottom Sheet Actions -->
  <div class=".flex .flex-col .gap-2">
    <Button primary onClick={handleApply} disabled={appliedState !== 'idle'} class=".w-full">
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
    <div class=".grid .grid-cols-2 .gap-2">
      <Button subtle onClick={openExternal}>
        <ExternalLinkSVG slot="icon" />
        Open
      </Button>
      <Button subtle onClick={handleNotInterested} disabled={ignoredState !== 'idle'}>
        <ThumbDownSVG slot="icon" />
        Ignore
      </Button>
    </div>
  </div>
{:else}
  <!-- Desktop Floating Actions Card -->
  <div class=".bg-white .rounded-xl .shadow-2xl .p-4 .flex .flex-col .gap-3 .pointer-events-auto .w-[220px] .ring-1 .ring-black/5">
    <h3 class=".font-semibold .text-sm .text-black">Interested?</h3>
    
    <div class=".flex .flex-col .gap-2">
      <Button primary onClick={handleApply} disabled={appliedState !== 'idle'} class=".w-full .h-8 .text-xs">
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
      
      <Button subtle onClick={openExternal} class=".w-full .h-8 .text-xs">
        <ExternalLinkSVG slot="icon" />
        Open
      </Button>
      
      <Button subtle onClick={handleNotInterested} disabled={ignoredState !== 'idle'} class=".w-full .h-8 .text-xs">
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
{/if}
