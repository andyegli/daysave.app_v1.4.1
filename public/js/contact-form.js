document.addEventListener('DOMContentLoaded', function() {
  console.log('Add email button script loaded');
  const addEmailBtn = document.getElementById('add-email');
  const emailsList = document.getElementById('emails-list');
  console.log('addEmailBtn:', addEmailBtn);
  console.log('emailsList:', emailsList);
  function getNextIndex(list, rowClass) {
    return list.querySelectorAll('.' + rowClass).length;
  }
  function handleCustomLabel(select, type) {
    select.addEventListener('change', function() {
      if (select.value === '__custom__') {
        const custom = prompt('Enter a custom label for this ' + type + ':');
        if (custom && custom.trim()) {
          const opt = document.createElement('option');
          opt.value = custom.trim();
          opt.textContent = custom.trim();
          select.appendChild(opt);
          select.value = custom.trim();
          // Update the input placeholder to reflect the new label
          const input = select.parentElement.querySelector('input');
          if (input) {
            input.placeholder = custom.trim();
          }
        } else {
          select.value = (type === 'email') ? 'other' : (type === 'phone' ? 'other' : (type === 'address' ? 'other' : 'other'));
        }
      } else {
        // Reset placeholder to default if not custom
        const input = select.parentElement.querySelector('input');
        if (input) {
          if (type === 'email') input.placeholder = 'Email';
          else if (type === 'phone') input.placeholder = 'Phone';
          else if (type === 'address') input.placeholder = 'Address';
          else if (type === 'note') input.placeholder = 'Note';
        }
      }
    });
  }
  // Email fields
  if (addEmailBtn && emailsList) {
    addEmailBtn.onclick = function() {
      const idx = getNextIndex(emailsList, 'email-row');
      const row = document.createElement('div');
      row.className = 'input-group mb-2 email-row';
      row.innerHTML = `
        <select class="form-select form-select-sm" name="emails[${idx}][label]" style="max-width: 100px;">
          <option value="home">Home</option>
          <option value="work">Work</option>
          <option value="other">Other</option>
        </select>
        <input type="email" class="form-control" name="emails[${idx}][value]" placeholder="Email">
        <button type="button" class="btn btn-outline-danger remove-email">–</button>
      `;
      emailsList.appendChild(row);
      row.querySelector('.remove-email').onclick = function() { row.remove(); };
      handleCustomLabel(row.querySelector('select'), 'email');
      
      // Initialize autocomplete for the new email input
      const newEmailInput = row.querySelector('input[name*="[value]"]');
      if (newEmailInput && window.contactAutocomplete) {
        window.contactAutocomplete.setupAutocomplete(newEmailInput, 'email');
      }
    };
    emailsList.querySelectorAll('.remove-email').forEach(btn => {
      btn.disabled = emailsList.querySelectorAll('.email-row').length <= 1 ? true : false;
      btn.onclick = function() {
        if (emailsList.querySelectorAll('.email-row').length > 1) btn.closest('.email-row').remove();
      };
    });
    emailsList.querySelectorAll('select').forEach(function(select) {
      handleCustomLabel(select, 'email');
    });
  }
  // Phone fields
  const phonesList = document.getElementById('phones-list');
  const addPhoneBtn = document.getElementById('add-phone');
  if (addPhoneBtn && phonesList) {
    addPhoneBtn.onclick = function() {
      const idx = getNextIndex(phonesList, 'phone-row');
      const row = document.createElement('div');
      row.className = 'input-group mb-2 phone-row';
      row.innerHTML = `
        <select class="form-select form-select-sm" name="phones[${idx}][label]" style="max-width: 100px;">
          <option value="mobile">Mobile</option>
          <option value="home">Home</option>
          <option value="work">Work</option>
          <option value="other">Other</option>
        </select>
        <input type="text" class="form-control" name="phones[${idx}][value]" placeholder="Phone">
        <button type="button" class="btn btn-outline-danger remove-phone">–</button>
      `;
      phonesList.appendChild(row);
      row.querySelector('.remove-phone').onclick = function() { row.remove(); };
      handleCustomLabel(row.querySelector('select'), 'phone');
      
      // Initialize autocomplete for the new phone input
      const newPhoneInput = row.querySelector('input[name*="[value]"]');
      if (newPhoneInput && window.contactAutocomplete) {
        window.contactAutocomplete.setupAutocomplete(newPhoneInput, 'phone');
      }
    };
    phonesList.querySelectorAll('.remove-phone').forEach(btn => {
      btn.disabled = phonesList.querySelectorAll('.phone-row').length <= 1 ? true : false;
      btn.onclick = function() {
        if (phonesList.querySelectorAll('.phone-row').length > 1) btn.closest('.phone-row').remove();
      };
    });
    phonesList.querySelectorAll('select').forEach(function(select) {
      handleCustomLabel(select, 'phone');
    });
  }
  // Address fields
  const addressesList = document.getElementById('addresses-list');
  const addAddressBtn = document.getElementById('add-address');
  if (addAddressBtn && addressesList) {
    addAddressBtn.onclick = function() {
      const idx = getNextIndex(addressesList, 'address-row');
      const row = document.createElement('div');
      row.className = 'input-group mb-2 address-row';
      row.innerHTML = `
        <select class="form-select form-select-sm" name="addresses[${idx}][label]" style="max-width: 100px;">
          <option value="home">Home</option>
          <option value="work">Work</option>
          <option value="other">Other</option>
        </select>
        <input type="text" class="form-control" name="addresses[${idx}][value]" placeholder="Address">
        <button type="button" class="btn btn-outline-danger remove-address">–</button>
      `;
      addressesList.appendChild(row);
      row.querySelector('.remove-address').onclick = function() { row.remove(); };
      handleCustomLabel(row.querySelector('select'), 'address');
      
      // Initialize autocomplete for the new address input
      const newAddressInput = row.querySelector('input[name*="[value]"]');
      if (newAddressInput) {
        // Setup Google Maps Places autocomplete
        if (window.contactMapsAutocomplete) {
          window.contactMapsAutocomplete.initializeAddressFields();
        }
        // Also setup regular autocomplete as fallback
        if (window.contactAutocomplete) {
          window.contactAutocomplete.setupAutocomplete(newAddressInput, 'address');
        }
      }
    };
    addressesList.querySelectorAll('.remove-address').forEach(btn => {
      btn.disabled = addressesList.querySelectorAll('.address-row').length <= 1 ? true : false;
      btn.onclick = function() {
        if (addressesList.querySelectorAll('.address-row').length > 1) btn.closest('.address-row').remove();
      };
    });
    addressesList.querySelectorAll('select').forEach(function(select) {
      handleCustomLabel(select, 'address');
    });
  }
  // Note fields
  const notesList = document.getElementById('notes-list');
  const addNoteBtn = document.getElementById('add-note');
  if (addNoteBtn && notesList) {
    addNoteBtn.onclick = function() {
      const idx = getNextIndex(notesList, 'note-row');
      const row = document.createElement('div');
      row.className = 'input-group mb-2 note-row';
      row.innerHTML = `
        <select class="form-select form-select-sm" name="notes[${idx}][label]" style="max-width: 100px;">
          <option value="note">Note</option>
          <option value="other">Other</option>
        </select>
        <input type="text" class="form-control" name="notes[${idx}][value]" placeholder="Note">
        <button type="button" class="btn btn-outline-danger remove-note">–</button>
      `;
      notesList.appendChild(row);
      row.querySelector('.remove-note').onclick = function() { row.remove(); };
      handleCustomLabel(row.querySelector('select'), 'note');
      
      // Initialize autocomplete for the new note input
      const newNoteInput = row.querySelector('input[name*="[value]"]');
      if (newNoteInput && window.contactAutocomplete) {
        window.contactAutocomplete.setupAutocomplete(newNoteInput, 'note');
      }
    };
    notesList.querySelectorAll('.remove-note').forEach(btn => {
      btn.disabled = notesList.querySelectorAll('.note-row').length <= 1 ? true : false;
      btn.onclick = function() {
        if (notesList.querySelectorAll('.note-row').length > 1) btn.closest('.note-row').remove();
      };
    });
    notesList.querySelectorAll('select').forEach(function(select) {
      handleCustomLabel(select, 'note');
    });
  }
  // Social fields
  const socialsList = document.getElementById('socials-list');
  const addSocialBtn = document.getElementById('add-social');
  function handleCustomSocialLabel(select) {
    select.addEventListener('change', function() {
      if (select.value === '__custom__') {
        const custom = prompt('Enter a custom label for this social profile (e.g., Mastodon, Bluesky, etc.):');
        if (custom && custom.trim()) {
          // Add new option and select it
          const opt = document.createElement('option');
          opt.value = custom.trim();
          opt.textContent = custom.trim();
          select.appendChild(opt);
          select.value = custom.trim();
          // Update the input placeholder to reflect the new channel
          const input = select.parentElement.querySelector('input[type="text"]');
          if (input) {
            input.placeholder = custom.trim() + ' URL or handle';
          }
        } else {
          select.value = 'other';
        }
      } else {
        // Reset placeholder to default if not custom
        const input = select.parentElement.querySelector('input[type="text"]');
        if (input) {
          if (select.value === 'twitter') input.placeholder = 'Profile URL or handle';
          else if (select.value === 'facebook') input.placeholder = 'Profile URL or handle';
          else if (select.value === 'instagram') input.placeholder = 'Profile URL or handle';
          else if (select.value === 'linkedin') input.placeholder = 'Profile URL or handle';
          else if (select.value === 'tiktok') input.placeholder = 'Profile URL or handle';
          else input.placeholder = 'Profile URL or handle';
        }
      }
    });
  }
  if (addSocialBtn && socialsList) {
    addSocialBtn.onclick = function() {
      const idx = getNextIndex(socialsList, 'social-row');
      const row = document.createElement('div');
      row.className = 'input-group mb-2 social-row';
      row.innerHTML = `
        <select class="form-select form-select-sm" name="social_profiles[${idx}][label]" style="max-width: 100px;">
          <option value="twitter">Twitter</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option>
          <option value="tiktok">TikTok</option>
          <option value="other">Other</option>
          <option value="__custom__">Other...</option>
        </select>
        <input type="text" class="form-control" name="social_profiles[${idx}][value]" placeholder="Profile URL or handle">
        <button type="button" class="btn btn-outline-danger remove-social">–</button>
      `;
      socialsList.appendChild(row);
      const select = row.querySelector('select');
      handleCustomSocialLabel(select);
      row.querySelector('.remove-social').onclick = function() { row.remove(); };
      
      // Initialize autocomplete for the new social input
      const newSocialInput = row.querySelector('input[name*="[value]"]');
      if (newSocialInput && window.contactAutocomplete) {
        window.contactAutocomplete.setupAutocomplete(newSocialInput, 'social');
      }
    };
    socialsList.querySelectorAll('.remove-social').forEach(btn => {
      btn.disabled = socialsList.querySelectorAll('.social-row').length <= 1 ? true : false;
      btn.onclick = function() {
        if (socialsList.querySelectorAll('.social-row').length > 1) btn.closest('.social-row').remove();
      };
    });
    // Attach handler to existing selects
    socialsList.querySelectorAll('select').forEach(handleCustomSocialLabel);
  }
}); 