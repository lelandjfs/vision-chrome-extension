// Main script to prompt and call OpenAI API

// Function to get the API key securely from Chrome storage
function getApiKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['openaiApiKey'], function(result) {
            if (result.openaiApiKey) {
                resolve(result.openaiApiKey);
                console.log('API Key successfully retrieved from storage.');
            } else {
                reject('API key not found');
                console.error('API key not found in storage.');
            }
        });
    });
}

// Function to get the MongoDB configuration securely from Chrome storage
function getMongoConfig() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['appId', 'dbName', 'collectionName'], function(result) {
            if (result.appId && result.dbName && result.collectionName) {
                resolve({
                    appId: result.appId,
                    dbName: result.dbName,
                    collectionName: result.collectionName
                });
                console.log('MongoDB configuration successfully retrieved from storage.');
            } else {
                reject('MongoDB configuration not found');
                console.error('MongoDB configuration not found in storage.');
            }
        });
    });
}

// Function to read the image file and encode it to base64
function encodeImage(file) {
    console.log('Starting to read the file.');
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
            console.log('File read and encoded to base64.');
            resolve(`data:image/jpeg;base64,${base64String}`);
        };
        reader.onerror = () => {
            console.error('Error reading the file.');
            reject('Error reading the file');
        };
        reader.readAsDataURL(file);
    });
}

// Function to send image to OpenAI and get the response
async function sendImageToOpenAI(imageUrl) {
    try {
        console.log('Retrieving API Key.');
        const openaiApiKey = await getApiKey();
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
        };
        const body = JSON.stringify({
            model: "gpt-4-turbo",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text", 
                            text: "You are gpt-4-turbo with Vision capabilities. Extract key information based on the headers: Name, Title, Location, About, Company, Title, Dates, Education, Education years. In a JSON format so I can easily extract. Find information based on the headers: Name, Title, Location, About, Company, Title, Dates, Education, Education years. The Name in the JPEG is right below the image of the person which is a small circle in the upper left at the top of the JPEG. Title comes right below that and will likely be a string with the word 'at' in it but not always. Location is generally under and close to the Title field, it will be in the format of geography: 'city, state, country' or 'city, country'. The About field is the string of text that comes under the About header on the JPEG. Company, Title and Dates will all be in the 'Experience'. There will likely be multiple of these - First comes the company above, and all the sub-positions and dates within. Dates will take the form of start date - end date, with the format being mmm yyyy - mmm yyyy (end date might be 'present' instead of a date). Education will be at the bottom, all I need is the names of all the different schools and the Dates of attending. I want this all in a JSON file format with the specified headers above so I can easily parse. DO NOT HALLUCINATE AND MAKE UP INFO - if the image doesn't contain info that is asked for, return as Null"
                        },
                        {
                            type: "image_url", 
                            image_url: { url: imageUrl }
                        }
                    ]
                }
            ]
        });
        
           
        console.log('Sending request to OpenAI.');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: body
        });
        const data = await response.json();
        console.log("Response received from OpenAI:", JSON.stringify(data, null, 4));
        return data;
    } catch (error) {
        console.error("Error sending image to OpenAI:", error);
    }
}

// Adding event listeners to the input and button in the HTML
document.getElementById('extract_schema').addEventListener('click', async () => {
    const fileInput = document.getElementById('png_input');
    const file = fileInput.files[0];
    if (file) {
        console.log('Handling file upload.');
        encodeImage(file).then(imageUrl => {
            console.log('Image URL created, sending to API.');
            sendImageToOpenAI(imageUrl).then(response => {
                document.getElementById('result').innerText = JSON.stringify(response, null, 2);
                console.log('Displaying response in the UI.');
            }).catch(error => console.error('Failed to process image:', error));
        }).catch(error => console.error('Failed to encode image:', error));
    } else {
        console.log('No file selected.');
        alert('Please select a file to upload.');
    }
});

// Function to initialize MongoDB Realm and insert document
async function pushDataToMongoDB(data) {
    try {
        const config = await getMongoConfig();
        const app = new Realm.App({ id: config.appId });

        const credentials = Realm.Credentials.anonymous();
        const user = await app.logIn(credentials);
        const mongodb = user.mongoClient("mongodb-atlas");
        const db = mongodb.db(config.dbName);
        const collection = db.collection(config.collectionName);

        const result = await collection.insertOne(data);
        console.log('Data pushed to MongoDB successfully:', result);
        return result;
    } catch (error) {
        console.error('Failed to push data to MongoDB:', error);
        throw error;
    }
}

// Event listener for the 'Push to Database' button
document.getElementById('pushToDb').addEventListener('click', async () => {
    const result = document.getElementById('result').innerText;
    if (result) {
        try {
            const jsonData = JSON.parse(result);
            const dbResult = await pushDataToMongoDB(jsonData);
            console.log('Data pushed to MongoDB successfully:', dbResult);
        } catch (error) {
            console.error('Error pushing data to MongoDB:', error);
            alert('Failed to push data to MongoDB. See console for details.');
        }
    } else {
        alert('No data to push. Please generate data first.');
    }
});
