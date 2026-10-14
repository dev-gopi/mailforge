# Template 13 — Support Ticket Created

**Purpose:** Confirmation sent immediately after a customer creates a support ticket.
**Visual style:** Structured support case file, navy/teal/ice blue, Arial + Courier New for the ticket number.

## Files
- `13_support_ticket_created.html`: reusable HTML with double-brace placeholders
- `13_support_ticket_created_sample.html`: filled example for inspection
- `13_support_ticket_created.txt`: text fallback with placeholders
- `13_support_ticket_created_preview.png`: 800 px desktop preview
- `13_support_ticket_created_mobile.png`: 390 px mobile preview

## Placeholder data
- `brand_name`: application or service name
- `customer_name`: recipient's safe display name
- `ticket_number`: ticket ID
- `ticket_status`: localized current status, e.g. OPEN
- `ticket_subject`: ticket subject
- `created_at`: **formatted date and time with timezone**
- `ticket_url`: absolute HTTPS URL to view the ticket
- `support_email`: verified support address
- `year`: four-digit year

## Production checklist
- HTML-escape all untrusted dynamic text and attribute values.
- Validate allowed HTTPS destinations for `ticket_url`; never accept an untrusted arbitrary redirect.
- Authenticate and authorize access to support tickets on the server; never rely on an unguessable URL alone.
- Provide a real Reply-To inbox if customers can reply; otherwise direct them to the support address.
- Send a multipart/alternative email using the HTML and text templates.
- Replace all placeholders, localize text/dates, and verify no placeholders remain.
- Test the final message in Gmail, Outlook, and Apple Mail (browser previews do not prove inbox rendering).
