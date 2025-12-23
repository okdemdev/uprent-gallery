<script lang="ts">
  import dayjs from 'dayjs'
  import type { Email, EmailAttachment } from '~core/database'
  import { LoadingSpinnerSVG, ChevronDownSVG } from '~ui/assets'
  import api from '~api'

  let { email }: { email: Email } = $props()

  let expanded = $state(false)
  let loading = $state(false)
  let content = $state<string | null>(null)
  let attachments = $state<EmailAttachment[]>([])
  let error = $state<string | null>(null)
  let imagesLoaded = $state(false)
  
  // Cache for downloaded attachments and inline images
  const attachmentCache = new Map<string, string>()
  const inlineImageCache = new Map<number, Array<{ contentId: string; contentType: string; data: string }>>()
  
  // Track which attachments are currently downloading
  let downloadingAttachments = $state<Set<number>>(new Set())

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
          attachments = data.payload.email.attachments ?? []
          
          // Auto-load inline images after a delay
          if (content && !imagesLoaded) {
            setTimeout(loadInlineImages, 500)
          }
        }
      } catch (e) {
        error = 'Failed to load email content'
        console.error(e)
      } finally {
        loading = false
      }
    }
  }

  async function loadInlineImages() {
    // Check cache first
    if (inlineImageCache.has(email.uid)) {
      const cached = inlineImageCache.get(email.uid)!
      replaceInlineImages(cached)
      return
    }
    
    try {
      const { data, error: apiError } = await api.emails({ uid: email.uid })['inline-images'].get()
      
      if (!apiError && data?.payload?.images) {
        // Cache the images
        inlineImageCache.set(email.uid, data.payload.images)
        replaceInlineImages(data.payload.images)
      }
    } catch (e) {
      console.error('Failed to load inline images', e)
    }
  }

  function replaceInlineImages(images: Array<{ contentId: string; contentType: string; data: string }>) {
    if (!content) return
    
    let updatedContent = content
    for (const img of images) {
      const cidPattern = new RegExp(`cid:${img.contentId}`, 'gi')
      updatedContent = updatedContent.replace(cidPattern, `data:${img.contentType};base64,${img.data}`)
    }
    content = updatedContent
    imagesLoaded = true
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function getFileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return '🖼️'
    if (contentType === 'application/pdf') return '📄'
    if (contentType.includes('word') || contentType.includes('document')) return '📝'
    if (contentType.includes('sheet') || contentType.includes('excel')) return '📊'
    if (contentType.includes('zip') || contentType.includes('archive')) return '📦'
    return '📎'
  }

  async function downloadAttachment(attachment: EmailAttachment) {
    const attachmentIndex = attachment.uid
    const cacheKey = `${email.uid}-${attachmentIndex}`
    
    // Check cache
    if (attachmentCache.has(cacheKey)) {
      triggerDownload(attachmentCache.get(cacheKey)!, attachment.filename || 'attachment')
      return
    }
    
    // Mark as downloading
    downloadingAttachments = new Set([...downloadingAttachments, attachmentIndex])

    try {
      const response = await fetch(`http://localhost:5002/emails/${email.uid}/attachment/${attachmentIndex}`)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Cache the URL
      attachmentCache.set(cacheKey, url)
      
      triggerDownload(url, attachment.filename || 'attachment')
    } catch (e) {
      console.error('Failed to download attachment', e)
    } finally {
      // Remove from downloading set
      const newSet = new Set(downloadingAttachments)
      newSet.delete(attachmentIndex)
      downloadingAttachments = newSet
    }
  }

  function triggerDownload(url: string, filename: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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
        
        <!-- Attachments List -->
        {#if attachments.length > 0}
          <div class=".mt-4 .border-t .border-gray-200 .pt-3">
            <div class=".mb-2 .text-xs .font-medium .text-gray-500 .uppercase">
              Attachments ({attachments.filter(a => !a.related).length})
            </div>
            <div class=".flex .flex-col .gap-2">
              {#each attachments.filter(a => !a.related) as attachment}
                <button
                  class=".flex .items-center .gap-2 .px-3 .py-2 .text-left .text-sm .bg-gray-50 .rounded-lg .hover:.bg-gray-100 .transition-colors"
                  class:opacity-70={downloadingAttachments.has(attachment.uid)}
                  disabled={downloadingAttachments.has(attachment.uid)}
                  onclick={(e) => { e.stopPropagation(); downloadAttachment(attachment); }}
                >
                  <span class=".text-lg">{getFileIcon(attachment.contentType)}</span>
                  <span class=".flex-1 .truncate .font-medium">{attachment.filename || 'Untitled'}</span>
                  <span class=".text-xs .text-gray-500">{formatFileSize(attachment.size)}</span>
                  {#if downloadingAttachments.has(attachment.uid)}
                    <span class=".flex .items-center .gap-1 .text-xs .text-primary .font-medium">
                      <LoadingSpinnerSVG class=".h-3 .w-3 .animate-spin" />
                      Downloading...
                    </span>
                  {:else}
                    <span class=".text-xs .text-primary .font-medium">Download</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}
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

