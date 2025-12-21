<script lang="ts">
  import { Button } from '~ui/components'
  import { EyeSVG } from '~ui/assets'
  import { mockProperty } from './lib/mock-property'
  import PhotoGallery from './photo-gallery.svelte'

  let showGallery = $state(false)

  function openGallery() {
    showGallery = true
  }

  function closeGallery() {
    showGallery = false
  }
</script>

<div class=".flex .h-full .items-center .justify-center">
  <Button primary onClick={openGallery}>
    <EyeSVG slot="icon" />
    View gallery
  </Button>
</div>

{#if showGallery}
  <PhotoGallery property={mockProperty} onClose={closeGallery} />
{/if}
