(function (global) {
    const container = document.getElementById('container');

    // Handle the message inside the webview
    window.addEventListener('message', event => {
        console.log('Received message from webview', event);
        const message = event.data; // The JSON data our extension sent

        switch (message.command) {
            case 'update':
                updateVss(message.data);
                break;
        }
    });

    const vscode = acquireVsCodeApi();

    var canvas  = d3.select("#canvas").append("canvas")
        .attr("id", "canvas")
        .style('position', 'absolute')
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight);

    var vssData = [];
    var canvasPadding = 100;
    var radius = 10;
    var indent = 100 * radius;
    var fontSize = 100;
    var leafFontSize = 30;
    var nodePaddingX = radius;
    var nodePaddingY = radius;
    var zoomTransform = d3.zoomIdentity;
    let edgeColor = "#999";
    let layoutedNodes;

    function layoutVss(data, left, top) {
        layoutedNodes = [];
        for (var node of data) {
            var layout = layoutVssNode(node, 0, left, top);
            layoutedNodes.push(layout);
            top = layout.bottom;
        }
    }

    function resetZoom(layoutedNodes) {
        let width = canvas.node().clientWidth;
        let height = canvas.node().clientHeight;
        let {x, y, left, right, top, bottom} = layoutedNodes[0];
        canvas.call(zoom.translateTo, (right + left) / 2, (bottom + top) / 2);
        canvas.call(zoom.scaleTo, Math.min(0.8 * width / (right - left), 0.8 * height / (bottom - top)));
    }

    function drawLayoutedVss(ctx, layoutedNodes) {
        let width = canvas.node().clientWidth;
        let height = canvas.node().clientHeight;
        ctx.fillStyle = "#fff";
        ctx.rect(0, 0, width, height);
        ctx.fill();

        for (var layoutedNode of layoutedNodes) {
            drawLayoutedVssNode(ctx, zoomTransform, 0, layoutedNode, []);
        }
    }

    var nodeColors = {
        'branch.0': '#4D0FA3',
        'branch.1': '#6113CD',
        'branch.2': '#8338ec',
        'branch.3': '#A56EF2',
        'attribute': '#0a0',
        'sensor': '#fa0',
        'actuator': '#ff006e',
    };

    function getNodeColor(node, level) {
        return nodeColors[node.type + '.' + (level % 4)] || nodeColors[node.type] || '#000';
    }

    function countLeaves(node) {
        if (node.children) {
            let count = 0;
            for (var child of node.children) {
                count += countLeaves(child);
            }
            return count;
        } else {
            return 1;
        }
    }

    function layoutVssNode(node, level, left, top) {
        let right = left + 2 * radius + 2 * nodePaddingX;
        let bottom = top + 2 * radius + 2 * nodePaddingY;
        let x = left + nodePaddingX + radius;
        let y = top + nodePaddingY + radius;
        let children = [];
        let levelIndent = indent / Math.pow(2, level * 0.3);

        let nextTop = top;
        let leafCount = 0;
        if (node.children) {
            leafCount = countLeaves(node);
            let childIndent = left + levelIndent + radius * 2 * leafCount;
            for (var child of node.children) {
                var layout = layoutVssNode(child, level + 1, childIndent, nextTop);
                nextTop = layout.bottom;
                right = Math.max(layout.right, right);
                children.push(layout);
            }

            y = children.length ? Math.max((children[0].y + children[children.length - 1].y) / 2, y) : y;
        } else {
            leafCount = 1;
        }

        bottom = Math.max(bottom, nextTop);
        return {
            x,
            y,
            left,
            right,
            top,
            bottom,
            node,
            children,
            leafCount
        };
    }

    function transformPosition(p, transform) {
        return {
            x: p.x * transform.k + transform.x,
            y: p.y * transform.k + transform.y
        };
    }

    function transformLength(length, transform) {
        return length * transform.k;
    }

    function shouldShowLabel(level) {
        return true;
    }

    function drawLayoutedVssNode(ctx, transform, level, layoutedNode) {

        let transformedNodePosition = transformPosition(layoutedNode, transform);
        if (layoutedNode.children) {
            for (var child of layoutedNode.children) {
                let end = transformPosition(child, transform);
                ctx.beginPath();
                ctx.moveTo(transformedNodePosition.x, transformedNodePosition.y);
                ctx.lineTo(end.x, end.y);
                ctx.strokeStyle = edgeColor;
                ctx.stroke();
            }
        }
        let transformedRadius = transformLength(radius, transform);
        ctx.beginPath();
        ctx.arc(transformedNodePosition.x, transformedNodePosition.y, transformedRadius, 0, 2 * Math.PI);
        ctx.fillStyle = getNodeColor(layoutedNode.node, level);
        ctx.fill();

        let showLabel = shouldShowLabel(level);
        if (showLabel) {
            let nodeFontSize = leafFontSize * Math.pow(layoutedNode.leafCount, 0.7) * transform.k;
            if (nodeFontSize > 2) {
                let namePosition = {
                    x: layoutedNode.x + radius * 1,
                    y: layoutedNode.y
                };
        
                let transformedNamePosition = transformPosition(namePosition, transform);
                ctx.font = `${nodeFontSize}px sans-serif`;
                ctx.fillText(layoutedNode.node.name, transformedNamePosition.x + nodeFontSize / 2, transformedNamePosition.y + nodeFontSize / 3);
            }
        }

        if (layoutedNode.children) {
            for (var child of layoutedNode.children) {
                drawLayoutedVssNode(ctx, transform, level + 1, child);
            }
        }
    }

    var context = canvas.node().getContext("2d");

    let suspendDraw = false;
    function updateVss(data) {
        if (!data) {
            return;
        }
        vssData = data;
        layoutVss(data, canvasPadding, canvasPadding);
        suspendDraw = true;
        resetZoom(layoutedNodes);
        suspendDraw = false;
        drawLayoutedVss(context, layoutedNodes);
    }

    window.addEventListener('resize', event => {
        canvas
            .attr('width', window.innerWidth)
            .attr('height', window.innerHeight);

        if (layoutedNodes) {
            drawLayoutedVss(context, layoutedNodes);
        }
    });

    let zoom = d3.zoom()
        .on('zoom', (e) => {
            zoomTransform = e.transform;
            if (!suspendDraw) {
                drawLayoutedVss(context, layoutedNodes);
            }
        });
    canvas.call(zoom);

    vscode.postMessage({
        command: 'ready'
    });
})(this);