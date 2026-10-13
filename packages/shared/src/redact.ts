const sensitive =
  /token$|api.?key$|authorization|password|secret$|phone|mobile|address|email|cookie/i;
export function redact(
  value: unknown,
  secrets: string[] = Object.entries(process.env)
    .filter(([k]) => /TOKEN|API_KEY|PASSWORD|SECRET/.test(k))
    .map(([, v]) => v || '')
    .filter(Boolean),
): unknown {
  if (Array.isArray(value)) return value.map((v) => redact(v, secrets));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([k]) => !/^(?:reasoning|reasoning_content|reasoningContent|chain_of_thought)$/.test(k),
        )
        .map(([k, v]) => [k, sensitive.test(k) ? '[REDACTED]' : redact(v, secrets)]),
    );
  if (typeof value === 'string') {
    let s = value;
    for (const secret of secrets) s = s.split(secret).join('[REDACTED]');
    return s
      .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
      .replace(/\bsk-[\w-]{8,}\b/g, '[REDACTED]')
      .replace(/\b1[3-9]\d{9}\b/g, '[PHONE]')
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[EMAIL]')
      .slice(0, 24000);
  }
  return value;
}
