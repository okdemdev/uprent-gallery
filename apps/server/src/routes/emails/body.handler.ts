import { t, Elysia } from 'elysia'
import { corePlugin, res } from '@/plugins'
import { EMAIL_CATEGORY } from '~core/database'
import { emailServer } from '~integrations/email-server'

/**
 * DTO for full email body (content + attachments)
 */
const resDTO = t.Object({
  email: t.Union([
    t.Object({
      uid: t.Number(),
      seen: t.Boolean(),
      categories: t.Optional(t.Array(t.Enum(EMAIL_CATEGORY))),
      messageId: t.String(),
      datetime: t.String({ format: 'date-time' }),
      subject: t.String(),
      content: t.Optional(t.String()),
      from: t.Object({
        name: t.Optional(t.String()),
        email: t.String({ format: 'email' }),
      }),
      to: t.Array(
        t.Object({
          name: t.Optional(t.String()),
          email: t.String({ format: 'email' }),
        }),
      ),
      cc: t.Optional(t.Array(t.String())),
      inReplyTo: t.Optional(t.String()),
      references: t.Optional(t.Array(t.String())),
      flags: t.Array(t.String()),
      attachments: t.Optional(t.Array(
        t.Object({
          uid: t.Number(),
          contentType: t.String(),
          filename: t.Optional(t.String()),
          size: t.Number(),
          contentId: t.Optional(t.String()),
          related: t.Optional(t.Boolean()),
        }),
      )),
    }),
    t.Null(),
  ]),
})

export const bodyEmailHandler = new Elysia().use(corePlugin).get(
  '/emails/:uid/body',
  async ({ res, params }) => {
    const uid = parseInt(params.uid, 10)
    
    if (isNaN(uid)) {
      return res.badRequest('Invalid UID')
    }

    const email = await emailServer.loadEmailBody(
      'testtask.2.1@mail.uprent.ai',
      '123123123',
      uid,
    )
    
    return res.ok({
      email,
    })
  },
  { response: res(resDTO) },
)
