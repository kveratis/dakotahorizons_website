export const FROM_ADDRESS = "noreply@dakotahorizons.com";
export const TO_ADDRESS = "service@dakotahorizons.com";

export function renderEmail(message) {
  if (message?.type === "contact") {
    return renderContactEmail(message);
  }

  throw new Error("Unsupported form email message type");
}

export function renderContactEmail(message) {
  const p = message.payload;
  const rows = [
    ["Submission ID", message.submissionId],
    ["Submitted at", message.submittedAt],
    ["Name", p.name],
    ["Email", p.email],
    ["Phone", p.phone],
    ["Business", p.business],
    ["Interested in", p.interest],
    ["Message", p.message]
  ];

  return buildEmail({
    replyTo: p.email,
    subject: `New inquiry from ${p.name}${p.business ? ` (${p.business})` : ""}`,
    heading: "New website inquiry",
    rows
  });
}

function buildEmail({ replyTo, subject, heading, rows }) {
  return {
    from: FROM_ADDRESS,
    to: TO_ADDRESS,
    replyTo,
    subject: stripLineBreaks(subject),
    text: renderText(heading, rows),
    html: renderHtml(heading, rows)
  };
}

function renderText(heading, rows) {
  const lines = [heading, ""];
  for (const [label, value] of rows) {
    lines.push(`${label}: ${formatValue(value)}`);
  }
  return lines.join("\n");
}

function renderHtml(heading, rows) {
  const htmlRows = rows
    .map(([label, value]) => {
      const cell = escapeHtml(formatValue(value)).replaceAll("\n", "<br>");
      return `<tr><th align="left" valign="top" style="padding:6px 16px 6px 0;color:#5b5866;font-weight:600;">${escapeHtml(label)}</th><td style="padding:6px 0;color:#1b1b1f;">${cell}</td></tr>`;
    })
    .join("");

  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;"><h1 style="font-size:20px;color:#1b1b1f;">${escapeHtml(heading)}</h1><table cellspacing="0" cellpadding="0">${htmlRows}</table></body></html>`;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }
  return String(value);
}

function stripLineBreaks(value) {
  return String(value).replace(/[\r\n]+/g, " ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
