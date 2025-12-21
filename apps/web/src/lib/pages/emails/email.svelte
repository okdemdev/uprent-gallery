<script lang="ts">
  import dayjs from 'dayjs'
  import type { Email } from '~core/database'
  import { LoadingSpinnerSVG, ChevronDownSVG } from '~ui/assets'
  import api from '~api'

  let { email }: { email: Email } = $props()

  let expanded = $state(false)
  let loading = $state(false)
  let content = $state<string | null>(null)
  let error = $state<string | null>(null)

  async function toggleExpand() {
    if (expanded) {
      expanded = false
      return
    }

    expanded = true

    // Only fetch if we haven't already
    if (content === null && !loading) {
      loading = true
      error = null

      try {
        const { data, error: apiError } = await api.emails({ uid: email.uid }).body.get()

        if (apiError) {
          error = 'Failed to load email content'
          console.error(apiError)
        } else if (data?.payload?.email) {
          content = data.payload.email.content ?? null
        }
      } catch (e) {
        error = 'Failed to load email content'
        console.error(e)
      } finally {
        loading = false
      }
    }
  }
</script>

<button
  class=".flex .w-full .min-w-0 .flex-col .gap-3 .px-4 .py-3 .text-left .transition-colors hover:.bg-gray-100"
  class:expanded
  onclick={toggleExpand}
>
  <!-- Header Row -->
  <span class=".flex .items-start .justify-between">
    <span class=".mr-2 .flex .items-center .gap-1.5 .truncate .font-medium">
      {email.subject}
    </span>
    <span class=".flex .items-center .gap-2">
      <span class=".min-w-fit .whitespace-nowrap .text-xs .text-gray-500">
        {dayjs(email.datetime).format('MMM D, HH:mm')}
      </span>
      <span class=".transition-transform" class:rotate-180={expanded}>
        <ChevronDownSVG class=".h-4 .w-4 .shrink-0 .text-gray-400" />
      </span>
    </span>
  </span>

  <!-- From Row -->
  <span class=".flex .items-center .justify-between">
    <span class=".truncate .text-sm .text-gray-600">
      From {email.from.name || email.from.email}
    </span>
  </span>

  <!-- Expandable Content -->
  {#if expanded}
    <div class=".mt-2 .border-t .border-gray-200 .pt-3">
      {#if loading}
        <div class=".flex .items-center .gap-2 .py-4 .text-gray-500">
          <LoadingSpinnerSVG class=".h-4 .w-4 .shrink-0 .animate-spin .text-primary" />
          <span class=".text-sm">Loading email content...</span>
        </div>
      {:else if error}
        <div class=".py-4 .text-sm .text-red-500">
          {error}
        </div>
      {:else if content}
        <div class=".prose .prose-sm .max-w-none .overflow-auto">
          {@html content}
        </div>
      {/if}
    </div>
  {/if}
</button>

<style>
  .expanded {
    background-color: rgb(249 250 251);
  }
  .rotate-180 {
    transform: rotate(180deg);
  }
</style>
