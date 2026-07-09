// Script para testar importação XML via API diretamente
import fs from 'fs';
import path from 'path';

const BASE = 'https://web-production-cba68f.up.railway.app';

async function main() {
  // 1. Obter CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  console.log('CSRF:', csrfData);

  // 2. Login via NextAuth credentials callback
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      email: 'admin@loja.com',
      senha: '123456',
      callbackUrl: '/dashboard/compras/importar-xml',
      json: 'true',
    }),
    redirect: 'manual',
  });

  // Captura cookies
  const cookies = loginRes.headers.getSetCookie?.() || [];
  console.log('Login status:', loginRes.status);
  console.log('Cookies:', cookies.join('\n'));

  // Extrair session token
  const sessionCookie = cookies.find(c => c.startsWith('next-auth.session-token='));
  if (!sessionCookie) {
    console.log('Não conseguiu login. Tentando via fetch normal...');
    // Tenta com redirect
    const loginRes2 = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email: 'admin@loja.com',
        senha: '123456',
        callbackUrl: '/dashboard/compras/importar-xml',
        json: 'true',
      }),
    });
    console.log('Login2 status:', loginRes2.status);
    const text = await loginRes2.text();
    console.log('Response:', text.substring(0, 500));
    return;
  }

  const tokenValue = sessionCookie.split(';')[0].split('=')[1];
  console.log('Session token:', tokenValue.substring(0, 50) + '...');

  // 3. Fazer upload do XML
  const xmlPath = path.join(process.cwd(), 'teste-nfe.xml');
  const xmlContent = fs.readFileSync(xmlPath);

  const formData = new FormData();
  formData.append('xml', new Blob([xmlContent], { type: 'text/xml' }), 'teste-nfe.xml');
  formData.append('confirmar', 'true');

  const uploadRes = await fetch(`${BASE}/api/compras/importar-xml`, {
    method: 'POST',
    headers: {
      Cookie: `next-auth.session-token=${tokenValue}`,
    },
    body: formData,
  });

  const result = await uploadRes.json();
  console.log('Upload status:', uploadRes.status);
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
