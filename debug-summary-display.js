/**
 * Browser Console Debug Script for 4-Line Summary Display Issue
 * 
 * Copy and paste this entire script into your browser's Developer Console
 * while on the content list page to diagnose the CSS issue.
 */

console.log('🔍 Starting 4-Line Summary Display Debug...\n');

// Find all transcription text elements
const summaryElements = document.querySelectorAll('.transcription-text');
console.log(`📊 Found ${summaryElements.length} summary elements\n`);

summaryElements.forEach((element, index) => {
    console.log(`🔍 Element ${index + 1}:`);
    console.log('   Text content length:', element.textContent.length);
    console.log('   Text preview:', element.textContent.substring(0, 100) + '...');
    
    // Get computed styles
    const computed = window.getComputedStyle(element);
    console.log('   Computed CSS:');
    console.log('     display:', computed.display);
    console.log('     -webkit-line-clamp:', computed.webkitLineClamp || 'not set');
    console.log('     -webkit-box-orient:', computed.webkitBoxOrient || 'not set');
    console.log('     overflow:', computed.overflow);
    console.log('     line-height:', computed.lineHeight);
    console.log('     max-height:', computed.maxHeight);
    console.log('     height:', computed.height);
    console.log('     white-space:', computed.whiteSpace);
    
    // Check inline styles
    console.log('   Inline styles:', element.style.cssText);
    
    // Check classes
    console.log('   CSS classes:', element.className);
    
    // Check parent container constraints
    const parent = element.closest('.transcription-preview');
    if (parent) {
        const parentComputed = window.getComputedStyle(parent);
        console.log('   Parent container:');
        console.log('     height:', parentComputed.height);
        console.log('     max-height:', parentComputed.maxHeight);
        console.log('     overflow:', parentComputed.overflow);
        console.log('     font-size:', parentComputed.fontSize);
    }
    
    console.log('\n   📏 Actual rendered height:', element.offsetHeight + 'px');
    console.log('   📐 Scroll height:', element.scrollHeight + 'px');
    console.log('   📝 Is text truncated:', element.scrollHeight > element.offsetHeight);
    
    console.log('\n');
});

// Test function to force 4-line display
console.log('🛠️ Attempting to force 4-line display...\n');

function force4LineDisplay() {
    summaryElements.forEach((element, index) => {
        // Remove any existing styles that might conflict
        element.style.removeProperty('height');
        element.style.removeProperty('max-height');
        
        // Apply our 4-line styles with maximum priority
        element.style.setProperty('display', '-webkit-box', 'important');
        element.style.setProperty('-webkit-line-clamp', '4', 'important');
        element.style.setProperty('-webkit-box-orient', 'vertical', 'important');
        element.style.setProperty('overflow', 'hidden', 'important');
        element.style.setProperty('line-height', '1.4', 'important');
        element.style.setProperty('white-space', 'normal', 'important');
        element.style.setProperty('max-height', 'none', 'important');
        element.style.setProperty('height', 'auto', 'important');
        
        console.log(`✅ Applied 4-line styles to element ${index + 1}`);
    });
    
    console.log('\n🎯 Check if summaries now show 4 lines!');
    console.log('📋 If this fixes it, the issue is CSS specificity/override conflicts');
    console.log('📋 If this doesn\'t fix it, there may be JavaScript interference');
}

// Auto-run the fix
force4LineDisplay();

console.log('\n🔧 Additional Debug Commands:');
console.log('   force4LineDisplay() - Run the fix again');
console.log('   summaryElements - Access all summary elements');
console.log('\n💡 To check for JavaScript interference, monitor the elements:');
console.log('   Right-click summary → Inspect → watch for style changes'); 