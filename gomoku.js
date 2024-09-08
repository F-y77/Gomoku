const chessboard = document.getElementById('chessboard');
const ctx = chessboard.getContext('2d');
const moveSound = document.getElementById('moveSound');
const undoBtn = document.getElementById('undo-btn');
const hintBtn = document.getElementById('hint-btn');
const moveCounter = document.getElementById('move-counter');
const timerDisplay = document.getElementById('timer');
const pauseOverlay = document.getElementById('pause-overlay');

const gridSize = 30;
const boardSize = 15;
const margin = gridSize / 2;

let gameBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(null));
let moveHistory = [];
let isPaused = false;
let startTime = Date.now();
let timerInterval;

function drawBoard() {
    chessboard.width = gridSize * (boardSize - 1) + margin * 2;
    chessboard.height = gridSize * (boardSize - 1) + margin * 2;

    ctx.fillStyle = '#DEB887';  // 浅木色背景
    ctx.fillRect(0, 0, chessboard.width, chessboard.height);

    ctx.strokeStyle = '#8B4513';  // 深棕色线条
    ctx.lineWidth = 1;

    for (let i = 0; i < boardSize; i++) {
        ctx.beginPath();
        ctx.moveTo(margin + i * gridSize, margin);
        ctx.lineTo(margin + i * gridSize, chessboard.height - margin);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(margin, margin + i * gridSize);
        ctx.lineTo(chessboard.width - margin, margin + i * gridSize);
        ctx.stroke();
    }

    // 绘制五个小圆点
    const dotPositions = [3, 7, 11];
    ctx.fillStyle = '#8B4513';
    for (let i of dotPositions) {
        for (let j of dotPositions) {
            ctx.beginPath();
            ctx.arc(margin + i * gridSize, margin + j * gridSize, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

function drawPiece(x, y, color) {
    const gradient = ctx.createRadialGradient(
        margin + x * gridSize + 2, margin + y * gridSize + 2, 2,
        margin + x * gridSize + 2, margin + y * gridSize + 2, gridSize / 2 - 2
    );
    if (color === 'black') {
        gradient.addColorStop(0, '#666');
        gradient.addColorStop(1, '#000');
    } else {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, '#ccc');
    }
    
    ctx.beginPath();
    ctx.arc(margin + x * gridSize, margin + y * gridSize, gridSize / 2 - 2, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = color === 'black' ? '#000' : '#888';
    ctx.stroke();
}

function checkWin(x, y, player) {
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let [dx, dy] of directions) {
        let count = 1;
        for (let i = 1; i <= 4; i++) {
            if (gameBoard[y + i * dy]?.[x + i * dx] === player) count++;
            else break;
        }
        for (let i = 1; i <= 4; i++) {
            if (gameBoard[y - i * dy]?.[x - i * dx] === player) count++;
            else break;
        }
        if (count >= 5) return true;
    }
    return false;
}

function evaluatePosition(x, y, player) {
    let score = 0;
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let [dx, dy] of directions) {
        let count = 1;
        let blocked = 0;
        for (let i = 1; i <= 4; i++) {
            if (gameBoard[y + i * dy]?.[x + i * dx] === player) count++;
            else if (gameBoard[y + i * dy]?.[x + i * dx] !== null) {
                blocked++;
                break;
            } else break;
        }
        for (let i = 1; i <= 4; i++) {
            if (gameBoard[y - i * dy]?.[x - i * dx] === player) count++;
            else if (gameBoard[y - i * dy]?.[x - i * dx] !== null) {
                blocked++;
                break;
            } else break;
        }
        if (count >= 5) score += 100000;
        else if (count === 4 && blocked === 0) score += 10000;
        else if (count === 3 && blocked === 0) score += 1000;
        else if (count === 2 && blocked === 0) score += 100;
        else if (count === 1 && blocked === 0) score += 10;
    }
    return score;
}

function aiMove(hintMode = false) {
    let bestScore = -Infinity;
    let bestMove;
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (!gameBoard[y][x]) {
                // 评估AI（白子）的得分
                gameBoard[y][x] = 'white';
                let whiteScore = evaluatePosition(x, y, 'white');
                
                // 评估玩家（黑子）的得分
                gameBoard[y][x] = 'black';
                let blackScore = evaluatePosition(x, y, 'black');
                
                // 重置为空
                gameBoard[y][x] = null;
                
                // 计算总分：AI得分 + 阻挡玩家得分的权重
                let score = whiteScore + blackScore * 0.8;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = {x, y};
                }
            }
        }
    }
    if (bestMove) {
        if (hintMode) {
            return bestMove;
        } else {
            gameBoard[bestMove.y][bestMove.x] = 'white';
            drawPiece(bestMove.x, bestMove.y, 'white');
            moveSound.play();
            moveHistory.push({x: bestMove.x, y: bestMove.y, color: 'white'});
            updateMoveCounter();
            if (checkWin(bestMove.x, bestMove.y, 'white')) {
                setTimeout(() => alert('白子胜利！'), 100);
                resetGame();
            }
        }
    }
}

function resetGame() {
    gameBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(null));
    moveHistory = [];
    ctx.clearRect(0, 0, chessboard.width, chessboard.height);
    drawBoard();
    updateMoveCounter();
    startTime = Date.now();
}

function updateMoveCounter() {
    const movesLeft = 112 - moveHistory.length;
    moveCounter.textContent = `剩余步数: ${movesLeft}`;
}

function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = `时间: ${elapsedTime}s`;
}

function undo() {
    if (moveHistory.length >= 2) {
        gameBoard[moveHistory[moveHistory.length - 1].y][moveHistory[moveHistory.length - 1].x] = null;
        gameBoard[moveHistory[moveHistory.length - 2].y][moveHistory[moveHistory.length - 2].x] = null;
        moveHistory.pop();
        moveHistory.pop();
        ctx.clearRect(0, 0, chessboard.width, chessboard.height);
        drawBoard();
        moveHistory.forEach(move => drawPiece(move.x, move.y, move.color));
        updateMoveCounter();
    }
}

function getHint() {
    const hintMove = aiMove(true);
    if (hintMove) {
        ctx.beginPath();
        ctx.arc(margin + hintMove.x * gridSize, margin + hintMove.y * gridSize, gridSize / 2 - 2, 0, 2 * Math.PI);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function togglePause() {
    isPaused = !isPaused;
    pauseOverlay.style.display = isPaused ? 'flex' : 'none';
    if (isPaused) {
        clearInterval(timerInterval);
    } else {
        startTime = Date.now() - parseInt(timerDisplay.textContent.split(': ')[1]) * 1000;
        timerInterval = setInterval(updateTimer, 1000);
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

chessboard.addEventListener('click', (e) => {
    if (isPaused) return;

    const rect = chessboard.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left - margin) / gridSize);
    const y = Math.round((e.clientY - rect.top - margin) / gridSize);

    if (x < 0 || x >= boardSize || y < 0 || y >= boardSize || gameBoard[y][x]) return;

    gameBoard[y][x] = 'black';
    drawPiece(x, y, 'black');
    moveSound.play();
    moveHistory.push({x, y, color: 'black'});
    updateMoveCounter();

    if (checkWin(x, y, 'black')) {
        setTimeout(() => alert('黑子胜利！'), 100);
        resetGame();
        return;
    }

    setTimeout(aiMove, 500);
});

undoBtn.addEventListener('click', undo);
hintBtn.addEventListener('click', getHint);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        togglePause();
    } else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }
});

drawBoard();
timerInterval = setInterval(updateTimer, 1000);