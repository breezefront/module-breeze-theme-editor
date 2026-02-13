/**
 * Debug Script for CSS Manager
 * 
 * Run this in browser console to check CSS Manager state
 * Usage: Copy-paste into DevTools Console
 */

(function() {
    console.log('🔍 CSS Manager Debug Info');
    console.log('='.repeat(50));
    
    // Get iframe
    var iframe = document.getElementById('bte-iframe') || document.getElementById('breeze-device-frame');
    if (!iframe) {
        console.error('❌ Iframe not found!');
        return;
    }
    
    var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) {
        console.error('❌ Cannot access iframe document!');
        return;
    }
    
    console.log('✅ Iframe found:', iframe.id);
    console.log('');
    
    // Check CSS elements
    var styles = {
        'Published CSS': iframeDoc.getElementById('bte-theme-css-variables'),
        'Draft CSS': iframeDoc.getElementById('bte-theme-css-variables-draft'),
        'Live Preview': iframeDoc.getElementById('bte-live-preview')
    };
    
    Object.keys(styles).forEach(function(name) {
        var style = styles[name];
        
        console.log('📄 ' + name + ':');
        
        if (!style) {
            console.log('   ❌ NOT FOUND');
            console.log('');
            return;
        }
        
        console.log('   ✅ Exists');
        console.log('   ID:', style.id);
        console.log('   Media:', style.media || '(empty)');
        console.log('   Disabled:', style.disabled);
        console.log('   Content length:', style.textContent.length, 'chars');
        console.log('   First 100 chars:', style.textContent.substring(0, 100));
        
        // Check computed style
        var computed = window.getComputedStyle(style);
        console.log('   Display:', computed.display);
        
        // Determine if active
        var isActive = (style.media === 'all' || style.media === '') && !style.disabled;
        console.log('   🎯 Active:', isActive ? '✅ YES' : '❌ NO');
        console.log('');
    });
    
    // Check for publication styles
    var publicationStyles = iframeDoc.querySelectorAll('style[id^="bte-publication-css-"]');
    if (publicationStyles.length > 0) {
        console.log('📦 Publication Styles:', publicationStyles.length);
        publicationStyles.forEach(function(style) {
            console.log('   - ' + style.id);
            console.log('     Media:', style.media || '(empty)');
            console.log('     Disabled:', style.disabled);
            console.log('     Content:', style.textContent.length, 'chars');
            console.log('     Active:', (style.media === 'all' && !style.disabled) ? '✅' : '❌');
        });
        console.log('');
    }
    
    // Check localStorage
    try {
        var storeId = window.breezeThemeEditorConfig?.storeId || 'unknown';
        var themeId = window.breezeThemeEditorConfig?.themeId || 'unknown';
        var storageKey = 'bte_' + storeId + '_' + themeId;
        
        console.log('💾 LocalStorage (key: ' + storageKey + '_*):');
        console.log('   Current Status:', localStorage.getItem(storageKey + '_current_status'));
        console.log('   Publication ID:', localStorage.getItem(storageKey + '_current_publication_id'));
        console.log('   Publication Title:', localStorage.getItem(storageKey + '_current_publication_title'));
        console.log('');
    } catch(e) {
        console.log('⚠️ Cannot read localStorage:', e.message);
        console.log('');
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log('   Published:', styles['Published CSS'] ? '✅' : '❌');
    console.log('   Draft:', styles['Draft CSS'] ? '✅' : '❌');
    console.log('   Live Preview:', styles['Live Preview'] ? '✅' : '❌');
    console.log('   Publications:', publicationStyles.length);
    
    // Determine current mode
    var mode = 'UNKNOWN';
    if (styles['Draft CSS'] && styles['Draft CSS'].media === 'all' && !styles['Draft CSS'].disabled) {
        mode = 'DRAFT';
    } else if (styles['Published CSS'] && styles['Published CSS'].media === 'all' && !styles['Published CSS'].disabled) {
        mode = 'PUBLISHED';
    } else if (publicationStyles.length > 0) {
        for (var i = 0; i < publicationStyles.length; i++) {
            if (publicationStyles[i].media === 'all' && !publicationStyles[i].disabled) {
                mode = 'PUBLICATION (' + publicationStyles[i].id + ')';
                break;
            }
        }
    }
    
    console.log('   🎯 Current Mode:', mode);
    console.log('='.repeat(50));
    
    // Test CSS variables
    console.log('');
    console.log('🎨 Testing CSS Variables:');
    var body = iframeDoc.body;
    var computedStyle = iframeDoc.defaultView.getComputedStyle(body);
    
    // Try to get some common CSS variables
    ['--color-primary', '--color-secondary', '--color-text', '--font-family-base'].forEach(function(varName) {
        var value = computedStyle.getPropertyValue(varName);
        if (value) {
            console.log('   ' + varName + ':', value.trim());
        }
    });
    
    console.log('');
    console.log('✅ Debug complete!');
})();
