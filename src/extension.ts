// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let currentPanel: vscode.WebviewPanel | undefined = undefined;

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vss-visualizer" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('vss-visualizer.visualize', () => {
        // Create and show a new webview
        if (currentPanel) {
            // If we already have a panel, show it in the target column
            currentPanel.reveal(vscode.ViewColumn.Two);
        } else {
            currentPanel = vscode.window.createWebviewPanel(
                'catCoding', // Identifies the type of the webview. Used internally
                'Cat Coding', // Title of the panel displayed to the user
                vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
                {
                    enableScripts: true
                } // Webview options. More on these later.
            );

            currentPanel.webview.html = getWebviewContent([
                currentPanel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'd3.v7.js')),
                currentPanel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'vss-visualizer.js'))
            ]);

            currentPanel.onDidDispose(
                () => {
                currentPanel = undefined;
                },
                null,
                context.subscriptions
            );

            const editor = vscode.window.activeTextEditor;
            if (editor) {
                let document = editor.document;
                const documentText = document.getText();

                currentPanel.webview.onDidReceiveMessage(message => {
                    if (message.command === 'ready') {
                        currentPanel?.webview.postMessage({
                            command: 'update',
                            data: documentText
                        });
                    }
                });
                // }, 2000);
            }
        }
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(scriptUris: vscode.Uri[]) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VSS Visualizer</title>
    </head>
    <body>
        <h1 id="lines-of-code-counter"></h1>
        ` + scriptUris.map(uri => `<script src="${uri}"></script>`).join('') + `
    </body>
    </html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
