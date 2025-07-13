// Content Management JavaScript
// This file handles all content management functionality

// Handle Add Content Form Submission
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('addContentForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {
        url: formData.get('url'),
        user_comments: formData.get('user_comments'),

        user_tags: formData.get('user_tags') ? formData.get('user_tags').split(',').map(t => t.trim()).filter(Boolean) : [],
        group_ids: Array.from(form.querySelector('#contentGroups').selectedOptions).map(opt => opt.value)
      };
      try {
        const res = await fetch('/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        const alert = document.getElementById('addContentAlert');
        if (result.success) {
          alert.className = 'alert alert-success mt-2';
          let message = 'Content added successfully!';
          
          // Check if multimedia analysis was triggered
          if (result.multimedia_analysis && result.multimedia_analysis.status === 'started') {
            message += ' AI analysis is running in the background and will update automatically when complete.';
            
            // Start monitoring the new content for analysis completion
            if (result.content && result.content.id && typeof startMonitoringContentAnalysis === 'function') {
              startMonitoringContentAnalysis(result.content.id);
              console.log(`🎬 Started monitoring analysis for new content: ${result.content.id}`);
            }
            
            // Reload page after a shorter delay to show the new content
            setTimeout(() => { window.location.reload(); }, 1000);
          } else {
            // For non-multimedia content, reload immediately
            setTimeout(() => { window.location.reload(); }, 1000);
          }
          
          alert.textContent = message;
          alert.classList.remove('d-none');
        } else {
          alert.className = 'alert alert-danger mt-2';
          alert.textContent = result.error || 'Failed to add content.';
          alert.classList.remove('d-none');
        }
      } catch (err) {
        const alert = document.getElementById('addContentAlert');
        alert.className = 'alert alert-danger mt-2';
        alert.textContent = 'Error adding content: ' + err.message;
        alert.classList.remove('d-none');
      }
    });
  }
  
  // Handle delete content buttons
  document.querySelectorAll('.delete-content-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const contentId = this.getAttribute('data-id');
      console.log('DEBUG: Delete button clicked for contentId:', contentId);
      if (!contentId) {
        alert('No content ID found.');
        return;
      }
      if (!confirm('Are you sure you want to delete this content?')) {
        console.log('DEBUG: Delete cancelled by user');
        return;
      }
      btn.disabled = true;
      try {
        const res = await fetch(`/content/${contentId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          console.log('DEBUG: Content deleted successfully');
          // Optionally show a toast or alert
          window.location.reload();
        } else {
          const result = await res.json().catch(() => ({}));
          console.error('DEBUG: Failed to delete content:', result.error);
          alert(result.error || 'Failed to delete content.');
        }
      } catch (err) {
        console.error('DEBUG: Error deleting content:', err);
        alert('Error deleting content: ' + err.message);
      } finally {
        btn.disabled = false;
      }
    });
  });
  
  // Handle bulk actions
  document.getElementById('bulkDeleteBtn')?.addEventListener('click', async function() {
    const selectedIds = Array.from(document.querySelectorAll('.content-select-checkbox:checked'))
      .map(cb => cb.getAttribute('data-id'));
    
    if (selectedIds.length === 0) {
      alert('Please select content to delete');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedIds.length} content items?`)) {
      try {
        const res = await fetch('/content/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', ids: selectedIds })
        });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Failed to delete content');
        }
      } catch (err) {
        alert('Error deleting content');
      }
    }
  });
  
  // Handle select all checkbox
  document.getElementById('selectAllCheckbox')?.addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.content-select-checkbox');
    checkboxes.forEach(cb => cb.checked = this.checked);
  });

  // Edit Content logic
  var editContentModal = document.getElementById('editContentModal');
  if (editContentModal) {
    editContentModal.addEventListener('show.bs.modal', function(event) {
      var btn = event.relatedTarget;
      console.log('DEBUG: Edit modal show event, btn:', btn);
      if (!btn) return;
      var card = btn.closest('.content-card');
      console.log('DEBUG: Found card:', card);
      if (!card) return;
      var itemId = btn.getAttribute('data-id');
      var title = card.querySelector('.card-title').textContent.trim();
      var url = card.querySelector('.flex-shrink-0 a') ? card.querySelector('.flex-shrink-0 a').href : '';
      var commentEl = card.querySelector('.card-text');
      var comment = commentEl ? (commentEl.getAttribute('title') || commentEl.textContent.trim() || '') : '';
      var tags = Array.from(card.querySelectorAll('.tag-badge')).map(b => b.textContent.trim());
      console.log('DEBUG: Setting edit modal fields:', {itemId, title, url, comment, tags});
      document.getElementById('editContentId').value = itemId;
      document.getElementById('editContentTitle').value = title;
      document.getElementById('editContentUrl').value = url;
      document.getElementById('editContentComment').value = comment;
      document.getElementById('editContentTags').value = tags.join(', ');
      // Groups: not handled in this simple version
    });
  }

  // Show full comment logic
  document.querySelectorAll('.show-full-comment').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const card = link.closest('.content-card');
      const title = card.querySelector('.card-title').textContent.trim();
      // Always use the full comment from the card's .card-text title attribute if available
      const commentEl = card.querySelector('.card-text');
      const comment = commentEl ? (commentEl.getAttribute('title') || commentEl.textContent.trim() || '') : '';
      console.log('DEBUG: Show more clicked, full comment:', comment);
      let html = `<div><strong>Title:</strong> ${title}</div>`;
      html += `<div><strong>Comment:</strong> ${comment}</div>`;
      document.getElementById('viewContentModalBody').innerHTML = html;
      const viewModal = new bootstrap.Modal(document.getElementById('viewContentModal'));
      viewModal.show();
    });
  });

  // Handle edit form submission
  document.getElementById('editContentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.id.value;
    const data = {
      title: form.title.value,
      user_comments: form.user_comments.value,

      user_tags: form.user_tags.value.split(',').map(t => t.trim()).filter(Boolean),
      group_ids: Array.from(form.group_ids.selectedOptions).map(opt => opt.value)
    };
    try {
      const res = await fetch(`/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      const alert = document.getElementById('editContentAlert');
      if (result.success) {
        alert.className = 'alert alert-success mt-2';
        alert.textContent = 'Content updated successfully!';
        alert.classList.remove('d-none');
        setTimeout(() => { window.location.reload(); }, 1000);
      } else {
        alert.className = 'alert alert-danger mt-2';
        alert.textContent = result.error || 'Failed to update content.';
        alert.classList.remove('d-none');
      }
    } catch (err) {
      const alert = document.getElementById('editContentAlert');
      alert.className = 'alert alert-danger mt-2';
      alert.textContent = 'Error updating content: ' + err.message;
      alert.classList.remove('d-none');
    }
  });

  // View Content logic
  document.querySelectorAll('.card-title[data-bs-toggle="modal"]').forEach(titleEl => {
    titleEl.addEventListener('click', function() {
      try {
        const card = titleEl.closest('.content-card');
        if (!card) throw new Error('No .content-card found for title');
        const itemId = titleEl.getAttribute('data-id');
        const title = titleEl.textContent.trim();
        const commentEl = card.querySelector('.card-text');
        const comment = commentEl ? (commentEl.getAttribute('title') || commentEl.textContent.trim() || '') : '';
        const url = card.querySelector('.flex-shrink-0 a')?.getAttribute('href') || '';
        const tags = Array.from(card.querySelectorAll('.tag-badge')).map(b => b.textContent.trim());
        let html = `<div><strong>Title:</strong> ${title}</div>`;
        if (url) html += `<div><strong>URL:</strong> <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></div>`;
        if (comment) html += `<div><strong>Comment:</strong> ${comment}</div>`;
        if (tags.length) html += `<div><strong>Tags:</strong> ${tags.map(t => `<span class='badge bg-success mx-1'>${t}</span>`).join('')}</div>`;
        document.getElementById('viewContentModalBody').innerHTML = html;
      } catch (err) {
        console.error('Error opening content modal:', err);
        document.getElementById('viewContentModalBody').innerHTML = '<div class="text-danger">Failed to load content details.</div>';
      }
    });
  });
}); 