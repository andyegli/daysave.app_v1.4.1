console.log('Contact list map script loaded');

let mapAddress = null;

document.addEventListener('DOMContentLoaded', function() {
  const contactList = document.querySelector('.contact-list');
  if (!contactList) {
    console.error('No .contact-list element found!');
    return;
  }
  contactList.addEventListener('click', function(e) {
    const btn = e.target.closest('.show-map');
    if (btn) {
      e.preventDefault();
      mapAddress = btn.getAttribute('data-address');
      var modal = new bootstrap.Modal(document.getElementById('mapModal'));
      modal.show();
      console.log('Pin clicked, address:', mapAddress);
    }
  });

  document.getElementById('mapModal').addEventListener('shown.bs.modal', function () {
    if (!mapAddress) return;
    document.getElementById('map').innerHTML = '';
    var map = new google.maps.Map(document.getElementById('map'), {
      zoom: 15,
      center: { lat: 0, lng: 0 }
    });
    var geocoder = new google.maps.Geocoder();
    console.log('[Google Maps API] Geocoding address:', mapAddress);
    geocoder.geocode({ address: mapAddress }, function(results, status) {
      if (status === 'OK') {
        console.log('[Google Maps API] Geocode result:', results[0]);
        map.setCenter(results[0].geometry.location);
        new google.maps.Marker({
          map: map,
          position: results[0].geometry.location
        });
      } else {
        console.error('[Google Maps API] Geocode failed:', status, mapAddress);
        alert('Geocode was not successful for the following reason: ' + status);
      }
    });
  });
}); 