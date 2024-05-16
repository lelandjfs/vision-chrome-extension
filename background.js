// Script used after turbo_api.js returns requested prompt to parse data, format as JSON, call MongoDB collection and push data

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'pushToDatabase') {
        const contentString = request.data && request.data.content;
        if (!contentString) {
            console.error('Content is missing in the request');
            sendResponse({ status: 'error', message: 'Content is missing in the request' });
            return;
        }

        console.log('Content received:', contentString);

        // Extract JSON string from content using split method
        let jsonString;
        try {
            const startIndex = contentString.indexOf('```json');
            const endIndex = contentString.lastIndexOf('```');

            if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
                jsonString = contentString.substring(startIndex + 7, endIndex).trim();
            } else {
                throw new Error('Failed to find JSON content in the specified format');
            }
        } catch (e) {
            console.error('Failed to extract JSON from content', e);
            sendResponse({ status: 'error', message: 'Failed to extract JSON from content', details: e.toString() });
            return;
        }
        console.log('Extracted JSON string:', jsonString);

        // Retrieve all necessary MongoDB connection details from Chrome's local storage
        chrome.storage.local.get(['appId', 'dbName', 'collectionName'], async function(items) {
            const appId = items.appId;
            const dbName = items.dbName;
            const collectionName = items.collectionName;

            if (!appId || !dbName || !collectionName) {
                console.error('Missing MongoDB connection details');
                sendResponse({ status: 'error', message: 'Missing MongoDB connection details' });
                return;
            }

            try {
                const jsonData = JSON.parse(jsonString);
                console.log('Parsed JSON data:', jsonData);

                const app = new Realm.App({ id: appId });
                const credentials = Realm.Credentials.anonymous();
                const user = await app.logIn(credentials);
                const mongodb = user.mongoClient("mongodb-atlas");
                const db = mongodb.db(dbName);
                const collection = db.collection(collectionName);

                const result = await collection.insertOne(jsonData);
                console.log('Data pushed to MongoDB successfully:', result);
                sendResponse({ status: 'success', message: 'Data pushed to MongoDB successfully', details: result });
            } catch (error) {
                console.error('Failed to push data to MongoDB:', error);
                sendResponse({ status: 'error', message: 'Failed to push data', details: error.toString() });
            }
        });

        return true;
    }
});
