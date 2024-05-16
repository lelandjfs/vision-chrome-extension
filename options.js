document.getElementById('saveOptions').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKeyInput').value;
    const appId = document.getElementById('appId').value;
    const dbName = document.getElementById('dbName').value;
    const collectionName = document.getElementById('collectionName').value;

    if (apiKey && appId && dbName && collectionName) {
        chrome.storage.local.set({
            openaiApiKey: apiKey,
            appId: appId,
            dbName: dbName,
            collectionName: collectionName
        }, function() {
            console.log('Options are stored securely.');
            alert('Options saved successfully.');
        });
    } else {
        alert('Please enter all required fields.');
    }
});

// Function to restore options on page load
function restoreOptions() {
    chrome.storage.local.get(['openaiApiKey', 'appId', 'dbName', 'collectionName'], function(items) {
        document.getElementById('apiKeyInput').value = items.openaiApiKey || '';
        document.getElementById('appId').value = items.appId || '';
        document.getElementById('dbName').value = items.dbName || '';
        document.getElementById('collectionName').value = items.collectionName || '';
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
