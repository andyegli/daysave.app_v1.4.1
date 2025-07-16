document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('contact-search');
  const table = document.querySelector('.contact-list table');
  const tbody = document.getElementById('contacts-tbody');
  const noMsg = document.getElementById('no-contacts-message');
  if (!searchInput || !table || !tbody) return;

  // Setup autocomplete for search field
  setupSearchAutocomplete(searchInput);

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
          <form method="POST" action="/contacts/${contact.id}/delete" class="d-inline">
            <button type="submit" class="btn btn-sm btn-outline-danger delete-contact-btn" data-contact-name="${contact.name || 'this contact'}"><i class="fa fa-trash"></i> Delete</button>
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

  // Autocomplete functionality for search field
  function setupSearchAutocomplete(input) {
    // Create suggestion container
    const container = document.createElement('div');
    container.className = 'search-autocomplete-suggestions';
    container.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      width: 100%;
      display: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-radius: 0 0 4px 4px;
    `;
    
    // Position the container
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(container);

    let activeIndex = -1;
    let debounceTimer;
    
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          container.style.display = 'none';
          return;
        }
        fetchSearchSuggestions(query, container);
      }, 300);
    });

    input.addEventListener('keydown', (e) => {
      const suggestions = container.querySelectorAll('.suggestion-item');
      if (!suggestions.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
          highlightSuggestion(suggestions, activeIndex);
          break;
        case 'ArrowUp':
          e.preventDefault();
          activeIndex = Math.max(activeIndex - 1, -1);
          highlightSuggestion(suggestions, activeIndex);
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && suggestions[activeIndex]) {
            input.value = suggestions[activeIndex].textContent;
            container.style.display = 'none';
            activeIndex = -1;
            // Trigger search
            input.dispatchEvent(new Event('input'));
          }
          break;
        case 'Escape':
          container.style.display = 'none';
          activeIndex = -1;
          break;
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && e.target !== input) {
        container.style.display = 'none';
        activeIndex = -1;
      }
    });
  }

  async function fetchSearchSuggestions(query, container) {
    try {
      // Get suggestions from all field types
      const fieldTypes = ['name', 'email', 'phone', 'address', 'social', 'note'];
      const allSuggestions = new Set();
      
      for (const fieldType of fieldTypes) {
        const response = await fetch(`/contacts/autocomplete?field=${fieldType}&q=${encodeURIComponent(query)}`);
        const suggestions = await response.json();
        suggestions.forEach(suggestion => allSuggestions.add(suggestion));
      }
      
      displaySearchSuggestions(Array.from(allSuggestions).slice(0, 15), container);
    } catch (error) {
      console.error('Search autocomplete error:', error);
    }
  }

  function displaySearchSuggestions(suggestions, container) {
    container.innerHTML = '';
    
    if (suggestions.length === 0) {
      container.style.display = 'none';
      return;
    }

    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.textContent = suggestion;
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
      `;
      
      item.addEventListener('mouseenter', () => {
        highlightSuggestion(container.querySelectorAll('.suggestion-item'), index);
      });
      
      item.addEventListener('click', () => {
        const searchInput = document.getElementById('contact-search');
        searchInput.value = suggestion;
        container.style.display = 'none';
        // Trigger search
        searchInput.dispatchEvent(new Event('input'));
      });
      
      container.appendChild(item);
    });
    
    container.style.display = 'block';
  }

  function highlightSuggestion(suggestions, activeIndex) {
    suggestions.forEach((item, index) => {
      if (index === activeIndex) {
        item.style.backgroundColor = '#007bff';
        item.style.color = 'white';
      } else {
        item.style.backgroundColor = '';
        item.style.color = '';
      }
    });
  }

  // Handle delete contact confirmations (for both static and dynamic content)
  function setupDeleteConfirmations() {
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('delete-contact-btn')) {
        e.preventDefault();
        
        const contactName = e.target.getAttribute('data-contact-name');
        const confirmed = confirm(`Delete contact "${contactName}"?`);
        
        if (confirmed) {
          // Submit the form
          e.target.closest('form').submit();
        }
      }
    });
  }

  // Setup delete confirmations
  setupDeleteConfirmations();
}); 