const canvas = document.getElementById('pitch');
const ctx = canvas.getContext('2d');

// Game State Variables
let matchSeconds = 0;
let scorePink = 0;
let scoreWhite = 0;

// Match Timer
setInterval(() => {
    matchSeconds++;
    let mins = String(Math.floor(matchSeconds / 60)).padStart(2, '0');
    let secs = String(matchSeconds % 60).padStart(2, '0');
    document.getElementById('clock').innerText = `Time: ${mins}:${secs}`;
}, 1000);

// Real Commentator Voice Function using Web Speech API
function speakCommentary(text) {
    document.getElementById('commentary').innerText = "Commentator: " + text;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop previous speech
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

// Ball Object
let ball = {
    x: 400,
    y: 250,
    vx: 0,
    vy: 0,
    radius: 7,
    color: '#ffffff',
    holder: null // Keeps track of which player has the ball
};

// Main Controlled Player (Team Pink - Star Player #10)
let userPlayer = {
    x: 350,
    y: 250,
    radius: 10,
    skinColor: '#8d5524', // African skin tone
    shirtColor: '#ff3399',
    number: '10',
    speed: 4.5,
    isUser: true
};

// Build 11 vs 11 Teams (1 GK + 10 Outfield Players each)
let teamPink = [];
let teamWhite = [];

// Add User to Team Pink
teamPink.push(userPlayer);

// Add Pink Team Goalkeeper (Black Jersey)
teamPink.push({ x: 40, y: 250, radius: 10, skinColor: '#8d5524', shirtColor: '#000000', number: '1', isGK: true });

// Add remaining 9 outfield players for Team Pink (African players, Pink shirts, White numbers)
let pinkFormations = [
    {x: 150, y: 150}, {x: 150, y: 350}, {x: 220, y: 100}, {x: 220, y: 400},
    {x: 280, y: 200}, {x: 280, y: 300}, {x: 340, y: 120}, {x: 340, y: 380}, {x: 250, y: 250}
];
pinkFormations.forEach((pos, index) => {
    teamPink.push({ x: pos.x, y: pos.y, radius: 10, skinColor: '#8d5524', shirtColor: '#ff3399', number: String(index + 2) });
});

// Add White Team Goalkeeper (Pink Jersey)
teamWhite.push({ x: 760, y: 250, radius: 10, skinColor: '#f0d5be', shirtColor: '#ff3399', number: '1', isGK: true });

// Add 10 outfield players for Team White (American players, White shirts, Pink numbers)
let whiteFormations = [
    {x: 650, y: 150}, {x: 650, y: 350}, {x: 580, y: 100}, {x: 580, y: 400},
    {x: 520, y: 200}, {x: 520, y: 300}, {x: 460, y: 120}, {x: 460, y: 380}, {x: 550, y: 200}, {x: 550, y: 300}
];
whiteFormations.forEach((pos, index) => {
    teamWhite.push({ x: pos.x, y: pos.y, radius: 10, skinColor: '#f0d5be', shirtColor: '#ffffff', number: String(index + 2) });
});

let referee = { x: 400, y: 120 };

// Keyboard Tracking
let keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// Controls: Space = Shoot, P = Pass to nearest teammate
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        ball.vx = 10; // Powerful shot toward white goal
        ball.holder = null;
        speakCommentary("What a powerful shot! Goal bound!");
    }
    if (e.code === 'KeyP' || e.key === 'p') {
        // Pass to the nearest pink teammate
        let nearestTeammate = null;
        let minDist = 9999;
        teamPink.forEach(p => {
            if (p !== userPlayer) {
                let dist = Math.hypot(p.x - userPlayer.x, p.y - userPlayer.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearestTeammate = p;
                }
            }
        });
        if (nearestTeammate) {
            ball.vx = (nearestTeammate.x - ball.x) * 0.15;
            ball.vy = (nearestTeammate.y - ball.y) * 0.15;
            ball.holder = null;
            speakCommentary("Brilliant short pass to teammate!");
        }
    }
});

function update() {
    // 1. User Movement with Arrow Keys
    if (keys['ArrowUp'] && userPlayer.y > 35) userPlayer.y -= userPlayer.speed;
    if (keys['ArrowDown'] && userPlayer.y < canvas.height - 35) userPlayer.y += userPlayer.speed;
    if (keys['ArrowLeft'] && userPlayer.x > 35) userPlayer.x -= userPlayer.speed;
    if (keys['ArrowRight'] && userPlayer.x < canvas.width - 35) userPlayer.x += userPlayer.speed;

    // 2. Ball handling when user has it
    let distToUser = Math.hypot(userPlayer.x - ball.x, userPlayer.y - ball.y);
    if (distToUser < 15) {
        ball.holder = userPlayer;
    }

    if (ball.holder === userPlayer) {
        ball.x = userPlayer.x + 10;
        ball.y = userPlayer.y;
    } else {
        // Ball Physics & Friction
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= 0.97;
        ball.vy *= 0.97;
    }

    // 3. AI Teammates & Opponents Movement (Passing and Dribbling Simulation)
    teamPink.forEach(p => {
        if (p === userPlayer) return;
        // Move towards ball if team needs possession
        let dist = Math.hypot(ball.x - p.x, ball.y - p.y);
        if (dist < 180 && !ball.holder) {
            p.x += (ball.x - p.x) * 0.02;
            p.y += (ball.y - p.y) * 0.02;
        }
    });

    teamWhite.forEach(p => {
        let dist = Math.hypot(ball.x - p.x, ball.y - p.y);
        if (dist < 200) {
            p.x += (ball.x - p.x) * 0.025;
            p.y += (ball.y - p.y) * 0.025;
        }
        // White team tackles/intercepts
        if (dist < 15) {
            ball.holder = null;
            ball.vx = -7; // Pass back toward pink goal
            speakCommentary("Team White wins possession with a great tackle!");
        }
    });

    // Boundary checks for ball
    if (ball.x < 25 || ball.x > canvas.width - 25) ball.vx *= -1;
    if (ball.y < 25 || ball.y > canvas.height - 25) ball.vy *= -1;

    // Goal Detection
    if (ball.x > canvas.width - 25 && ball.y > 180 && ball.y < 320) {
        scorePink++;
        document.getElementById('scorePink').innerText = scorePink;
        speakCommentary("GOAL! Incredible team play! The crowd goes absolutely wild!");
        resetBall();
    } else if (ball.x < 25 && ball.y > 180 && ball.y < 320) {
        scoreWhite++;
        document.getElementById('scoreWhite').innerText = scoreWhite;
        speakCommentary("GOAL! Team White scores a brilliant counter-attack goal!");
        resetBall();
    }
}

function resetBall() {
    ball.x = 400;
    ball.y = 250;
    ball.vx = 0;
    ball.vy = 0;
    ball.holder = null;
}

function drawPitchLines() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 20);
    ctx.lineTo(canvas.width / 2, canvas.height - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(20, 180, 20, 140);
    ctx.strokeRect(canvas.width - 40, 180, 20, 140);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPitchLines();

    // Draw Referee
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath(); ctx.arc(referee.x, referee.y, 8, 0, Math.PI * 2); ctx.fill();

    // Draw Team Pink (11 players)
    teamPink.forEach(p => {
        ctx.fillStyle = p.skinColor;
        ctx.beginPath(); ctx.arc(p.x, p.y - 7, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.shirtColor;
        ctx.fillRect(p.x - 4, p.y - 1, 8, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = '7px Arial';
        ctx.fillText(p.number, p.x - 3, p.y + 9);
    });

    // Draw Team White (11 players)
    teamWhite.forEach(p => {
        ctx.fillStyle = p.skinColor;
        ctx.beginPath(); ctx.arc(p.x, p.y - 7, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.shirtColor;
        ctx.fillRect(p.x - 4, p.y - 1, 8, 12);
        ctx.fillStyle = '#ff3399';
        ctx.font = '7px Arial';
        ctx.fillText(p.number, p.x - 3, p.y + 9);
    });

    // Highlight User Player (#10) with a glowing ring
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(userPlayer.x, userPlayer.y, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

speakCommentary("Welcome to the ultimate match! Kickoff underway!");
gameLoop();