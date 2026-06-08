import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, nombre, apellido, fecha_inicio, profesional, especialidad, turno_id } =
      await req.json();

    const fecha = new Date(fecha_inicio);
    const fechaFormateada = fecha.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    });
    const horaFormateada = fecha.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    });

    const codigoTurno = (turno_id ?? "").slice(0, 8).toUpperCase();

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header rojo -->
        <tr>
          <td style="background:linear-gradient(135deg,#991b1b,#b91c1c);padding:32px;text-align:center;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;margin-bottom:12px;">
              <span style="color:white;font-size:20px;font-weight:900;">SM</span>
            </div>
            <h1 style="margin:0;color:white;font-size:22px;font-weight:800;">SM Medicina Laboral</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Confirmación de turno</p>
          </td>
        </tr>

        <!-- Check verde -->
        <tr>
          <td style="padding:32px 32px 0;text-align:center;">
            <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <span style="font-size:28px;">✅</span>
            </div>
            <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700;">¡Tu turno está confirmado!</h2>
            <p style="margin:0;color:#6b7280;font-size:15px;">Hola <strong style="color:#111827;">${nombre} ${apellido}</strong>, te enviamos los detalles de tu reserva.</p>
          </td>
        </tr>

        <!-- Detalle turno -->
        <tr>
          <td style="padding:24px 32px;">
            <div style="background:#f9fafb;border-radius:12px;padding:20px;border:1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                    <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Especialidad</span><br>
                    <span style="color:#111827;font-size:15px;font-weight:600;">${especialidad}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                    <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Profesional</span><br>
                    <span style="color:#111827;font-size:15px;font-weight:600;">Dr/a. ${profesional}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                    <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Fecha</span><br>
                    <span style="color:#111827;font-size:15px;font-weight:600;text-transform:capitalize;">${fechaFormateada}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                    <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Hora</span><br>
                    <span style="color:#111827;font-size:15px;font-weight:600;">${horaFormateada} hs.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Código de turno</span><br>
                    <span style="color:#b91c1c;font-size:16px;font-weight:800;font-family:monospace;letter-spacing:0.1em;">${codigoTurno}</span>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>

        <!-- Aviso -->
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:14px 16px;">
              <p style="margin:0;color:#713f12;font-size:13px;">
                ⏰ <strong>Recordá</strong> presentarte 10 minutos antes con tu DNI.
                Podés cancelar hasta 2 horas antes llamándonos o desde tu portal de paciente.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              SM Medicina Laboral · Sistema de turnos online<br>
              <span style="color:#d1d5db;">Powered by Turny</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY no configurada");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SM Medicina Laboral <onboarding@resend.dev>",
        to: [email],
        subject: `✅ Turno confirmado — ${fechaFormateada} a las ${horaFormateada} hs.`,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ ok: false, error: data }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
