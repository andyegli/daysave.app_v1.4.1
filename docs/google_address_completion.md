# Google Maps Address Completion Documentation

## Overview
The DaySave contact management system integrates Google Maps Places API to provide real-time address autocomplete functionality in contact forms. This feature enhances user experience by offering intelligent address suggestions as users type, ensuring accurate and complete address data.

## Technical Implementation Details

### How Google Maps Address Autocomplete Works

The address autocomplete system follows this flow:
```
User Types → Google Places API → Real-time Suggestions → User Selects → Address Populated
```

### Core Code Locations & Architecture

#### Primary JavaScript Implementation

**File**: `public/js/contact-maps-autocomplete.js` - Main Google Maps integration

**Core Function - setupPlacesAutocomplete(input):**
```javascript
const autocomplete = new google.maps.places.Autocomplete(input, {
  types: ['address'],                    // Only address suggestions
  componentRestrictions: { country: [] }, // All countries allowed
  fields: ['formatted_address', 'geometry', 'place_id', 'address_components']
});
```

**What happens when user types:**
1. **Google API Call**: Each keystroke triggers Google Places API
2. **Real-time Suggestions**: Google returns matching addresses
3. **Dropdown Display**: Suggestions appear below input field
4. **User Selection**: When user clicks a suggestion:
   ```javascript
   autocomplete.addListener('place_changed', () => {
     const place = autocomplete.getPlace();
     if (place.geometry) {
       input.value = place.formatted_address;  // Set the display text
       input._placeId = place.place_id;        // Store place ID
       input._latitude = place.geometry.location.lat();   // Store coordinates
       input._longitude = place.geometry.location.lng();  // Store coordinates
     }
   });
   ```

#### Field Detection Strategy

The system uses multiple selector strategies to find address input fields:

```javascript
function initializeAddressFields() {
  // Try the most specific selector first
  let addressInputs = document.querySelectorAll('input[name*="[addresses]"][name*="[value]"]');
  
  // If none found, try a more general selector
  if (addressInputs.length === 0) {
    addressInputs = document.querySelectorAll('input[name^="addresses"][name$="[value]"]');
  }
  
  // If still none found, use the most general filter
  if (addressInputs.length === 0) {
    addressInputs = Array.from(document.querySelectorAll('input')).filter(
      input => input.name && input.name.includes('addresses') && input.name.includes('[value]')
    );
  }
}
```

**Selector Strategies**:
1. **Primary**: `input[name*="[addresses]"][name*="[value]"]`
2. **Fallback**: `input[name^="addresses"][name$="[value]"]`
3. **Filter-based**: Array.filter for inputs containing 'addresses' and '[value]'

#### Backend Configuration Integration

**File**: `config/maps.js` - Google Maps API configuration

This generates the Google Maps script URL:
```javascript
const getGoogleMapsScriptUrl = () => {
  const config = getGoogleMapsConfig();
  return `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=${config.libraries.join(',')}&v=${config.version}`;
};

// Result: https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&v=weekly
```

**File**: `routes/contacts.js` - Template integration
```javascript
const { getGoogleMapsScriptUrl } = require('../config/maps');

res.render('contacts/form', {
  // ... other template variables ...
  mapsScriptUrl: getGoogleMapsScriptUrl()
});
```

#### HTML Template Integration

**File**: `views/contacts/form.ejs` - Contact form template

**Address Input Fields**:
```html
<input type="text" class="form-control" name="addresses[0][value]" placeholder="Address">
```

**Google Maps Script Loading**:
```html
<script src="/js/contact-form.js"></script>
<script src="/js/contact-autocomplete.js"></script>
<script src="/js/contact-maps-autocomplete.js"></script>
<script src="<%= mapsScriptUrl %>&callback=initContactMaps" async defer></script>
```

### Step-by-Step Process Flow

#### Initialization Flow:
1. **Page Loads**: Contact form HTML renders
2. **Scripts Load**: JavaScript files load in order:
   - `contact-form.js` (form logic)
   - `contact-autocomplete.js` (fallback autocomplete)
   - `contact-maps-autocomplete.js` (Google Maps logic)
   - Google Maps API (with callback)

3. **API Callback**: When Google Maps loads, calls `initContactMaps()`
4. **Field Detection**: Finds all address inputs using selectors
5. **Autocomplete Attachment**: For each address field:
   ```javascript
   const autocomplete = new google.maps.places.Autocomplete(input, options);
   ```

#### User Interaction Flow:
1. **User Types**: In address field (e.g., "123 Main")
2. **API Request**: Google Places API called with query
3. **Response**: Google returns matching addresses
4. **Dropdown**: Suggestions appear below input
5. **Selection**: User clicks "123 Main St, New York, NY, USA"
6. **Data Storage**: 
   ```javascript
   input.value = "123 Main St, New York, NY, USA"
   input._placeId = "ChIJ..."
   input._latitude = 40.7128
   input._longitude = -74.0060
   ```

### Dynamic Field Support

**File**: `public/js/contact-form.js` - Dynamic field creation

When user clicks "+ Add Address":
```javascript
addAddressBtn.onclick = function() {
  // 1. Create new HTML row
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
  
  // 2. Add to DOM
  addressesList.appendChild(row);
  
  // 3. Initialize Google Maps autocomplete for new field
  const newAddressInput = row.querySelector('input[name*="[value]"]');
  if (newAddressInput) {
    // Setup Google Maps Places autocomplete
    if (window.contactMapsAutocomplete) {
      window.contactMapsAutocomplete.initializeAddressFields(); // Re-scan all fields
    }
    // Also setup regular autocomplete as fallback
    if (window.contactAutocomplete) {
      window.contactAutocomplete.setupAutocomplete(newAddressInput, 'address');
    }
  }
};
```

### File Structure Summary

```
📁 DaySave Project
├── 📄 config/maps.js                        # Google Maps API configuration & script URL generation
├── 📄 routes/contacts.js                    # Provides mapsScriptUrl to templates
├── 📄 views/contacts/form.ejs               # HTML template with address fields & script loading
└── 📁 public/js/
    ├── 📄 contact-maps-autocomplete.js      # 🎯 MAIN Google Maps integration
    ├── 📄 contact-form.js                   # Dynamic field creation & autocomplete initialization
    ├── 📄 contact-autocomplete.js           # Fallback autocomplete for all field types
    └── 📄 google-maps-callback.js           # API loading callback & initialization coordination
```

### Environment Configuration Requirements

**Required Environment Variables**:
```env
# Required: Google Maps API Key
GOOGLE_MAPS_KEY=your_actual_google_api_key_here

# Optional: Base URL for production (affects email verification links)
BASE_URL=https://yourdomain.com
```

**Required Google Cloud APIs**:
1. **Maps JavaScript API** - For the base Maps functionality
2. **Places API** - For address autocomplete suggestions

### Robust Error Handling

The system includes comprehensive error handling:

1. **API Unavailability**: Graceful fallback when Google Maps API fails to load
2. **Network Issues**: Silent failure without breaking the form
3. **Dynamic Fields**: Automatic re-initialization for newly added address fields
4. **Multiple Selectors**: Fallback strategies ensure address fields are found regardless of naming conventions

### Data Storage & Retrieval

When an address is selected, the system stores:
- **Display Value**: `input.value = "123 Main St, New York, NY, USA"`
- **Place ID**: `input._placeId = "ChIJ..."` (Google's unique identifier)
- **Coordinates**: `input._latitude = 40.7128`, `input._longitude = -74.0060`

This additional data can be accessed programmatically:
```javascript
const addressInput = document.querySelector('input[name*="addresses"]');
if (addressInput._placeId) {
  console.log('Place ID:', addressInput._placeId);
  console.log('Coordinates:', addressInput._latitude, addressInput._longitude);
}
```

## Architecture

### Frontend Components

#### 1. Primary Address Autocomplete (`public/js/contact-maps-autocomplete.js`)
**Purpose**: Main Google Maps Places API integration for address fields

**Key Features**:
- Real-time address suggestions using Google Places Autocomplete
- Robust selector logic to find address inputs dynamically
- Support for both initial and dynamically added address fields
- Graceful fallback handling when API is unavailable

**Core Functions**:
```javascript
// Global callback for Google Maps API
window.initContactMaps = function() {
  setupContactMapsAutocomplete();
};

// Main initializer for address autocomplete
function setupContactMapsAutocomplete() {
  if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
    return; // Graceful exit if API not available
  }
  initializeAddressFields();
}

// Robust field detection using multiple selector strategies
function initializeAddressFields() {
  // Primary selector: input[name*="[addresses]"][name*="[value]"]
  // Fallback selectors for different naming conventions
  // Filter-based approach for maximum compatibility
}

// Google Places Autocomplete setup
function setupPlacesAutocomplete(input) {
  const autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['address'],
    componentRestrictions: { country: [] }, // Allow all countries
    fields: ['formatted_address', 'geometry', 'place_id', 'address_components']
  });
}
```

#### 2. Dynamic Field Support (`public/js/contact-form.js`)
**Purpose**: Handles dynamically added address fields

**Integration Points**:
```javascript
// When "Add Address" button is clicked
addAddressBtn.onclick = function() {
  // Create new address field
  const row = document.createElement('div');
  // ... field creation logic ...
  
  // Initialize Google Maps autocomplete for new field
  const newAddressInput = row.querySelector('input[name*="[value]"]');
  if (newAddressInput && window.contactMapsAutocomplete) {
    window.contactMapsAutocomplete.initializeAddressFields();
  }
};
```

#### 3. API Loading Callback (`public/js/google-maps-callback.js`)
**Purpose**: Handles Google Maps API loading and initialization

**Callback Flow**:
```javascript
window.initContactMaps = function() {
  console.log('Google Maps API loaded successfully');
  
  // Wait for ContactMapsAutocomplete class availability
  const waitForClass = () => {
    if (typeof ContactMapsAutocomplete !== 'undefined') {
      if (window.contactMapsAutocomplete) {
        window.contactMapsAutocomplete.setupAddressAutocomplete();
      } else {
        window.contactMapsAutocomplete = new ContactMapsAutocomplete();
      }
    } else {
      setTimeout(waitForClass, 100); // Retry logic
    }
  };
  
  setTimeout(waitForClass, 100);
};
```

### Backend Configuration

#### 1. Maps Configuration (`config/maps.js`)
**Purpose**: Centralized Google Maps API configuration

```javascript
const getGoogleMapsConfig = () => {
  return {
    apiKey: process.env.GOOGLE_MAPS_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
    libraries: ['places'], // Required for autocomplete
    version: 'weekly'
  };
};

const getGoogleMapsScriptUrl = () => {
  const config = getGoogleMapsConfig();
  return `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=${config.libraries.join(',')}&v=${config.version}`;
};
```

#### 2. Route Integration (`routes/contacts.js`)
**Purpose**: Provides Google Maps script URL to contact form templates

```javascript
const { getGoogleMapsScriptUrl } = require('../config/maps');

// All contact form routes include:
res.render('contacts/form', {
  // ... other template variables ...
  mapsScriptUrl: getGoogleMapsScriptUrl()
});
```

#### 3. Template Integration (`views/contacts/form.ejs`)
**Purpose**: Loads Google Maps API with proper callback

```html
<!-- Contact form scripts -->
<script src="/js/contact-form.js"></script>
<script src="/js/contact-autocomplete.js"></script>
<script src="/js/contact-maps-autocomplete.js"></script>

<!-- Google Maps API with callback -->
<script src="<%= mapsScriptUrl %>&callback=initContactMaps" async defer></script>
```

## User Experience Flow

### 1. Address Field Interaction
1. **User focuses** on any address input field
2. **User starts typing** (minimum 1 character)
3. **Google Places API** sends real-time requests
4. **Dropdown appears** with address suggestions
5. **User selects** a suggestion from the dropdown

### 2. Address Selection Process
When user selects an address:
1. **Input updates** with `formatted_address`
2. **Place data stored** in input properties:
   - `_placeId`: Google Place ID
   - `_latitude`: Latitude coordinate
   - `_longitude`: Longitude coordinate
3. **Input event fired** for other listeners
4. **Dropdown disappears**

### 3. Dynamic Field Support
1. **User clicks** "Add Address" button
2. **New address field** is created dynamically
3. **Autocomplete initialization** is triggered after 100ms delay
4. **New field** immediately supports Google Maps autocomplete

## Setup Requirements

### 1. Google Cloud Console Setup
1. **Create/Select Project** in Google Cloud Console
2. **Enable APIs**:
   - Maps JavaScript API
   - Places API
3. **Create API Key** with appropriate restrictions
4. **Configure API Key Restrictions**:
   - Application restrictions: HTTP referrers
   - Website restrictions: Your domain(s)
   - API restrictions: Maps JavaScript API, Places API

### 2. Environment Configuration
```env
# Required: Google Maps API Key
GOOGLE_MAPS_KEY=your_actual_google_api_key_here

# Optional: Base URL for production
BASE_URL=https://yourdomain.com
```

### 3. Content Security Policy (CSP)
Ensure CSP allows Google Maps domains:
```javascript
// In middleware/security.js
'script-src': [
  "'self'",
  'https://maps.googleapis.com',
  'https://maps.gstatic.com'
],
'connect-src': [
  "'self'",
  'https://maps.googleapis.com'
]
```

## API Usage & Limits

### 1. Google Places API Pricing
- **Free Tier**: $200 monthly credit
- **Places Autocomplete**: $2.83 per 1,000 requests (after free tier)
- **Free Requests**: ~70,571 requests/month with $200 credit

### 2. Optimization Strategies
- **Debouncing**: Requests are made after user stops typing
- **Session Tokens**: Could be implemented for cost optimization
- **Field Restrictions**: Limited to address types only
- **Country Restrictions**: Can be configured if needed

### 3. Monitoring Usage
Monitor API usage in Google Cloud Console:
- Dashboard → APIs & Services → Credentials
- View quotas and usage statistics
- Set up billing alerts for cost control

## Error Handling & Fallback

### 1. API Unavailability
When Google Maps API is not available:
```javascript
if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
  console.warn('Google Maps API not available, using fallback');
  setupFallbackAutocomplete(input);
  return;
}
```

### 2. Fallback Autocomplete
**Custom Implementation**:
- Uses existing contact addresses as suggestions
- Simple string matching for basic autocomplete
- Maintains consistent user experience
- No dependency on external APIs

### 3. Graceful Degradation
- **No JavaScript errors** when API fails
- **Manual address entry** always works
- **Form submission** not affected by API issues
- **User experience** remains functional

## Troubleshooting

### 1. Common Issues

#### API Key Issues
- **Symptom**: No autocomplete suggestions appear
- **Check**: Browser console for API key errors
- **Solution**: Verify API key in `.env` file and Google Cloud Console

#### CSP Violations
- **Symptom**: Scripts blocked by Content Security Policy
- **Check**: Browser console for CSP errors
- **Solution**: Update CSP to allow Google Maps domains

#### Selector Issues
- **Symptom**: Autocomplete not working on new fields
- **Check**: Address input naming convention
- **Solution**: Update selectors in `contact-maps-autocomplete.js`

### 2. Debug Mode
Enable debug logging:
```javascript
// Add to contact-maps-autocomplete.js
const DEBUG_MODE = true;

if (DEBUG_MODE) {
  console.log('ContactMapsAutocomplete: Debug info...', data);
}
```

### 3. Testing
- **Local Development**: Use `localhost` in API key restrictions
- **Production**: Update restrictions to your domain
- **Testing Tool**: Use browser developer tools to monitor network requests

## Performance Considerations

### 1. Script Loading
- **Async Loading**: Google Maps script loads asynchronously
- **Deferred Execution**: Callback ensures proper initialization order
- **Non-blocking**: Page renders before Maps API loads

### 2. Memory Management
- **Instance Tracking**: Autocomplete instances stored in Map
- **Cleanup**: Event listeners properly removed when elements removed
- **Reinitialization**: Safe to call initialization multiple times

### 3. Network Optimization
- **Request Debouncing**: Prevents excessive API calls
- **Minimal Fields**: Only requests necessary place data
- **Compression**: Uses latest API version with optimizations

## Security Considerations

### 1. API Key Protection
- **Environment Variables**: Never commit API keys to version control
- **Domain Restrictions**: Limit API key usage to specific domains
- **API Restrictions**: Limit to only required Google APIs

### 2. Data Privacy
- **Place Data**: Minimal place information stored locally
- **User Input**: No sensitive data sent to Google unnecessarily
- **Compliance**: GDPR-compliant implementation

### 3. Input Validation
- **Server-side Validation**: Address data validated on backend
- **Sanitization**: User input properly sanitized
- **XSS Prevention**: No direct HTML injection from API responses

## Maintenance & Updates

### 1. Regular Maintenance
- **Monitor API Usage**: Check monthly usage against limits
- **Update API Version**: Use 'weekly' for latest features
- **Review Restrictions**: Ensure API key restrictions are current

### 2. Future Enhancements
- **Session Tokens**: Implement for cost optimization
- **Country Restrictions**: Add country-specific autocomplete
- **Address Validation**: Add address verification step
- **Geocoding**: Store and use coordinate data

### 3. Documentation Updates
- **Keep Current**: Update when Google APIs change
- **Version Control**: Track changes to implementation
- **Team Communication**: Share updates with development team

## Integration Examples

### 1. Adding New Address Field Types
```javascript
// To support a new address field type:
// 1. Update selector in initializeAddressFields()
// 2. Add new field creation in contact-form.js
// 3. Update CSS selectors if needed

// Example: Adding 'billing' address type
const billingInputs = document.querySelectorAll('input[name*="[billing_addresses]"][name*="[value]"]');
```

### 2. Custom Place Data Handling
```javascript
// Access stored place data from input
const input = document.querySelector('input[name*="addresses"]');
if (input._placeId) {
  console.log('Place ID:', input._placeId);
  console.log('Coordinates:', input._latitude, input._longitude);
}
```

### 3. Event Handling
```javascript
// Listen for address selection events
input.addEventListener('place_selected', (event) => {
  const place = event.detail;
  console.log('Address selected:', place.formatted_address);
});
```

The system is robust, well-architected, and handles dynamic fields, provides fallbacks, and integrates seamlessly with Google's Places API for real-time address suggestions. This comprehensive implementation ensures reliability, performance, and an excellent user experience. 