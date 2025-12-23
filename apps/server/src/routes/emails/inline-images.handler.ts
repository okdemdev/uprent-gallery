import { t, Elysia } from 'elysia'
import { corePlugin, res } from '@/plugins'
import { emailServer } from '~integrations/email-server'

/**
 * DTO for inline images response
 */
const resDTO = t.Object({
  images: t.Array(
    t.Object({
      contentId: t.String(),
      contentType: t.String(),
      data: t.String(), // base64 encoded
    }),
  ),
})

/**
 * Handler for fetching inline images (for delayed loading)
 */
export const inlineImagesHandler = new Elysia().use(corePlugin).get(
  '/emails/:uid/inline-images',
  async ({ res, params }) => {
    const uid = parseInt(params.uid, 10)
    
    if (isNaN(uid)) {
      return res.badRequest('Invalid UID')
    }

    const images = await emailServer.loadInlineImages(
      'testtask.2.1@mail.uprent.ai',
      '123123123',
      uid,
    )
    
    return res.ok({ images })
  },
  { response: res(resDTO) },
)
