// Autocomplete functionality for contact form fields
class ContactAutocomplete {
  constructor() {
    this.suggestions = {};
    this.activeIndex = -1;
    this.currentField = null;
    this.init();
  }

  init() {
    // Initialize autocomplete for all input fields
    this.setupNameAutocomplete();
    this.setupFieldAutocomplete();
    this.setupLabelAutocomplete();
  }

  setupNameAutocomplete() {
    const nameInput = document.getElementById('name');
    if (nameInput) {
      this.setupAutocomplete(nameInput, 'name');
    }
  }

  setupFieldAutocomplete() {
    // Setup for email, phone, address, social, note fields
    const fieldTypes = ['email', 'phone', 'address', 'social', 'note'];
    
    fieldTypes.forEach(type => {
      // Setup existing fields
      document.querySelectorAll(`input[name*="[${type}s]"][name*="[value]"]`).forEach(input => {
        if (input) {
          this.setupAutocomplete(input, type);
        }
      });

      // Setup dynamically added fields
      const addBtn = document.getElementById(`add-${type}`);
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          // Wait for the new field to be added
          setTimeout(() => {
            const newInput = document.querySelector(`input[name*="[${type}s]"][name*="[value]"]:not([data-autocomplete-initialized])`);
            if (newInput) {
              this.setupAutocomplete(newInput, type);
            }
          }, 100);
        });
      }
    });
  }

  setupLabelAutocomplete() {
    // Setup for label dropdowns (custom labels)
    document.querySelectorAll('select[name*="[label]"]').forEach(select => {
      if (select) {
        this.setupLabelAutocompleteForSelect(select);
      }
    });
  }

  setupAutocomplete(input, fieldType) {
    if (!input) return;
    
    try {
      if (input.dataset && input.dataset.autocompleteInitialized) return;
      if (input.dataset) {
        input.dataset.autocompleteInitialized = 'true';
      }
    } catch (error) {
      console.warn('Could not access dataset for input element:', error);
      return;
    }

    // Create suggestion container
    const container = document.createElement('div');
    container.className = 'autocomplete-suggestions';
    container.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      max-height: 150px;
      overflow-y: auto;
      z-index: 1000;
      width: 100%;
      display: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    // Position the container
    const inputGroup = input.closest('.input-group');
    if (inputGroup) {
      inputGroup.style.position = 'relative';
      inputGroup.appendChild(container);
    } else {
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(container);
    }

    let debounceTimer;
    
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          container.style.display = 'none';
          return;
        }
        this.fetchSuggestions(fieldType, query, container);
      }, 300);
    });

    input.addEventListener('keydown', (e) => {
      const suggestions = container.querySelectorAll('.suggestion-item');
      if (!suggestions.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.activeIndex = Math.min(this.activeIndex + 1, suggestions.length - 1);
          this.highlightSuggestion(suggestions);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.activeIndex = Math.max(this.activeIndex - 1, -1);
          this.highlightSuggestion(suggestions);
          break;
        case 'Enter':
          e.preventDefault();
          if (this.activeIndex >= 0 && suggestions[this.activeIndex]) {
            input.value = suggestions[this.activeIndex].textContent;
            container.style.display = 'none';
            this.activeIndex = -1;
          }
          break;
        case 'Escape':
          container.style.display = 'none';
          this.activeIndex = -1;
          break;
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && e.target !== input) {
        container.style.display = 'none';
        this.activeIndex = -1;
      }
    });
  }

  setupLabelAutocompleteForSelect(select) {
    if (!select) return;
    
    try {
      if (select.dataset && select.dataset.labelAutocompleteInitialized) return;
      if (select.dataset) {
        select.dataset.labelAutocompleteInitialized = 'true';
      }
    } catch (error) {
      console.warn('Could not access dataset for select element:', error);
      return;
    }

    select.addEventListener('focus', () => {
      const query = select.value.trim();
      if (query.length >= 2) {
        this.fetchSuggestions('label', query, select);
      }
    });

    select.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        this.fetchSuggestions('label', query, select);
      }
    });
  }

  async fetchSuggestions(fieldType, query, target) {
    try {
      const response = await fetch(`/contacts/autocomplete?field=${fieldType}&q=${encodeURIComponent(query)}`);
      const suggestions = await response.json();
      this.displaySuggestions(suggestions, target, fieldType);
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  }

  displaySuggestions(suggestions, target, fieldType) {
    if (target.tagName === 'SELECT') {
      // For select elements, add options
      const existingOptions = target.querySelectorAll('option[data-autocomplete]');
      existingOptions.forEach(opt => opt.remove());
      
      suggestions.forEach(suggestion => {
        const option = document.createElement('option');
        option.value = suggestion;
        option.textContent = suggestion;
        option.dataset.autocomplete = 'true';
        target.appendChild(option);
      });
    } else {
      // For input elements, show dropdown
      const container = target.parentElement.querySelector('.autocomplete-suggestions');
      if (!container) return;

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
          this.activeIndex = index;
          this.highlightSuggestion(container.querySelectorAll('.suggestion-item'));
        });
        
        item.addEventListener('click', () => {
          target.value = suggestion;
          container.style.display = 'none';
          this.activeIndex = -1;
        });
        
        container.appendChild(item);
      });
      
      container.style.display = 'block';
      this.activeIndex = -1;
    }
  }

  highlightSuggestion(suggestions) {
    suggestions.forEach((item, index) => {
      if (index === this.activeIndex) {
        item.style.backgroundColor = '#007bff';
        item.style.color = 'white';
      } else {
        item.style.backgroundColor = '';
        item.style.color = '';
      }
    });
  }
}

// Initialize autocomplete when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.contactAutocomplete = new ContactAutocomplete();
}); 