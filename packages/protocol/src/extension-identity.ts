// The Auto Agent extension's manifest `key` (wxt.config.ts in the extension repo). It pins the
// extension id on every machine; the matching private key only signs a packed .crx.

/** The value of the extension manifest's `key`: base64 DER SubjectPublicKeyInfo. */
export const EXTENSION_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuBoxdGJlF6kT8KPBPFakT7hrTQTBv2m8CGtHs7zs4d9vTC3fQ2GKvIn6xuYiXvHXTLhWTEf16Vi0wzyHmiZ6Y4reG3Z8ImVE8VWV2Btl6OiuF49GjvhoB2BluN3S8/oyhRct7PnW/ybvMZ/b54tQnXQPG6d5e2rM7ybjuzUzdQbIcN44os52hFTZZKHnUMEXANjyKzyPL4EX71hnBHyYA9RFHd7LG+kuZGcDxGSYcE4LUobfJw0x9WuPco5UdHlIc9Zj83JAXS3BZyuAxcA6tGhqyIlJMFOy0XuQlJ16w/kX4c11eLfcL8F2EnnC+gNJ0DAlLkU089+4M1bLZ2eRfQIDAQAB';

/** The Chrome extension id derived from EXTENSION_PUBLIC_KEY. */
export const EXTENSION_ID = 'halobcdjpokedneejfmdjecjgdkejjdk';
