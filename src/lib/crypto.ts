/**
 * TrustLink - Web Crypto API 유틸리티
 * 
 * 클라이언트 사이드에서 사용하는 암호화/전자서명 관련 함수들
 * - RSA 키쌍 생성 (서명용 + 암호화용)
 * - 전자서명 생성/검증
 * - AES-GCM 메시지 암호화/복호화
 * - RSA-OAEP 세션키 암호화/복호화 (전자봉투)
 */

// ===== 상수 =====
const RSA_SIGN_ALGORITHM = {
  name: 'RSASSA-PKCS1-v1_5',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]), // 65537
  hash: 'SHA-256',
};

const RSA_ENCRYPT_ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

const AES_ALGORITHM = {
  name: 'AES-GCM',
  length: 256,
};

// ===== 유틸 함수 =====

/** ArrayBuffer → Base64 문자열 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Base64 문자열 → ArrayBuffer */
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** 문자열 → ArrayBuffer (UTF-8) */
export function stringToBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

/** ArrayBuffer → 문자열 (UTF-8) */
export function bufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

// ===== RSA 키쌍 생성 =====

/** 전자서명용 RSA 키쌍 생성 */
export async function generateSignKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    RSA_SIGN_ALGORITHM,
    true, // extractable: true로 설정해야 JWK 내보내기 가능
    ['sign', 'verify']
  );
}

/** 암호화용 RSA 키쌍 생성 */
export async function generateEncryptKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    RSA_ENCRYPT_ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  );
}

// ===== 키 내보내기 / 가져오기 =====

/** CryptoKey → JWK */
export async function exportKeyToJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

/** JWK → CryptoKey (공개키 - 서명 검증용) */
export async function importVerifyKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    RSA_SIGN_ALGORITHM,
    true,
    ['verify']
  );
}

/** JWK → CryptoKey (공개키 - 암호화용) */
export async function importEncryptPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
}

/** JWK → CryptoKey (개인키 - 복호화용) */
export async function importDecryptPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
}

/** JWK → CryptoKey (개인키 - 서명용) */
export async function importSignPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    RSA_SIGN_ALGORITHM,
    true,
    ['sign']
  );
}

// ===== 전자서명 =====

/** 데이터에 전자서명 생성 */
export async function signData(
  privateKey: CryptoKey,
  data: ArrayBuffer
): Promise<ArrayBuffer> {
  return crypto.subtle.sign(
    RSA_SIGN_ALGORITHM.name,
    privateKey,
    data
  );
}

/** 전자서명 검증 */
export async function verifySignature(
  publicKey: CryptoKey,
  signature: ArrayBuffer,
  data: ArrayBuffer
): Promise<boolean> {
  return crypto.subtle.verify(
    RSA_SIGN_ALGORITHM.name,
    publicKey,
    signature,
    data
  );
}

// ===== AES-GCM 대칭키 암호화 =====

/** AES-GCM 세션키 생성 */
export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    AES_ALGORITHM,
    true, // extractable: 내보내서 RSA로 암호화해야 하므로
    ['encrypt', 'decrypt']
  );
}

/** AES-GCM 암호화 */
export async function encryptAesGcm(
  aesKey: CryptoKey,
  plaintext: ArrayBuffer
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array<ArrayBufferLike> }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    aesKey,
    plaintext
  );
  return { ciphertext, iv };
}

/** AES-GCM 복호화 */
export async function decryptAesGcm(
  aesKey: CryptoKey,
  ciphertext: ArrayBuffer,
  iv: Uint8Array<ArrayBufferLike>
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    aesKey,
    ciphertext
  );
}

// ===== RSA-OAEP 세션키 암호화 (전자봉투) =====

/** AES 키를 수신자의 RSA 공개키로 암호화 */
export async function encryptAesKeyWithRsa(
  recipientPublicKey: CryptoKey,
  aesKey: CryptoKey
): Promise<ArrayBuffer> {
  const rawKey = await crypto.subtle.exportKey('raw', aesKey);
  return crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    rawKey
  );
}

/** RSA 개인키로 암호화된 AES 키 복호화 */
export async function decryptAesKeyWithRsa(
  privateKey: CryptoKey,
  encryptedKey: ArrayBuffer
): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedKey
  );
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    AES_ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  );
}

// ===== 전자봉투 고수준 함수 =====

export interface DigitalEnvelope {
  encryptedContent: string;  // AES로 암호화된 메시지 (Base64)
  encryptedAesKey: string;   // RSA로 암호화된 AES 키 (Base64)
  iv: string;                // AES-GCM IV (Base64)
  signature: string;         // 전자서명 (Base64)
}

/**
 * 전자봉투 메시지 생성 (송신자)
 * 1. AES 세션키 생성
 * 2. 메시지를 AES-GCM으로 암호화
 * 3. 원문에 전자서명
 * 4. AES 키를 수신자 공개키로 RSA-OAEP 암호화
 */
export async function createDigitalEnvelope(
  plaintext: string,
  senderSignPrivateKey: CryptoKey,
  recipientEncryptPublicKey: CryptoKey
): Promise<DigitalEnvelope> {
  const plaintextBuffer = stringToBuffer(plaintext);

  // 1. AES 세션키 생성
  const aesKey = await generateAesKey();

  // 2. AES-GCM 암호화
  const { ciphertext, iv } = await encryptAesGcm(aesKey, plaintextBuffer);

  // 3. 전자서명 (원문에 대해)
  const signatureBuffer = await signData(senderSignPrivateKey, plaintextBuffer);

  // 4. AES 키를 수신자 공개키로 암호화
  const encryptedAesKeyBuffer = await encryptAesKeyWithRsa(
    recipientEncryptPublicKey,
    aesKey
  );

  return {
    encryptedContent: bufferToBase64(ciphertext),
    encryptedAesKey: bufferToBase64(encryptedAesKeyBuffer),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    signature: bufferToBase64(signatureBuffer),
  };
}

/**
 * 전자봉투 메시지 열기 (수신자)
 * 1. RSA 개인키로 AES 키 복호화
 * 2. AES 키로 메시지 복호화
 * 3. 송신자 공개키로 전자서명 검증
 */
export async function openDigitalEnvelope(
  envelope: DigitalEnvelope,
  recipientDecryptPrivateKey: CryptoKey,
  senderVerifyPublicKey: CryptoKey
): Promise<{ plaintext: string; signatureValid: boolean }> {
  // 1. AES 키 복호화
  const aesKey = await decryptAesKeyWithRsa(
    recipientDecryptPrivateKey,
    base64ToBuffer(envelope.encryptedAesKey)
  );

  // 2. 메시지 복호화
  const iv = new Uint8Array(base64ToBuffer(envelope.iv));
  const plaintextBuffer = await decryptAesGcm(
    aesKey,
    base64ToBuffer(envelope.encryptedContent),
    iv
  );

  const plaintext = bufferToString(plaintextBuffer);

  // 3. 전자서명 검증
  const signatureValid = await verifySignature(
    senderVerifyPublicKey,
    base64ToBuffer(envelope.signature),
    plaintextBuffer
  );

  return { plaintext, signatureValid };
}
