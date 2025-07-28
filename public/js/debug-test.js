// Debug test for JavaScript loading
console.log('🧪 DEBUG-TEST.JS: External JavaScript is working!');
console.log('🧪 DEBUG-TEST.JS: This proves external scripts can load and execute');

document.addEventListener('DOMContentLoaded', function() {
    console.log('🧪 DEBUG-TEST.JS: DOMContentLoaded fired');
    console.log('🧪 DEBUG-TEST.JS: window.passkeyClient exists?', !!window.passkeyClient);
    
    const modal = document.getElementById('passkeyManagementModal');
    const addBtn = document.getElementById('addPasskeyBtn');
    console.log('🧪 DEBUG-TEST.JS: Modal found?', !!modal);
    console.log('🧪 DEBUG-TEST.JS: Add button found?', !!addBtn);
    
    if (addBtn) {
        console.log('🧪 DEBUG-TEST.JS: Adding test click listener to button');
        addBtn.addEventListener('click', function() {
            console.log('🧪 DEBUG-TEST.JS: Button clicked! Event listener works!');
        });
    }
}); 