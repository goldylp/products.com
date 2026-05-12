const HUBSPOT_API_BASE = 'https://api.hubapi.com';

const buildHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
});

const splitName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/);
  const firstName = parts.shift() || '';
  const lastName = parts.join(' ');
  return { firstName, lastName };
};

const searchContactByEmail = async (email, token) => {
  const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
      properties: ['email'],
      limit: 1
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HubSpot search failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.results && data.results[0] ? data.results[0].id : null;
};

const upsertContact = async (contactId, properties, token) => {
  const url = contactId
    ? `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`
    : `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`;

  const response = await fetch(url, {
    method: contactId ? 'PATCH' : 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ properties })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HubSpot ${contactId ? 'update' : 'create'} failed (${response.status}): ${text}`);
  }

  return response.json();
};

const createNote = async (contactId, body, token) => {
  if (!body) return;

  const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/notes`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({
      properties: {
        hs_note_body: body,
        hs_timestamp: Date.now()
      },
      associations: [{
        to: { id: contactId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }]
      }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HubSpot note create failed (${response.status}): ${text}`);
  }

  return response.json();
};

const syncContactToHubspot = async ({ name, email, phone, subject, message }) => {
  const token = process.env.HUBSPOT_TOKEN;

  if (!token || token === 'your_full_token') {
    console.warn('[HubSpot] Skipping sync — HUBSPOT_TOKEN not configured');
    return { skipped: true, reason: 'HUBSPOT_TOKEN not configured' };
  }

  const { firstName, lastName } = splitName(name);

  const properties = {
    email,
    firstname: firstName,
    lastname: lastName
  };

  if (phone) {
    properties.phone = phone;
  }

  console.log('[HubSpot] Syncing contact:', email);

  const existingId = await searchContactByEmail(email, token);
  const result = await upsertContact(existingId, properties, token);

  console.log(`[HubSpot] Contact ${existingId ? 'updated' : 'created'} (id=${result.id})`);

  const noteBody = [
    subject ? `<b>Subject:</b> ${subject}` : '',
    message ? `<b>Message:</b><br>${String(message).replace(/\n/g, '<br>')}` : ''
  ].filter(Boolean).join('<br><br>');

  if (noteBody) {
    try {
      await createNote(result.id, noteBody, token);
      console.log('[HubSpot] Note attached to contact', result.id);
    } catch (err) {
      console.error('[HubSpot] Note attach failed:', err.message);
    }
  }

  return { contactId: result.id, updated: Boolean(existingId) };
};

module.exports = {
  syncContactToHubspot
};
