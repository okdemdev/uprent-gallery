import Imap from 'imap'
import { simpleParser, type ParsedMail, type AddressObject } from 'mailparser'
import {
  type Email,
  type EmailAttachment,
  EMAIL_CATEGORY,
} from '~core/database'
import { catchError } from '~utils'

export class EmailServer {
  private connectionPool: Record<string, Imap> = {}
  private connectionTimeouts: Record<string, ReturnType<typeof setTimeout>> = {}

  /**
   * Loads emails (headers only, no body content) for list rendering
   * Use loadEmailBody() to fetch full content for a single email
   */
  async loadEmails(username: string, password: string): Promise<Email[]> {
    const imap = await this.connect(username, password)
    await this.openBox(imap, 'INBOX')

    try {
      const uids = await this.search(imap, ['ALL'])

      if (!uids.length) {
        return []
      }

      // Fetch headers only (no body content) for performance
      const emails = await this.fetchHeaders(imap, uids)

      return emails.sort(
        (a, b) =>
          new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
      )
    } finally {
      await catchError(this.closeBox(imap), false)
    }
  }


  /**
   * Loads full email body for a single email by UID
   */
  async loadEmailBody(username: string, password: string, uid: number): Promise<Email | null> {
    const imap = await this.connect(username, password)
    await this.openBox(imap, 'INBOX')

    try {
      const emails = await this.fetchAndParseEmails(imap, [uid])
      return emails[0] || null
    } finally {
      await catchError(this.closeBox(imap), false)
    }
  }

  /**
   * Loads email body with attachment metadata only (no binary data)
   * Much faster than loadEmailBody for emails with large attachments
   */
  async loadEmailBodyLight(username: string, password: string, uid: number): Promise<Email | null> {
    const imap = await this.connect(username, password)
    await this.openBox(imap, 'INBOX')

    try {
      // First, get the BODYSTRUCTURE to understand email parts
      const structure = await this.fetchBodyStructure(imap, uid)
      if (!structure) return null

      // Find text/html parts and attachment parts
      const textParts = this.findTextParts(structure)
      const attachmentParts = this.findAttachmentParts(structure)

      // Fetch only the text/html content (not attachments)
      const textContent = await this.fetchSpecificParts(imap, uid, textParts)
      
      // Fetch headers for metadata
      const headers = await this.fetchHeaders(imap, [uid])
      const emailHeader = headers[0]
      if (!emailHeader) return null

      // Build attachment metadata (without binary data)
      const attachments: EmailAttachment[] = attachmentParts.map((part, index) => ({
        uid: index,
        partId: part.partId,
        contentType: `${part.type}/${part.subtype}`.toLowerCase(),
        filename: part.params?.name || part.disposition?.params?.filename || `attachment-${index}`,
        size: part.size || 0,
        contentId: part.id,
        related: part.disposition?.type?.toLowerCase() === 'inline',
      }))

      return {
        ...emailHeader,
        content: textContent.html || textContent.text || '',
        attachments,
      }
    } finally {
      await catchError(this.closeBox(imap), false)
    }
  }

  /**
   * Loads a single attachment by its index (uid in attachment array)
   * This parses the full email to get the attachment data
   */
  async loadAttachment(
    username: string,
    password: string,
    emailUid: number,
    attachmentIndex: number,
  ): Promise<{ data: Buffer; contentType: string; filename: string } | null> {
    const imap = await this.connect(username, password)
    await this.openBox(imap, 'INBOX')

    try {
      const parsed = await this.fetchAndParseWithAttachments(imap, emailUid)
      if (!parsed) return null

      const attachment = parsed.attachments?.[attachmentIndex]
      if (!attachment) return null
      
      return {
        data: attachment.content,
        contentType: attachment.contentType,
        filename: attachment.filename || 'attachment',
      }
    } finally {
      await catchError(this.closeBox(imap), false)
    }
  }

  /**
   * Loads only inline images from an email (for delayed loading)
   */
  async loadInlineImages(
    username: string,
    password: string,
    emailUid: number,
  ): Promise<Array<{ contentId: string; contentType: string; data: string }>> {
    const imap = await this.connect(username, password)
    await this.openBox(imap, 'INBOX')

    try {
      const parsed = await this.fetchAndParseWithAttachments(imap, emailUid)
      if (!parsed) return []

      return (parsed.attachments || [])
        .filter(att => att.contentId && (att.related || att.contentType.startsWith('image/')))
        .map(att => ({
          contentId: att.contentId!.replace(/[<>]/g, ''),
          contentType: att.contentType,
          data: att.content.toString('base64'),
        }))
    } finally {
      await catchError(this.closeBox(imap), false)
    }
  }

  /**
   * Fetches and parses a single email, including attachment content
   */
  private fetchAndParseWithAttachments(imap: Imap, uid: number): Promise<ParsedMail | null> {
    return new Promise((resolve, reject) => {
      const fetch = imap.fetch([uid], { bodies: '', struct: false })
      const chunks: Buffer[] = []

      fetch.on('message', msg => {
        msg.on('body', stream => {
          stream.on('data', chunk => chunks.push(chunk))
        })
      })

      fetch.once('error', reject)
      fetch.once('end', async () => {
        try {
          const fullSource = Buffer.concat(chunks)
          const parsed = await simpleParser(fullSource)
          resolve(parsed)
        } catch (err) {
          console.error(`Failed to parse email UID ${uid}`, err)
          resolve(null)
        }
      })
    })
  }

  /**
   * Fetches BODYSTRUCTURE for an email
   */
  private fetchBodyStructure(imap: Imap, uid: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const fetch = imap.fetch([uid], { struct: true })
      let structure: any = null

      fetch.on('message', msg => {
        msg.once('attributes', attrs => {
          structure = attrs.struct
        })
      })

      fetch.once('error', reject)
      fetch.once('end', () => resolve(structure))
    })
  }

  /**
   * Finds text/html parts in the email structure
   */
  private findTextParts(structure: any, partId = ''): Array<{ partId: string; type: string; subtype: string }> {
    const parts: Array<{ partId: string; type: string; subtype: string }> = []
    
    if (!structure) return parts

    // Handle array (multipart)
    if (Array.isArray(structure)) {
      for (let i = 0; i < structure.length; i++) {
        const item = structure[i]
        // Skip the multipart type string at the end
        if (typeof item === 'string') continue
        
        const newPartId = partId ? `${partId}.${i + 1}` : `${i + 1}`
        parts.push(...this.findTextParts(item, newPartId))
      }
    } else if (typeof structure === 'object') {
      const type = structure.type?.toLowerCase()
      const subtype = structure.subtype?.toLowerCase()
      const currentPartId = partId || '1'
      
      if (type === 'text' && (subtype === 'html' || subtype === 'plain')) {
        parts.push({ partId: currentPartId, type, subtype })
      }
    }

    return parts
  }

  /**
   * Finds attachment parts in the email structure
   */
  private findAttachmentParts(structure: any, partId = ''): Array<{
    partId: string
    type: string
    subtype: string
    params?: Record<string, string>
    id?: string
    disposition?: { type: string; params?: Record<string, string> }
    encoding?: string
    size?: number
  }> {
    const parts: Array<{
      partId: string
      type: string
      subtype: string
      params?: Record<string, string>
      id?: string
      disposition?: { type: string; params?: Record<string, string> }
      encoding?: string
      size?: number
    }> = []
    
    if (!structure) return parts

    if (Array.isArray(structure)) {
      for (let i = 0; i < structure.length; i++) {
        const item = structure[i]
        if (typeof item === 'string') continue
        
        const newPartId = partId ? `${partId}.${i + 1}` : `${i + 1}`
        parts.push(...this.findAttachmentParts(item, newPartId))
      }
    } else if (typeof structure === 'object') {
      const type = structure.type?.toLowerCase()
      const subtype = structure.subtype?.toLowerCase()
      const currentPartId = partId || '1'
      
      // It's an attachment if it has disposition=attachment, or is not text (excluding multipart)
      const isAttachment = 
        structure.disposition?.type?.toLowerCase() === 'attachment' ||
        structure.disposition?.type?.toLowerCase() === 'inline' ||
        (type && type !== 'text' && type !== 'multipart' && structure.id)

      if (isAttachment) {
        parts.push({
          partId: currentPartId,
          type,
          subtype,
          params: structure.params,
          id: structure.id,
          disposition: structure.disposition,
          encoding: structure.encoding,
          size: structure.size,
        })
      }
    }

    return parts
  }

  /**
   * Fetches specific parts of an email (text/html content)
   */
  private async fetchSpecificParts(
    imap: Imap,
    uid: number,
    textParts: Array<{ partId: string; type: string; subtype: string }>,
  ): Promise<{ html: string; text: string }> {
    if (textParts.length === 0) {
      return { html: '', text: '' }
    }

    const result = { html: '', text: '' }

    for (const part of textParts) {
      const content = await this.fetchPartAsText(imap, uid, part.partId)
      if (part.subtype === 'html') {
        result.html = content
      } else if (part.subtype === 'plain' && !result.text) {
        result.text = content
      }
    }

    return result
  }

  /**
   * Fetches a single part as text
   */
  private fetchPartAsText(imap: Imap, uid: number, partId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const fetch = imap.fetch([uid], { bodies: [partId] })
      const chunks: Buffer[] = []

      fetch.on('message', msg => {
        msg.on('body', stream => {
          stream.on('data', chunk => chunks.push(chunk))
        })
      })

      fetch.once('error', reject)
      fetch.once('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(buffer.toString('utf-8'))
      })
    })
  }

  /**
   * Fetches a single part as Buffer (for attachments)
   */
  private fetchPart(imap: Imap, uid: number, partId: string, encoding?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const fetch = imap.fetch([uid], { bodies: [partId] })
      const chunks: Buffer[] = []

      fetch.on('message', msg => {
        msg.on('body', stream => {
          stream.on('data', chunk => chunks.push(chunk))
        })
      })

      fetch.once('error', reject)
      fetch.once('end', () => {
        let buffer = Buffer.concat(chunks)
        
        // Decode if needed
        if (encoding?.toLowerCase() === 'base64') {
          buffer = Buffer.from(buffer.toString('utf-8').replace(/\s/g, ''), 'base64')
        } else if (encoding?.toLowerCase() === 'quoted-printable') {
          buffer = this.decodeQuotedPrintable(buffer)
        }
        
        resolve(buffer)
      })
    })
  }

  /**
   * Decodes quoted-printable encoding
   */
  private decodeQuotedPrintable(buffer: Buffer): Buffer {
    const str = buffer.toString('utf-8')
    const decoded = str
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    return Buffer.from(decoded, 'utf-8')
  }

  /**
   * Fetches only headers for all emails (much faster than full body)
   */
  private async fetchHeaders(
    imap: Imap,
    uids: number[],
  ): Promise<Email[]> {
    return new Promise<Email[]>((resolve, reject) => {
      const fetch = imap.fetch(uids, {
        bodies: 'HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES X-UPRENT-CATEGORIES)',
        struct: false,
      })

      const headerPromises: Promise<Email | null>[] = []

      fetch.on('message', msg => {
        const promise = new Promise<Email | null>(resolveHeader => {
          let uid = 0
          let flags: string[] = []
          const chunks: Buffer[] = []

          msg.once('attributes', attrs => {
            uid = attrs.uid
            flags = attrs.flags || []
          })

          msg.on('body', stream => {
            stream.on('data', chunk => chunks.push(chunk))
          })

          msg.once('end', async () => {
            try {
              const headerSource = Buffer.concat(chunks)
              const parsed = await simpleParser(headerSource)
              // Return Email with no content/attachments (headers only)
              const email = this.mapParsedToEmail(uid, flags, parsed, false)
              resolveHeader(email)
            } catch (err) {
              console.error(`Failed to parse email header UID ${uid}`, err)
              resolveHeader(null)
            }
          })
        })

        headerPromises.push(promise)
      })

      fetch.once('error', err => {
        reject(err)
      })

      fetch.once('end', async () => {
        const results = await Promise.all(headerPromises)
        resolve(results.filter((e): e is Email => e !== null))
      })
    })
  }

  private async fetchAndParseEmails(
    imap: Imap,
    uids: number[],
  ): Promise<Email[]> {
    return new Promise<Email[]>((resolve, reject) => {
      const fetch = imap.fetch(uids, {
        bodies: '',
        struct: false,
      })

      const emailPromises: Promise<Email | null>[] = []

      fetch.on('message', msg => {
        const promise = new Promise<Email | null>(resolveEmail => {
          let uid = 0
          let flags: string[] = []
          const chunks: Buffer[] = []

          msg.once('attributes', attrs => {
            uid = attrs.uid
            flags = attrs.flags || []
          })

          msg.on('body', stream => {
            stream.on('data', chunk => chunks.push(chunk))
          })

          msg.once('end', async () => {
            try {
              const fullSource = Buffer.concat(chunks)
              const parsed = await simpleParser(fullSource)
              const email = this.mapParsedToEmail(uid, flags, parsed, true)
              resolveEmail(email)
            } catch (err) {
              console.error(`Failed to parse email UID ${uid}`, err)
              resolveEmail(null)
            }
          })
        })

        emailPromises.push(promise)
      })

      fetch.once('error', err => {
        reject(err)
      })

      fetch.once('end', async () => {
        const results = await Promise.all(emailPromises)
        resolve(results.filter((e): e is Email => e !== null))
      })
    })
  }

  /**
   * Maps parsed mail to Email object
   * @param includeContent - if false, omits content and attachments for faster list loading
   */
  private mapParsedToEmail(
    uid: number,
    flags: string[],
    parsed: ParsedMail,
    includeContent: boolean = true,
  ): Email {
    let categories: EMAIL_CATEGORY[] = []
    const categoryHeader = parsed.headers.get('x-uprent-categories')
    if (categoryHeader) {
      const val = Array.isArray(categoryHeader)
        ? categoryHeader[0]
        : (categoryHeader as string)

      if (typeof val === 'string') {
        categories = val
          .split(',')
          .map(c => c.trim())
          .filter((c): c is EMAIL_CATEGORY =>
            Object.values(EMAIL_CATEGORY).includes(c as EMAIL_CATEGORY),
          )
      }
    }

    const getAddress = (addr: AddressObject | AddressObject[] | undefined) => {
      if (!addr) return []
      const list = Array.isArray(addr) ? addr : [addr]
      return list.flatMap(a => a.value)
    }

    const fromArr = getAddress(parsed.from)
    const toArr = getAddress(parsed.to)
    const ccArr = getAddress(parsed.cc)

    // Map Attachments (Metadata only)
    const attachments: EmailAttachment[] = (parsed.attachments || []).map(
      (att, index) => ({
        uid: index, // simple index as ID
        contentType: att.contentType,
        filename: att.filename,
        size: att.size,
        related: att.related || false,
        contentId: att.contentId,
      }),
    )

    return {
      uid,
      flags,
      categories,
      seen: flags.includes('\\Seen'),
      messageId: parsed.messageId || `no-id-${uid}`,
      subject: parsed.subject || '',
      from: {
        name: fromArr[0]?.name || '',
        email: fromArr[0]?.address || 'unknown@sender.com',
      },
      to: toArr.map(v => ({ name: v.name || '', email: v.address || '' })),
      cc: ccArr.map(v => v.address || ''),
      datetime: (parsed.date || new Date()).toISOString(),
      references:
        typeof parsed.references === 'string'
          ? [parsed.references]
          : parsed.references || [],
      inReplyTo: parsed.inReplyTo,
      // Only include content and attachments when requested (for full email view)
      ...(includeContent && {
        content: parsed.html || parsed.textAsHtml || parsed.text || '',
        attachments,
      }),
    }
  }

  private async connect(username: string, password: string): Promise<Imap> {
    if (this.connectionPool[username]) {
      this.resetInactivityTimeout(username)
      return this.connectionPool[username]
    }

    const imap = await this.createImap(username, password)
    this.connectionPool[username] = imap
    return imap
  }

  private createImap(username: string, password: string): Promise<Imap> {
    return new Promise<Imap>((resolve, reject) => {
      const imap = new Imap({
        user: username,
        password,
        host: '172.233.33.104',
        port: 993,
        tls: true,
        authTimeout: 10000,
        connTimeout: 10000,
      })
      imap.once('ready', () => resolve(imap))
      imap.once('error', reject)
      imap.connect()
    })
  }

  private resetInactivityTimeout(username: string) {
    if (this.connectionTimeouts[username]) {
      clearTimeout(this.connectionTimeouts[username])
    }

    this.connectionTimeouts[username] = setTimeout(
      () => {
        const imap = this.connectionPool[username]
        if (imap) {
          catchError(imap.end(), false)
        }
        delete this.connectionPool[username]
        delete this.connectionTimeouts[username]
      },
      60 * 60 * 1000,
    )
  }

  private openBox(connection: Imap, boxName: string): Promise<void> {
    return new Promise(resolve => {
      connection.openBox(boxName, false, () => resolve())
    })
  }

  private closeBox(connection: Imap): Promise<void> {
    return new Promise(resolve => {
      connection.closeBox(false, () => resolve())
    })
  }

  private search(connection: Imap, criteria: string[]): Promise<number[]> {
    return new Promise((resolve, reject) => {
      connection.search(criteria, (err, uids) => {
        if (err) return reject(err)
        resolve(uids)
      })
    })
  }
}

export const emailServer = new EmailServer()
