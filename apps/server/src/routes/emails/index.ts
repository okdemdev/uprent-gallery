import { Elysia } from 'elysia'
import { loadEmailsHandler } from './load.handler'
import { bodyEmailHandler } from './body.handler'

export const emailsRoute = new Elysia()
  .use(loadEmailsHandler)
  .use(bodyEmailHandler)
