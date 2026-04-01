import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Growth Sender';

/**
 * Envia o e-mail de redefinição de senha
 * @param {string} to - E-mail do destinatário
 * @param {string} resetUrl - URL completa com o token de reset
 */
export async function sendPasswordResetEmail(to, resetUrl) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinição de Senha – ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${APP_NAME}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Sistema de Disparos em Massa via WhatsApp</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">Redefinição de senha</h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">
                      Redefinir minha senha
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">
                Este link expira em <strong style="color:#94a3b8;">1 hora</strong>.
              </p>
              <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #334155;margin:28px 0;" />

              <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br/>
                <a href="${resetUrl}" style="color:#22c55e;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 28px;text-align:center;">
              <p style="margin:0;color:#334155;font-size:12px;">© ${new Date().getFullYear()} ${APP_NAME}. Todos os direitos reservados.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Redefinição de senha – ${APP_NAME}`,
    html
  });

  if (error) {
    console.error('❌ Resend error:', error);
    throw new Error('Falha ao enviar e-mail de redefinição de senha');
  }

  console.log('✉️  Password reset email sent:', data?.id);
  return data;
}
