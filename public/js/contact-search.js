document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('contact-search');
  const table = document.querySelector('.contact-list table');
  const tbody = document.getElementById('contacts-tbody');
  const noMsg = document.getElementById('no-contacts-message');
  if (!searchInput || !table || !tbody) return;

  // Helper: highlight matches
  function highlight(text, query) {
    if (!query) return text;
    // Support advanced: highlight all tokens
    let tokens = query.split(/\s+/).filter(Boolean);
    let result = text;
    tokens.forEach(token => {
      if (!token) return;
      let re = new RegExp('(' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      result = result.replace(re, '<mark>$1</mark>');
    });
    return result;
  }

  // Render contacts
  function renderContacts(contacts, query) {
    tbody.innerHTML = '';
    if (!contacts.length) {
      noMsg.style.display = '';
      table.style.display = 'none';
      return;
    }
    noMsg.style.display = 'none';
    table.style.display = '';
    contacts.forEach(contact => {
      let owner = contact.User ? ((contact.User.first_name || contact.User.username) + ' (' + contact.User.email + ')') : '-';
      let emails = (contact.emails && contact.emails.length) ? contact.emails.map(e => e.label + ': ' + e.value).join(', ') : '-';
      let phones = (contact.phones && contact.phones.length) ? contact.phones.map(p => p.label + ': ' + p.value).join(', ') : '-';
      let addresses = (contact.addresses && contact.addresses.length) ? contact.addresses.map(a => a.label + ': ' + a.value).join(', ') : '-';
      let notes = (contact.notes && contact.notes.length) ? contact.notes.map(n => n.value).join(' ') : '';
      let socials = (contact.social_profiles && contact.social_profiles.length) ? contact.social_profiles.map(s => s.value).join(' ') : '';
      let row = document.createElement('tr');
      row.setAttribute('data-notes', notes);
      row.setAttribute('data-socials', socials);
      row.innerHTML = `
        <td><div class="d-flex align-items-center"><div class="contact-avatar">${contact.name ? contact.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}</div>${highlight(contact.name || '-', query)}</div></td>
        <td>${highlight(emails, query)}</td>
        <td>${highlight(phones, query)}</td>
        <td>${highlight(addresses, query)}</td>
        ${owner !== undefined ? `<td>${highlight(owner, query)}</td>` : ''}
        <td>
          <a href="/contacts/${contact.id}/edit" class="btn btn-sm btn-outline-primary me-2"><i class="fa fa-edit"></i> Edit</a>
          <form method="POST" action="/contacts/${contact.id}/delete" class="d-inline" onsubmit="return confirm('Delete this contact?');">
            <button type="submit" class="btn btn-sm btn-outline-danger"><i class="fa fa-trash"></i> Delete</button>
          </form>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  let lastQuery = '';
  let searchTimeout;
  searchInput.addEventListener('input', function() {
    const query = searchInput.value.trim();
    if (query === lastQuery) return;
    lastQuery = query;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetch(`/contacts/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
          renderContacts(data, query);
        });
    }, 150);
  });
}); 