const DEBUG = true;
const STATE_IDLE = 0;
const STATE_LISTENING = 1;
const IS_ANDROID = window.navigator.userAgent.match(/Android/g) !== null;

// Utility functions --------------------------------------------------------------------------------------------------

const cout = (...args) => {if(DEBUG)console.log(...args);}
const cerr = console.error;
const sel = s => document.querySelector(s);
const addL = (n, e, l) => n.addEventListener(e, l);

// MAIN function --------------------------------------------------------------------------------------------------

const context = {};
initialize(context);

// Functions

function initialize(d)
{
    d.state = STATE_IDLE;

    initializeSpeechSynthesis(d);
    initializeSpeechRecognition(d);

    selectElements(d);
    addUIListeners(d);

//    testAddPopup(d);
//    testPartialResponse(d);
}





//-------------------------------------------------------------------
//-------------------------------------------------------------------
//-------------------------------------------------------------------
//-------------------------------------------------------------------
// vvvvvvvvvvvvvvvvvvvvvvvvvvv WIP vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

async function searchKnowledgeGraph(query)
{
    const GOOGLE_API_KEY = 'AIzaSyCXKFxf2W8Sxe4yDjTG0iH8lAbTpe4Q_ao';

    cout('searching knowledge graph for ', query);
    const requrl = `https://kgsearch.googleapis.com/v1/entities:search?query=${query}&key=${GOOGLE_API_KEY}`;
    cout('debug: requrl:', requrl);
    const response = await fetch(requrl);
    return response.json();
}

async function initializeCamera(d)
{
    const devices = await navigator.mediaDevices.enumerateDevices();

    const videoDevices = [];
    devices.forEach(d => d.kind === 'videoinput' && videoDevices.push(d));
    let backCameraId = null;
    switch(videoDevices.length)
    {
        case 0: return new Promise((_, reject) => reject('No video input devices.'));
        case 1: backCameraId = videoDevices[0].deviceId; break;
        default: backCameraId = videoDevices[1].deviceId; break;
    }
    const constraints = {audio: false, video: {deviceId: {exact: backCameraId}}};
    const backCamera = await navigator.mediaDevices.getUserMedia(constraints);

    d.cameraStream = backCamera;
    const cameraDisplay = d.elements.cameraDisplay;
    cameraDisplay.srcObject = backCamera;

    return cameraDisplay.play();
}

function takePhoto(d)
{
    const canvas = d.elements.hiddenCanvas;
    const video = d.elements.cameraDisplay;
    const width = video.videoWidth;
    const height = video.videoHeight;

    const context = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;();
    context.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL('image/png');
}

function testPartialResponse(d)
{
    d.counter = 0;
    setInterval(() => partialResponse(d, 'new foo = ' + d.counter++), 1000);
}

function partialResponse(d, response, finished)
{
    if(finished)
    {
        d.partialResponse = null;
        return;
    }

    if(!d.partialResponse)addContinuousPopup(d);

    d.partialResponse.textContent = response;
}

function addContinuousPopup(d)
{
    const newMessage = document.createElement('div');
    newMessage.classList.add('message');

    const newMessageSpeechBubbleWrapper = document.createElement('div');
    newMessageSpeechBubbleWrapper.classList.add('messageSpeechBubbleWrapper', 'right');

    const newMessageSpeechBubble = document.createElement('div');
    newMessageSpeechBubble.classList.add('messageSpeechBubble', 'continuous');

    newMessage.insertAdjacentElement('beforeend', newMessageSpeechBubbleWrapper);
    newMessageSpeechBubbleWrapper.insertAdjacentElement('beforeend', newMessageSpeechBubble);
    d.elements.messages.insertAdjacentElement('beforeend', newMessage);

    newMessage.scrollIntoView({behavior: 'smooth'});

    d.partialResponse = newMessageSpeechBubble;
}

function initializeSpeechSynthesis(d)
{
    d.synth = window.speechSynthesis;
    const voices = d.synth.getVoices();

    // select default voice

    if(speechSynthesis.onvoiceschanged !== undefined)
    {
        speechSynthesis.onvoiceschanged = () =>
        {
            cout('debug: event voices changed:\n', voices);
            d.defaultVoice = voices.find(x => x.default);
        };
    }
    else
    {
        cout('debug: voices:', voices);
        d.defaultVoice = voices.find(x => x.default);
    }
}

function initializeSpeechRecognition(d)
{
    var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
    var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;

    const grammar = '#JSGF V1.0; grammar colors; public <color> = aqua | azure | beige | bisque | black | blue | brown | chocolate | coral | crimson | cyan | fuchsia | ghostwhite | gold | goldenrod | gray | green | indigo | ivory | khaki | lavender | lime | linen | magenta | maroon | moccasin | navy | olive | orange | orchid | peru | pink | plum | purple | red | salmon | sienna | silver | snow | tan | teal | thistle | tomato | turquoise | violet | white | yellow ;';
    const grammarList = new SpeechGrammarList();

    grammarList.addFromString(grammar, 1);
    d.recognition = new SpeechRecognition();
    d.recognition.grammars = grammarList;
    d.recognition.lang = 'en-US';
    d.recognition.interimResults = true;
    d.recognition.continuous = true;
    d.recognition.maxAlternatives = 1;

    addL(d.recognition, 'error', e => onRecognitionError(d, e));
    addL(d.recognition, 'result', e => onRecognitionResult(d, e));
    addL(d.recognition, 'audioend', e => onStoppedListening(d, e));
}

function gotoListening(d)
{
    cout('debug: going to listening state');

    d.state = STATE_LISTENING;

    d.elements.micButtonIcon.classList.remove('fa-microphone');
    d.elements.micButtonIcon.classList.add('fa-circle-notch', 'fa-spin');

    d.recognition.start();
}

function gotoIdle(d)
{
    cout('debug: going to idle state');

    d.elements.micButtonIcon.classList.remove('fa-circle-notch', 'fa-spin');
    d.elements.micButtonIcon.classList.add('fa-microphone');

    d.state = STATE_IDLE;
}

// Speech recognition error handler

function onRecognitionError(d, event)
{
    cerr('error in speech recognition', event);
}

// Speech recognition result handler

function onRecognitionResult(d, event)
{
    cout(event);
    let recognitionTranscript = '';
    for(let result of event.results)
    {
        recognitionTranscript += result[0].transcript;
    }

    d.userSpeech = recognitionTranscript;
    partialResponse(d, recognitionTranscript);
}

// Speech recognition stopped handler

function onStoppedListening(d, stopImmediately)
{
    if(d.state === STATE_IDLE)return;

    partialResponse(d, '', true);
    newWitQuery(d.userSpeech).then(data => onWitResponse(d, data));
    d.userSpeech = null;
    setTimeout(() => gotoIdle(d), stopImmediately ? 0 : 1000);
}

// ^^^^^^^^^^^^^^^^^^^^^^^^^^^ WIP ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//-------------------------------------------------------------------
//-------------------------------------------------------------------
//-------------------------------------------------------------------
//-------------------------------------------------------------------






function testAddPopup(d)
{
    d.counter = 0;
    setInterval(() => {d.counter++; addPopup(d, {sender: 'ai', type: 'text', text: d.counter.toString(10)});}, 1000);
    setInterval(() => addPopup(d, {sender: 'ai', type: 'image', image: {src: 'images/hith-father-christmas-lights-iStock_000029514386Large-A.jpeg'}}), 1000);
}

function selectElements(d)
{
    d.elements = {};

    d.elements.mainWrapper = sel('#mainWrapper');
    d.elements.messages = sel('#messages');
    d.elements.controls = sel('#controls');
    d.elements.controlsKeyboard = sel('#controlsKeyboard');

    d.elements.cameraButton = sel('#cameraButton');
    d.elements.micButton = sel('#micButton');
    d.elements.micButtonIcon = sel('#micButtonIcon');
    d.elements.keyboardButton = sel('#keyboardButton');

    d.elements.controlsKeyboardKeyboardInput = sel('#controlsKeyboardKeyboardInput');
    d.elements.controlsKeyboardBack = sel('#controlsKeyboardBack');
    d.elements.controlsKeyboardSend = sel('#controlsKeyboardSend');

    d.elements.cameraWrapper = sel('#cameraWrapper');
    d.elements.cameraDisplay = sel('#cameraDisplay');
    d.elements.cameraBackButton = sel('#cameraBackButton');
    d.elements.takePhotoButton = sel('#takePhotoButton');
    d.elements.hiddenCanvas = sel('#hiddenCanvas');
}

function addUIListeners(d)
{
    d.elements.mainWrapper.addEventListener("click", toggleFullScreen, false);

    addL(d.elements.controls, 'click', e => e.stopPropagation());
    addL(d.elements.controlsKeyboard, 'click', e => e.stopPropagation());

    addL(d.elements.cameraButton, 'click', e => onCameraButtonClick(d, e));
    addL(d.elements.micButton, 'click', e => onMicButtonClick(d, e));
    addL(d.elements.keyboardButton, 'click', e => onKeyboardButtonClick(d, e));

    addL(d.elements.controlsKeyboardBack, 'click', e => onControlsKeyboardBackClick(d, e));
    addL(d.elements.controlsKeyboardKeyboardInput, 'keyup', e => onControlsKeyboardKeyboardInputKeyup(d, e));
    addL(d.elements.controlsKeyboardSend, 'click', e => onControlsKeyboardSendClick(d, e));

    addL(d.elements.cameraBackButton, 'click', e => onCameraBackButtonClick(d, e));
    addL(d.elements.takePhotoButton, 'click', e => onTakePhotoButtonClick(d, e));
}

function onCameraBackButtonClick(d, event)
{
    backToMainView(d);
}

function backToMainView(d)
{
    d.elements.cameraWrapper.classList.add('hidden');
    d.elements.mainWrapper.classList.remove('hidden');
    d.elements.cameraDisplay.pause();
    d.elements.cameraDisplay.srcObject = null;
    const tracks = d.cameraStream.getVideoTracks();
    for(let track of tracks)track.stop();
    d.cameraStream = null;
}

function onTakePhotoButtonClick(d, event)
{
    const data = takePhoto(d);
    backToMainView(d);
    const response = {sender: 'user',
                      type: 'image',
                      image: {src: data,
                              title: 'Captured photo',
                              description: 'Photo taken using camera.'
                             }};
    addPopup(d, response);

//    setTimeout(() => backToMainView(d), 1000);
}

function onCameraButtonClick(d, event)
{
    d.elements.mainWrapper.classList.add('hidden');
    d.elements.cameraWrapper.classList.remove('hidden');

    initializeCamera(d)
    .catch(err =>
    {
        cerr('An error occurred while trying to initializeCamera');
        cerr(err);
    });
}

function onMicButtonClick(d, event)
{
    if(d.state === STATE_IDLE)gotoListening(d);
    else d.recognition.abort();
}

function onKeyboardButtonClick(d, event)
{
    d.elements.controls.classList.add('hidden');
    d.elements.controlsKeyboard.classList.remove('hidden');
}

function onControlsKeyboardBackClick(d, event)
{
    d.elements.controlsKeyboard.classList.add('hidden');
    d.elements.controls.classList.remove('hidden');
}

function onControlsKeyboardKeyboardInputKeyup(d, event)
{
    if(event.key === 'Enter')
    {
        d.elements.controlsKeyboardSend.click();
    }
}

function onControlsKeyboardSendClick(d, event)
{
    const inputElem = d.elements.controlsKeyboardKeyboardInput;
    const msg = inputElem.value;
    addPopup(d, {sender: 'user', type: 'text', text: msg});
    newWitQuery(msg).then(data => onWitResponse(d, data));
    inputElem.value = '';
}

function onWitResponse(d, data)
{
    cout(data);

    let responseText = '';
    
    if(data.entities.greetings)
    {
        responseText = 'Hello to you too!!';
    }
   
    else if(data.entities.intent)
    {
        const intents = data.entities.intent;
        for(let intent of intents)
        {
            if(intent.value === 'time_get')
            {
                const date = new Date();
                const hours = date.getHours();
                const minutes = String(date.getMinutes()).padStart(2, 0);
                const isAM = hours < 12;

                responseText += `The time is ${hours < 12 ? hours : hours - 12}:${minutes.padStart()} ${isAM ? 'AM' : 'PM'}.`;
            }
            else if(intent.value === 'temperature_get')
            {
                responseText += 'The temperature is 30 degrees celsius.';
            }
        }
    }
    else if(data.entities.search_query && data.entities.search_query.length)
    {
        const searchQuery = data.entities.search_query[0].value;
        responseText += 'This\'s what I found';
        searchKnowledgeGraph(searchQuery)
        .then(knowledgeGraphResponse =>
        {
            cout('debug knowledgeGraphResponse');
            cout(knowledgeGraphResponse);
            const searchResult = knowledgeGraphResponse.itemListElement[0].result;
            let imgUrl = 'images/idea.png';
            let imgDescription = searchQuery;
            let imgDetailedDescription = 'Search result for ' + searchQuery;
            if(searchResult.image)imgUrl = searchResult.image.contentUrl;
            if(searchResult.description)imgDescription = searchResult.description;
            if(searchResult.detailedDescription)imgDetailedDescription = searchResult.detailedDescription.articleBody;
            const imgResult = {sender: 'ai',
                               type: 'image',
                               image: {src: imgUrl,
                                       title: imgDescription,
                                       description: imgDetailedDescription
                                      }
                              };
            addPopup(d, imgResult);
        });
    }
    else if(data.entities.wikipedia_search_query && data.entities.wikipedia_search_query.length)
    {
        const searchQuery = data.entities.wikipedia_search_query[0].value;
        responseText += 'This\'s what I found';
        searchKnowledgeGraph(searchQuery)
        .then(knowledgeGraphResponse =>
        {
            cout('debug knowledgeGraphResponse');
            cout(knowledgeGraphResponse);
            const searchResult = knowledgeGraphResponse.itemListElement[0].result;
            let imgUrl = 'images/idea.png';
            let imgDescription = searchQuery;
            let imgDetailedDescription = 'Search result for ' + searchQuery;
            if(searchResult.image)imgUrl = searchResult.image.contentUrl;
            if(searchResult.description)imgDescription = searchResult.description;
            if(searchResult.detailedDescription)imgDetailedDescription = searchResult.detailedDescription.articleBody;
            const imgResult = {sender: 'ai',
                               type: 'image',
                               image: {src: imgUrl,
                                       title: imgDescription,
                                       description: imgDetailedDescription
                                      }
                              };
            addPopup(d, imgResult);
        });
    }

    if(responseText === '')responseText = 'Didn\'t catch that.';

    addPopup(d, {sender: 'ai', type: 'text', text: responseText});

    // Speech Synthesis

    const utterThis = new SpeechSynthesisUtterance(responseText);
    utterThis.voice = d.defaultVoice;
    utterThis.pitch = 1;
    utterThis.rate = 1;
    utterThis.onpause = (event) =>
    {
        const char = event.utterance.text.charAt(event.charIndex);
        cout('Speech paused at character ' + event.charIndex + ' of "' + event.utterance.text + '", which is "' + char + '".');
    };
    d.synth.speak(utterThis);
}

function toggleFullScreen()
{
    var doc = window.document;
    var docEl = doc.documentElement;

    var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
  
    if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement)
    {
        requestFullScreen.call(docEl);
    }
    else
    {
        cancelFullScreen.call(doc);
    }
}

function addPopup(d, response)
{
    let newMessage = document.createElement('div');
    newMessage.classList.add('message');

    const isAI = response.sender === 'ai';
    const classRight = isAI ? '' : 'right';
    const classResponse = isAI ? 'messageSpeechBubbleResponse' : '';

    if(response.type === 'text')
    {
        newMessage.innerHTML = `
        <div class="messageSpeechBubbleWrapper ${classRight}">
            <div class="messageSpeechBubble ${classResponse}">${response.text}</div>
        </div>`;
    }
    else if(response.type === 'image')
    {
        newMessage.innerHTML = `
        <div class="messageCard messageCardShort">
            <span class="messageCardDescription">
                <h3>${response.image.title}</h3>
                <p>${response.image.description}</p>
            </span>
            <span class="messageCardImage">
                <img src="${response.image.src}" alt="Image not found" />
            </span>
        </div>`;
    }

    d.elements.messages.insertAdjacentElement('beforeend', newMessage);
    newMessage.scrollIntoView({behavior: 'smooth'});
}

// NETWORKING ---------------------

async function newWitQuery(query)
{
    const url = `https://api.wit.ai/message?v=20181005&q=${encodeURIComponent(query)}`;
    const headers = new Headers();
    headers.append('Authorization', 'Bearer CZUDKTZMM7KREY6GV33QWHTXDM7CZOMY');
    const response = await fetch(url, {headers});
    return response.json();
}