/**
 * State management for the photo gallery component.
 * Handles image cleaning states, cleaned image URLs, and failed images.
 */

export type CleaningState = 'idle' | 'loading' | 'done' | 'error'
export type ActionState = 'idle' | 'loading' | 'success' | 'error'

type GalleryState = {
  cleaningStates: Map<number, CleaningState>
  cleanedImageUrls: Map<number, string>
  sliderPositions: Map<number, number>
  failedImages: Set<number>
  appliedState: ActionState
  ignoredState: ActionState
  currentImageIndex: number
}

export const createGalleryState = () => {
  let state = $state<GalleryState>({
    cleaningStates: new Map(),
    cleanedImageUrls: new Map(),
    sliderPositions: new Map(),
    failedImages: new Set(),
    appliedState: 'idle',
    ignoredState: 'idle',
    currentImageIndex: 0,
  })

  return {
    // Cleaning states
    getCleaningState(index: number): CleaningState {
      return state.cleaningStates.get(index) ?? 'idle'
    },
    setCleaningState(index: number, status: CleaningState) {
      const newStates = new Map(state.cleaningStates)
      newStates.set(index, status)
      state.cleaningStates = newStates
    },

    // Cleaned image URLs
    getCleanedUrl(index: number): string | undefined {
      return state.cleanedImageUrls.get(index)
    },
    setCleanedUrl(index: number, url: string) {
      const newUrls = new Map(state.cleanedImageUrls)
      newUrls.set(index, url)
      state.cleanedImageUrls = newUrls
    },

    // Slider positions
    getSliderPosition(index: number): number {
      return state.sliderPositions.get(index) ?? 50
    },
    setSliderPosition(index: number, position: number) {
      const newPositions = new Map(state.sliderPositions)
      newPositions.set(index, Math.max(0, Math.min(100, position)))
      state.sliderPositions = newPositions
    },

    // Failed images
    isImageFailed(index: number): boolean {
      return state.failedImages.has(index)
    },
    markImageFailed(index: number) {
      const newFailed = new Set(state.failedImages)
      newFailed.add(index)
      state.failedImages = newFailed
    },
    get failedImages() {
      return state.failedImages
    },

    // Action states
    get appliedState() {
      return state.appliedState
    },
    set appliedState(value: ActionState) {
      state.appliedState = value
    },
    get ignoredState() {
      return state.ignoredState
    },
    set ignoredState(value: ActionState) {
      state.ignoredState = value
    },

    // Current image index for navigation
    get currentImageIndex() {
      return state.currentImageIndex
    },
    set currentImageIndex(value: number) {
      state.currentImageIndex = value
    },

    // Cleanup - revoke all object URLs
    cleanup() {
      state.cleanedImageUrls.forEach(url => URL.revokeObjectURL(url))
    },

    // Reset state for reuse
    reset() {
      state.cleanedImageUrls.forEach(url => URL.revokeObjectURL(url))
      state.cleaningStates = new Map()
      state.cleanedImageUrls = new Map()
      state.sliderPositions = new Map()
      state.failedImages = new Set()
      state.appliedState = 'idle'
      state.ignoredState = 'idle'
      state.currentImageIndex = 0
    },
  }
}
