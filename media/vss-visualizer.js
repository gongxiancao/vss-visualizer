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

    var radius = 2;

    function drawVss(ctx, data) {
        //Clear canvas
        ctx.fillStyle = "#fff";
        ctx.rect(0, 0, width, height);
        ctx.fill();

        //Draw
        ctx.beginPath();

        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#f00";
        ctx.fill();

        ctx.arc(100, 100, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#0f0";
        ctx.fill();

        var y = 20;
        var layoutedNodes = [];
        for (var node of data) {
            var layout = layoutVssNode(node, radius, y);
            layoutedNodes.push(layout);
            y = layout.bottom;
        }

        for (var layoutedNode of layoutedNodes) {
            drawLayoutedVssNode(ctx, layoutedNode);
        }
    }

    function layoutVssNode(node, x, y) {
        var left = x;
        var top = y;
        var right = x + 4 * radius;
        var bottom = y + 4 * radius;
        var children = [];
        if (node.children) {
            for (var child of node.children) {
                var layout = layoutVssNode(child, x + 4 * radius, y);
                y = layout.bottom;
                children.push(layout);
                right = Math.max(layout.right, right);
            }
        }
        bottom = Math.max(bottom, y);
        return {
            left,
            right,
            top,
            bottom,
            node,
            children
        };
    }

    function drawLayoutedVssNode(ctx, layoutedNode) {
        ctx.beginPath();
        ctx.arc(layoutedNode.left, layoutedNode.top, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#000";
        ctx.fill();

        if (layoutedNode.children) {
            for (var child of layoutedNode.children) {
                drawLayoutedVssNode(ctx, child);
                ctx.beginPath();
                ctx.moveTo(layoutedNode.left, layoutedNode.top);
                ctx.lineTo(child.left, child.top);
                ctx.strokeStyle = "#00f";
                ctx.stroke();
            }
        }
    }

    var context = canvas.node().getContext("2d");
    context.clearRect(0, 0, width, height);

    function updateVss(data) {
        if (!data) {
            return;
        }
        drawVss(context, data);
    }
})(this);