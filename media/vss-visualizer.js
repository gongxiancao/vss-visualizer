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
    vscode.postMessage({
        command: 'ready'
    });


    var width = Math.max(d3.select("#canvas").node().clientWidth, 350) - 20,
    height = (window.innerWidth < 768 ? width : window.innerHeight - 20);
    var mobileSize = (window.innerWidth < 768 ? true : false);

    var centerX = width/2,
        centerY = height/2;

    var canvas  = d3.select("#canvas").append("canvas")
        .attr("id", "canvas")
        .attr("width", width)
        .attr("height", height);

    var vssData = [];
    var canvasPadding = 100;
    var radius = 10;
    var indent = 100 * radius;
    var nodePaddingX = radius;
    var nodePaddingY = radius;
    var zoomed = false;
    var zoomTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    let edgeColor = "#999";

    function drawVss(ctx, data) {
        //Clear canvas
        ctx.fillStyle = "#fff";
        ctx.rect(0, 0, width, height);
        ctx.fill();

        //Draw
        // ctx.beginPath();

        // ctx.arc(0, 0, 20, 0, 2 * Math.PI);
        // ctx.fillStyle = "#f00";
        // ctx.fill();

        // ctx.beginPath();
        // ctx.arc(200, 200, 20, 0, 2 * Math.PI);
        // ctx.fillStyle = "#0f0";
        // ctx.fill();

        var left = canvasPadding;
        var top = canvasPadding;
        var layoutedNodes = [];
        for (var node of data) {
            var layout = layoutVssNode(node, 0, left, top);
            layoutedNodes.push(layout);
            top = layout.bottom;
        }

        if (!zoomed && layoutedNodes.length) {
            let {x, y, left, right, top, bottom} = layoutedNodes[0];
            canvas.call(zoom.scaleBy, Math.min(width / (right - left), height / (bottom - top)));
        }

        for (var layoutedNode of layoutedNodes) {
            drawLayoutedVssNode(ctx, zoomTransform, 0, layoutedNode, []);
        }
    }

    var nodeColors = {
        'branch': '#00f',
        'attribute': '#0a0',
        'sensor': '#fa0',
        'actuator': '#f00',
    };

    function layoutVssNode(node, level, left, top) {
        var right = left + 2 * radius + 2 * nodePaddingX;
        var bottom = top + 2 * radius + 2 * nodePaddingY;
        var x = left + nodePaddingX + radius;
        var y = top + nodePaddingY + radius;
        var children = [];
        var levelIndent = indent / Math.pow(2, level * 0.3);

        var nextTop = top;
        if (node.children) {
            for (var child of node.children) {
                var layout = layoutVssNode(child, level + 1, left + levelIndent, nextTop);
                nextTop = layout.bottom;
                right = Math.max(layout.right, right);
                children.push(layout);
            }

            y = children.length ? Math.max((children[0].y + children[children.length - 1].y) / 2, y) : y;
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
            children
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

    function overlapBounds(bound, bounds) {
        for (var b of bounds) {
            if (!(
                b.left > bound.right ||
                b.right < bound.left ||
                b.bottom < bound.top ||
                b.top > bound.bottom
            )) {
                return true;
            }
        }
        return false;
    }

    function drawLayoutedVssNode(ctx, transform, level, layoutedNode, drawLabelRectangles) {
        let namePosition = {
            x: layoutedNode.x + 1.5 * radius,
            y: layoutedNode.y + 0.5 * radius
        };

        let transformedNamePosition = transformPosition(namePosition, transform);
        let nameWidth = ctx.measureText(layoutedNode.node.name).width;
        let labelRectangle = {
            left: transformedNamePosition.x,
            top: transformedNamePosition.y,
            right: transformedNamePosition.x + nameWidth,
            bottom: transformedNamePosition.y + 20
        };

        let labelWouldOverlap = overlapBounds(labelRectangle, drawLabelRectangles);
        if (!labelWouldOverlap) {
            drawLabelRectangles.push(labelRectangle);
        }

        let transformedNodePosition = transformPosition(layoutedNode, transform);
        if (layoutedNode.children) {
            for (var child of layoutedNode.children) {
                let end = transformPosition(child, transform);
                ctx.beginPath();
                ctx.moveTo(transformedNodePosition.x, transformedNodePosition.y);
                ctx.lineTo(end.x, end.y);
                ctx.strokeStyle = edgeColor;
                ctx.stroke();

                drawLayoutedVssNode(ctx, transform, level, child, drawLabelRectangles);
            }
        }
        let transformedRadius = transformLength(radius, transform);
        ctx.beginPath();
        ctx.arc(transformedNodePosition.x, transformedNodePosition.y, transformedRadius, 0, 2 * Math.PI);
        ctx.fillStyle = nodeColors[layoutedNode.node.type];
        ctx.fill();
        if (!labelWouldOverlap) {
            ctx.fillText(layoutedNode.node.name, labelRectangle.left, labelRectangle.top);
        }
    }

    var context = canvas.node().getContext("2d");
    context.clearRect(0, 0, width, height);

    function updateVss(data) {
        if (!data) {
            return;
        }
        vssData = data;
        drawVss(context, data);
        zoomed = false;
    }

    let zoom = d3.zoom()
        .on('zoom', (e) => {
            // console.log('zoom', e);
            zoomTransform = e.transform;
            zoomed = true;
            drawVss(context, vssData);
        });
    canvas.call(zoom);

})(this);