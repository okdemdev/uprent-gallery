import { Elysia } from 'elysia'
import { loadEmailsHandler } from './load.handler'
import { bodyEmailHandler } from './body.handler'
import { attachmentHandler } from './attachment.handler'
import { inlineImagesHandler } from './inline-images.handler'

export const emailsRoute = new Elysia()
  .use(loadEmailsHandler)
  .use(bodyEmailHandler)
  .use(attachmentHandler)
  .use(inlineImagesHandler)

