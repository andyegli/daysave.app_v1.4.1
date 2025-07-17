document.addEventListener('DOMContentLoaded', function() {
  // DEBUG: Check if "+more" badges exist on page load
  const moreTagsBadges = document.querySelectorAll('.more-tags-badge');
  console.log('🔍 PAGE LOAD DEBUG - Found +more badges:', moreTagsBadges.length);
  moreTagsBadges.forEach((badge, index) => {
    console.log(`Badge ${index + 1}:`, {
      element: badge,
      contentId: badge.getAttribute('data-content-id'),
      contentTitle: badge.getAttribute('data-content-title'),
      allTagsData: badge.getAttribute('data-all-tags'),
      text: badge.textContent,
      visible: badge.offsetParent !== null
    });
  });
  
  // Handle click on "+n more" tags badge
  const allTagsModal = document.getElementById('allTagsModal');
  
  if (allTagsModal) {
    allTagsModal.addEventListener('show.bs.modal', function(event) {
      const button = event.relatedTarget;
      const contentId = button.getAttribute('data-content-id');
      const contentTitle = button.getAttribute('data-content-title');
      const allTagsData = button.getAttribute('data-all-tags');
      
      console.log('🏷️ Tags Modal Debug - FULL ANALYSIS:', {
        event: event,
        button: button,
        buttonHTML: button ? button.outerHTML : 'null',
        contentId: contentId,
        contentTitle: contentTitle,
        allTagsDataExists: !!allTagsData,
        allTagsDataLength: allTagsData ? allTagsData.length : 'null',
        allTagsDataRaw: allTagsData,
        modalElement: document.getElementById('allTagsModal'),
        modalBodyElement: document.getElementById('allTagsModalBody')
      });
      
      try {
        let allTags = [];
        
        // Parse and validate the tags data
        if (allTagsData && allTagsData.trim() !== '') {
          allTags = JSON.parse(decodeURIComponent(allTagsData));
          console.log('✅ Parsed all tags:', allTags);
        }
        
        // Ensure allTags is an array
        if (!Array.isArray(allTags)) {
          console.warn('⚠️ allTags is not an array:', allTags);
          allTags = [];
        }
        
        const modalTitle = document.getElementById('allTagsModalLabel');
        const modalBody = document.getElementById('allTagsModalBody');
        
        // Update modal title
        modalTitle.textContent = `All Tags - ${contentTitle}`;
        
        // Clear previous content
        modalBody.innerHTML = '';
        
        if (allTags.length > 0) {
          // Separate auto and user tags
          const autoTags = allTags.filter(t => t && t.type === 'auto' && t.tag);
          const userTags = allTags.filter(t => t && t.type === 'user' && t.tag);
          
          let modalContent = '';
          
          if (userTags.length > 0) {
            modalContent += `
              <div class="mb-3">
                <h6 class="text-muted mb-2">User Tags (${userTags.length}):</h6>
                <div class="d-flex flex-wrap gap-2">
                  ${userTags.map(t => 
                    `<span class="badge bg-success tag-badge" data-tag="${t.tag}">
                      ${t.tag}
                    </span>`
                  ).join('')}
                </div>
              </div>
            `;
          }
          
          if (autoTags.length > 0) {
            modalContent += `
              <div class="mb-3">
                <h6 class="text-muted mb-2">AI-Generated Tags (${autoTags.length}):</h6>
                <div class="d-flex flex-wrap gap-2">
                  ${autoTags.map(t => 
                    `<span class="badge bg-info tag-badge" data-tag="${t.tag}">
                      ${t.tag}
                    </span>`
                  ).join('')}
                </div>
              </div>
            `;
          }
          
          if (modalContent) {
            modalBody.innerHTML = modalContent;
          } else {
            modalBody.innerHTML = '<p class="text-muted">No valid tags found for this content item.</p>';
          }
        } else {
          modalBody.innerHTML = '<p class="text-muted">No tags assigned to this content item.</p>';
        }
      } catch (error) {
        console.error('Error parsing tags data:', error);
        console.error('Raw tags data:', allTagsData);
        document.getElementById('allTagsModalBody').innerHTML = 
          '<p class="text-danger">Error loading tags. Please try again.</p><small class="text-muted">Check console for details.</small>';
      }
    });
  }
}); 