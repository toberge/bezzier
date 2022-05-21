`use strict`;

const canvas = document.getElementById('board');
const textX = document.getElementById('x-coordinate');
const textY = document.getElementById('y-coordinate');
const select = document.getElementById('curve-type');

if (!canvas.getContext) {
    alert("yeah ok you ain't got a canvas mate")
}

const context = canvas.getContext('2d');


context.strokeStyle = '#2c2c2c';
context.lineWidth = 3;
const DELTA = 1/60;
const BOX = 5;
const HITBOX = 12;

const drawFunction = (x0, y0, func) => {
    let x = x0, y = y0, t = 0;

    context.beginPath();
    context.moveTo(x0,y0); // starting point
    while (t < 1) { // bezier curve from t=0 to t=1
        t += DELTA;
        [x,y] = func(t); // calculate (x,y)
        context.lineTo(x,y); // line to new (x,y)
    }
    context.stroke(); // commit
}

/**
 * Creates a bezier curve based on four points
 * 
 * @param {{ x:Number, y:Number }[]} points 2D array of four [x,y] pairs
 */
const bezier = (points) => {
    // bx = 3(x2 − x1)
    const bx = 3*(points[1].x - points[0].x);
    // cx = 3(x3 − x2) − bx
    const cx = 3*(points[2].x - points[1].x) - bx;
    // dx = x4 − x1 − bx − cx
    const dx = points[3].x - points[0].x - bx - cx;
    // by = 3(y2 − y1)
    const by = 3*(points[1].y - points[0].y);
    // cy = 3(y3 − y2) − by
    const cy = 3*(points[2].y - points[1].y) - by;
    // dy = y4 − y1 − by − cy.
    const dy = points[3].y - points[0].y - by - cy;

    const x1 = points[0].x, y1 = points[0].y;
    return t => [
        x1 + bx*t + cx*t*t + dx*t*t*t,
        y1 + by*t + cy*t*t + dy*t*t*t,
    ]
}

const drawBezier = points => {
    for (let i = 0; i + 3 < points.length; i += 3) {
        drawFunction(points[i].x, points[i].y, bezier(points.slice(i, i+4)));
    }
}

const drawLine = points => {
    context.beginPath();
    context.moveTo(points[0].x,points[0].y);
    for (const point of points.slice(1)) {
        context.lineTo(point.x, point.y);
    }
    context.stroke(); // commit
}


let initialPoints = [
    [200,100],
    [300,300],
    [canvas.width - 300,300],
    [canvas.width - 200,100]
];

let points = [
    {
        name: 'startpoint',
        x: initialPoints[0][0],
        y: initialPoints[0][1],
        color: 'black'
    },
    {
        name: 'control point 1',
        x: initialPoints[1][0],
        y: initialPoints[1][1],
        color: 'blue'
    },
    {
        name: 'control point 2',
        x: initialPoints[2][0],
        y: initialPoints[2][1],
        color: 'blue'
    },
    {
        name: 'endpoint',
        x: initialPoints[3][0],
        y: initialPoints[3][1],
        color: 'black'
    }
]

const clearBoard = () => context.clearRect(0, 0, canvas.width, canvas.height);

/**
 * Draws handles for and lines between control points and endpoints
 * @param {{}[]} points list of handles to draw
 */
const drawHandles = points => {
    context.save();
    // set attributes (discarded afterwards)
    context.strokeStyle = 'grey';
    context.lineWidth = 1.5;
    context.setLineDash([12,6]);
    let lastPoint = null;
    for (point of points) {
        if (lastPoint) { // draw line
            context.beginPath();
            context.moveTo(lastPoint.x, lastPoint.y);
            context.lineTo(point.x, point.y);
            context.stroke();
        }
        lastPoint = point;
        // draw handle for point
        context.fillStyle = point.color;
        context.fillRect(point.x - BOX, point.y - BOX, 10, 10);
    }
    context.restore();
}

const squareCollison = (x0, y0, x1, y1, width) => {
    return x0 >= x1 - width && x0 <= x1 + width
        && y0 >= y1 - width && y0 <= y1 + width;
}

const rectangleCollision = (x, y, startX, startY, width, height) => {
    return x >= startX && x <= startX + width
        && y >= startY && y <= startY + height;
}

const handleDrag = event => {
    if (!rectangleCollision(event.pageX, event.pageY, canvas.offsetLeft, canvas.offsetTop, canvas.width, canvas.height)) {
        // then the cursor has left the canvas!
        return; // abort!
    }
    // account for offset and set new coordinates
    dragData.point.x = event.offsetX - dragData.offsetX;
    dragData.point.y = event.offsetY - dragData.offsetY;
    // redraw bezier curve
    clearBoard();
    drawHandles(points);
    state.draw(points);
}

const handleStopDrag = () => {
    // deregister event handlers
    canvas.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleStopDrag);
}

const drawers = {
    line: drawLine,
    bezier: drawBezier,
}

const state = {
    draw: drawers[select.value] || drawBezier,
};

select.addEventListener("change", e => {
    state.draw = drawers[e.target.value] || drawBezier;
    clearBoard();
    drawHandles(points);
    state.draw(points);
})

// main loop I guess
clearBoard();
drawHandles(points);
state.draw(points);

// drag-and-drop details
const dragData = {
    offsetX: 0,
    offsetY: 0,
    point: null
}

const addPoint = (startTime) => (event) => {
    if (event.timeStamp - startTime > 300) return;
    points.push({
        name: `point ${points.length + 1}`,
        x: event.offsetX,
        y: event.offsetY,
        color: points.length % 3 == 0 ? 'black' : 'blue',
    })
    // redraw bezier curve
    clearBoard();
    drawHandles(points);
    state.draw(points);
}

canvas.addEventListener('mousedown', event => {
    for (point of points) {
        if (squareCollison(event.offsetX, event.offsetY, point.x, point.y, HITBOX)) {
            console.log('Collision with', point.name);
            // remember offset from point
            dragData.offsetX = event.offsetX - point.x;
            dragData.offsetY = event.offsetY - point.y;
            // set which point to modify
            dragData.point = point;
            // add event listeners for handling all this
            canvas.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', handleStopDrag);
            // abort since we've found a point to drag
            return;
        }
    }

    // None of the existing points were clicked; create a new one!
    canvas.addEventListener('mouseup', addPoint(event.timeStamp), { once: true });

});

canvas.addEventListener('mousemove', event => {
    if (rectangleCollision(event.pageX, event.pageY, canvas.offsetLeft, canvas.offsetTop, canvas.width, canvas.height)) {
        // inside canvas, use offset
        textX.innerText = event.offsetX;
        textY.innerText = event.offsetY;
    } else {
        // outside, then it's [REDACTED]
        textX.innerText = '?';
        textY.innerText = '?';
    }
});

// vim:tw=4
