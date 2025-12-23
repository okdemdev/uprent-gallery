import { t, Elysia } from 'elysia'
import { corePlugin, res } from '@/plugins'
import { emailServer } from '~integrations/email-server'

/**
 * Handler for downloading a single email attachment
 */
export const attachmentHandler = new Elysia().use(corePlugin).get(
  '/emails/:uid/attachment/:attachmentIndex',
  async ({ res, params, set }) => {
    const uid = parseInt(params.uid, 10)
    const attachmentIndex = parseInt(params.attachmentIndex, 10)
    
    if (isNaN(uid)) {
      return res.badRequest('Invalid UID')
    }

    if (isNaN(attachmentIndex) || attachmentIndex < 0) {
      return res.badRequest('Invalid attachment index')
    }

    const attachment = await emailServer.loadAttachment(
      'testtask.2.1@mail.uprent.ai',
      '123123123',
      uid,
      attachmentIndex,
    )
    
    if (!attachment) {
      return res.badRequest('Attachment not found')
    }

    // Set headers for file download
    set.headers['Content-Type'] = attachment.contentType
    set.headers['Content-Disposition'] = `attachment; filename="${attachment.filename}"`
    set.headers['Content-Length'] = String(attachment.data.length)
    
    return attachment.data
  },
)
