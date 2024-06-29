// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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
                'vssVisualizer', // Identifies the type of the webview. Used internally
                'VSS Visual', // Title of the panel displayed to the user
                vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
                {
                    enableScripts: true
                } // Webview options. More on these later.
            );

            currentPanel.webview.html = getWebviewContent(
                [
                    currentPanel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'd3.v7.js')),
                    currentPanel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'mark.min.js')),
                    currentPanel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'vss-visualizer.js'))
                ],
                [
                ]
            );

            currentPanel.onDidDispose(
                () => {
                currentPanel = undefined;
                visualizingDocument = undefined;
                },
                null,
                context.subscriptions
            );

            let visualizingDocument: vscode.TextDocument | undefined;

            function updateVisualizerWithActiveEditor(editor: vscode.TextEditor | undefined) {
                if (!editor) {
                    return;
                }
                updateVisualizerWithDocument(editor.document);
            }

            function updateVisualizerWithDocument(document: vscode.TextDocument) {
                if (!currentPanel) {
                    return;
                }

                if (!isVssDocument(document)) {
                    return;
                }

                var message = {
                    command: 'update',
                    data: compileVssDocumentToEchartsFormat(document)
                };
                visualizingDocument = document;
                currentPanel.title = 'Visualize ' + path.basename(document.fileName);
                currentPanel.webview.postMessage(message);
            }

            vscode.window.onDidChangeActiveTextEditor(updateVisualizerWithActiveEditor);
            vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
                console.log('Document changed.');
                if (currentPanel && e.document === visualizingDocument) {
                    updateVisualizerWithDocument(e.document);
                }
            });
        
            const editor = vscode.window.activeTextEditor;

            currentPanel.webview.onDidReceiveMessage(message => {
                switch (message.command) {
                    case 'ready':
                        updateVisualizerWithActiveEditor(editor);
                        break;
                    case 'log':
                        console.log(message.data);
                        break;
                }
            });
        }
    });

    context.subscriptions.push(disposable);
}

function isVssDocument(document: vscode.TextDocument) {
    if (document.fileName.endsWith('.vspec')) {
        return true;
    }
    if (document.fileName.endsWith('.json')) {
        return true;
    }
}

function compileVssDocumentToEchartsFormat(document: vscode.TextDocument) {
    if (!document.fileName.endsWith('.json')) {
        return null;
    }
    var json =  JSON.parse(document.getText());
    return compileVssJsonChildrenNodeToEchartsFormat(json);
}

function compileVssJsonChildrenNodeToEchartsFormat(children: any): any[] {
    if (!children) {
        return [];
    }
    var result = [];
    for (var key in children) {
        var child = children[key];
        if (child.children) {
            result.push({name: key, type: child.type, description: child.description, children: compileVssJsonChildrenNodeToEchartsFormat(child.children)});
        } else {
            result.push({name: key, type: child.type, description: child.description});
        }
    }
    return result;
}

function getWebviewContent(scriptUris: vscode.Uri[], styleSheetUris: vscode.Uri[]) {
    return `<!DOCTYPE html>
    <html lang="en" style="height: 100%">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VSS Visualizer</title>
        ` + styleSheetUris.map(uri => `<link href="${uri}" rel="stylesheet">`).join('\n') + `
        <style>
        #table {
            min-width: 500px;
        }
        #vss-table {
            width: 100%;
        }
        .vss-table-area > div {
            overflow: hidden;
            display: flex;
        }

        .vss-table-area > div > span {
            padding: 0.3em;
            width: 110px;
            min-width: 0;
            font-family: monospace;
            font-size: 13px;
        }

        .vss-table-area > div > span:nth-child(1) {
            flex: auto;
        }

        .vss-table-area > div > span:nth-child(2) {
            flex: initial;
        }

        .vss-table-area > div > span:nth-child(3) {
            flex: auto;
        }

        </style>
    </head>
    <body style="height: 100%; margin: 0; padding: 0; width: 100%;">
        <div>
            <div style="position: fixed;z-index: 1;">
                <button id="tree-tab" type="button" data-target="#canvas">Tree</button>
                <button id="table-tab" type="button" data-target="#table">Table</button>
            </div>
            <div>
                <div id="canvas"></div>
                <div id="table">
                    <div style="text-align: right;">
                        <input type="text" id="search" name="search">
                        <input type="checkbox"> filter
                    </div>
                </div>
            </div>
        </div>
        ` + scriptUris.map(uri => `<script src="${uri}"></script>`).join('\n') + `
    </body>
    </html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
