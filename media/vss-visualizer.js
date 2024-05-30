const counter = document.getElementById('lines-of-code-counter');

// let count = 0;
// setInterval(() => {
//     counter.textContent = count++;
// }, 100);

// Handle the message inside the webview
window.addEventListener('message', event => {
    console.log('Received message from webview', event);
    const message = event.data; // The JSON data our extension sent

    switch (message.command) {
        case 'update':
            counter.textContent = message.data;
            break;
    }
});

const vscode = acquireVsCodeApi();
vscode.postMessage({
    command: 'ready'
});
