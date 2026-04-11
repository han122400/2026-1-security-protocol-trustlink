/**
 * TrustLink - 인증서 발급/검증 유틸리티 (서버 사이드)
 * 
 * 서버가 CA 역할을 수행하여 X.509 유사 구조의 인증서를 발급합니다.
 */

import crypto from 'crypto';

/** X.509 유사 인증서 구조 */
export interface CertificateData {
  version: number;
  serialNumber: string;
  issuer: {
    commonName: string;
    organization: string;
  };
  subject: {
    commonName: string;
    userId: string;
    email: string;
  };
  validity: {
    notBefore: string;
    notAfter: string;
  };
  publicKey: {
    algorithm: string;
    signPublicKey: JsonWebKey;    // 서명 검증용 공개키
    encryptPublicKey: JsonWebKey; // 암호화용 공개키
  };
  signature?: string; // CA 서명 (Base64)
}

/** 인증서 일련번호 생성 */
export function generateSerialNumber(): string {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

/** Challenge 생성 (전자서명 로그인 / 출석 인증용) */
export function generateChallenge(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * 인증서 발급 (서버 CA가 서명)
 */
export function issueCertificate(params: {
  userId: string;
  email: string;
  subjectName: string;
  signPublicKey: JsonWebKey;
  encryptPublicKey: JsonWebKey;
}): CertificateData {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1년 유효

  const cert: CertificateData = {
    version: 3,
    serialNumber: generateSerialNumber(),
    issuer: {
      commonName: 'TrustLink CA',
      organization: 'TrustLink Security Lab',
    },
    subject: {
      commonName: params.subjectName,
      userId: params.userId,
      email: params.email,
    },
    validity: {
      notBefore: now.toISOString(),
      notAfter: expiresAt.toISOString(),
    },
    publicKey: {
      algorithm: 'RSA-2048',
      signPublicKey: params.signPublicKey,
      encryptPublicKey: params.encryptPublicKey,
    },
  };

  // CA 개인키로 인증서에 서명
  const serverPrivateKey = process.env.SERVER_PRIVATE_KEY;
  if (serverPrivateKey) {
    const certDataToSign = JSON.stringify({
      ...cert,
      signature: undefined,
    });

    const sign = crypto.createSign('SHA256');
    sign.update(certDataToSign);
    sign.end();

    try {
      cert.signature = sign.sign(serverPrivateKey, 'base64');
    } catch {
      // SERVER_PRIVATE_KEY가 올바르지 않은 경우 HMAC 방식 대체
      cert.signature = crypto
        .createHmac('sha256', serverPrivateKey)
        .update(certDataToSign)
        .digest('base64');
    }
  } else {
    // 환경변수 없을 때 기본 키 사용 (개발용)
    const certDataToSign = JSON.stringify({
      ...cert,
      signature: undefined,
    });
    cert.signature = crypto
      .createHmac('sha256', 'trustlink-dev-secret')
      .update(certDataToSign)
      .digest('base64');
  }

  return cert;
}

/**
 * 서버에서 전자서명 검증 (Node.js crypto)
 * 
 * 클라이언트가 Web Crypto API로 생성한 서명을
 * 서버에서 인증서의 공개키로 검증합니다.
 */
export async function verifySignatureOnServer(
  signPublicKeyJwk: JsonWebKey,
  signatureBase64: string,
  dataBase64: string
): Promise<boolean> {
  try {
    // JWK → Node.js KeyObject 변환
    const publicKey = crypto.createPublicKey({
      key: signPublicKeyJwk as crypto.JsonWebKey,
      format: 'jwk',
    });

    const verify = crypto.createVerify('SHA256');
    verify.update(Buffer.from(dataBase64, 'base64'));
    verify.end();

    return verify.verify(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(signatureBase64, 'base64')
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}
