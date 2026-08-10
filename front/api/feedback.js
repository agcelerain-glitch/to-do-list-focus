export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, lang, uid } = req.body ?? {}

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid message' })
  }

  if (message.length > 500) {
    return res.status(400).json({ error: 'Message too long' })
  }

  // HTMLタグ・制御文字を除去してプレーンテキストのみ許可
  const sanitized = message.replace(/<[^>]*>/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim()
  if (sanitized.length === 0) {
    return res.status(400).json({ error: 'Invalid message content' })
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_API
  if (!webhookUrl) {
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  const langLabel = { ja: '日本語', en: 'English', zh: '中文' }[lang] ?? lang ?? '不明'

  const discordRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: '📝 新しいフィードバック',
          description: sanitized,
          color: 0x3b82f6,
          fields: [
            { name: '言語', value: langLabel, inline: true },
            { name: 'UID', value: uid ? `\`${uid.slice(0, 8)}…\`` : '不明', inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  })

  if (!discordRes.ok) {
    return res.status(502).json({ error: 'Discord webhook failed' })
  }

  return res.status(200).json({ ok: true })
}
