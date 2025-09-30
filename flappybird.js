
// Game state management
let gameState = 'TITLE'; // 'TITLE', 'COUNTDOWN', 'PLAYING', 'LEADERBOARD'
let gameMode = 'SINGLE'; // 'SINGLE', 'TWO_PLAYER', 'AI_VS_AI', 'PLAYER_VS_AI'

// High Score System
let highScores = {
    SINGLE: 0,
    TWO_PLAYER: 0,
    AI_VS_AI: 0,
    PLAYER_VS_AI: 0
};

// Load high scores from localStorage
function loadHighScores() {
    const saved = localStorage.getItem('flappyBirdHighScores');
    if (saved) {
        highScores = { ...highScores, ...JSON.parse(saved) };
    }
}

// Save high scores to localStorage
function saveHighScores() {
    localStorage.setItem('flappyBirdHighScores', JSON.stringify(highScores));
}

// Update high score for current mode
function updateHighScore(score) {
    if (score > highScores[gameMode]) {
        highScores[gameMode] = score;
        saveHighScores();
        return true; // New high score!
    }
    return false;
}

function drawScrollingBackground(game) {
    if (backgroundImg && backgroundImg.complete) {
        // Update background positions
        if (!game.gameOver) {
            backgroundX1 -= backgroundSpeed;
            backgroundX2 -= backgroundSpeed;

            // Reset positions when they go off screen
            if (backgroundX1 <= -backgroundImg.width) {
                backgroundX1 = backgroundX2 + backgroundImg.width;
            }
            if (backgroundX2 <= -backgroundImg.width) {
                backgroundX2 = backgroundX1 + backgroundImg.width;
            }
        }

        // Draw both background images to create seamless loop
        game.context.drawImage(backgroundImg, backgroundX1, 0, backgroundImg.width, game.board.height);
        game.context.drawImage(backgroundImg, backgroundX2, 0, backgroundImg.width, game.board.height);
    }
}

// Countdown system
let countdownTimer = 0;
let countdownValue = 3;

// Frame rate limiting
let lastTime = 0;
const targetFPS = 90;
const frameInterval = 1000 / targetFPS; // 16.67ms between frames at 60fps
let frameCount = 0;

// Gamepad support
let gamepadConnected = false;
let gamepadIndex = -1;
let gamepad2Connected = false;
let gamepad2Index = -1;
// Track last axis states per gamepad index to detect edge (not hold) for joysticks
let lastAxisStates = {}; // { [index]: { y: 0 } }
// Axis deadzone threshold for stick navigation
const AXIS_DEADZONE = 0.45;

// Controller navigation
let currentMenuIndex = 0;
let menuButtons = ['single-player-btn', 'two-player-btn', 'ai-vs-ai-btn', 'player-vs-ai-btn', 'leaderboard-btn'];
let leaderboardButtons = ['back-to-menu-btn'];
let currentLeaderboardIndex = 0;
let lastDpadState = { up: false, down: false, left: false, right: false };
let lastButtonStates = { a: false, b: false, x: false, y: false };

//board - responsive sizing (scaled up for bigger game)
let boardWidth = 480; // Increased from 360
let boardHeight = 800; // Increased from 640
let canvasScale = 1;

//bird (scaled up)
let birdWidth = 45; //scaled up from 34
let birdHeight = 32; //scaled up from 24
let birdX = boardWidth / 8;
let birdY = boardHeight / 2;
let birdImg;

//bird animation
let birdAnimFrames = [];
let animationSpeed = 4; // frames per animation frame (reduced from 8 for faster animation)
let flapAnimationDuration = 12; // frames to show flap animation (reduced from 20)

//sound effects
let sfxWing;
let sfxHit;
let sfxDie;
let sfxPoint;

//scrolling background
let backgroundImg;
let backgroundX1 = 0;
let backgroundX2 = 0;
let backgroundSpeed = 0.15;

//easter egg
let rianbaldImg;
let rianbaldTrigger = {
    game1: false,
    game2: false
};
let rianbaldAnimation = {
    game1: { active: false, timer: 0, y: 0, targetY: 0 },
    game2: { active: false, timer: 0, y: 0, targetY: 0 }
};

// Random Events System
let randomEvents = {
    game1: {
        active: false,
        type: null,
        timer: 0,
        duration: 0,
        originalValues: {}
    },
    game2: {
        active: false,
        type: null,
        timer: 0,
        duration: 0,
        originalValues: {}
    }
};

// Event types and their properties
const EVENT_TYPES = {
    BONUS_ROUND: {
        name: "BONUS ROUND",
        color: "#4ECDC4",
        description: "Wider pipes for easier passage!",
        duration: 600, // 10 seconds at 60fps
        probability: 0.15
    },
    SPEED_BOOST: {
        name: "SPEED BOOST",
        color: "#FF6B6B",
        description: "Pipes move faster for extra challenge!",
        duration: 600, // 8 seconds
        probability: 0.12
    },
    GRAVITY_SHIFT: {
        name: "GRAVITY SHIFT",
        color: "#96CEB4",
        description: "Reduced gravity for easier control!",
        duration: 600, // 12 seconds
        probability: 0.18
    },
    SCORE_MULTIPLIER: {
        name: "SCORE MULTIPLIER",
        color: "#FFD93D",
        description: "Double points for a limited time!",
        duration: 600, // 10 seconds
        probability: 0.20
    },
    SHIELD_MODE: {
        name: "SHIELD MODE",
        color: "#45B7D1",
        description: "Temporary invincibility!",
        duration: 600, // 5 seconds
        probability: 0.10
    },
    BOSS_FIGHT: {
        name: "BOSS FIGHT",
        color: "#8B0000",
        description: "Special challenging pipe pattern!",
        duration: 900, // 15 seconds
        probability: 0.08
    }
};

//pipes (scaled up)
let pipeWidth = 85; //scaled up from 64
let pipeHeight = 680; //scaled up from 512
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let baseVelocityX = -5; //base pipes moving left speed
let velocityX = -5; //current pipes moving left speed
let gravity = 0.41;
let bounceVelocity = -7; //bounce when hitting ground

//difficulty settings
let basePipeInterval = 1750; //base pipe spawn interval in ms
let baseOpeningSpace = boardHeight / 4; //base gap between pipes
let currentPipeInterval = basePipeInterval;

//AI settings
let aiEnabled = {
    game1: false,
    game2: false
};

//game instances for both players
let game1 = {
    board: null,
    context: null,
    bird: {
        x: birdX,
        y: birdY,
        width: birdWidth,
        height: birdHeight
    },
    pipeArray: [],
    velocityY: 0,
    gameOver: false,
    score: 0,
    deathAnimation: false,
    deathTimer: 0,
    hasBounced: false,
    gameOverScreenTimer: 0,
    canRestart: false,
    gameOverPanel: {
        y: boardHeight,
        targetY: boardHeight / 2 - 100,
        velocity: 0,
        settled: false
    },
    pipeInterval: null,
    lastDifficultyUpdate: 0,
    animationFrame: 0,
    animationTimer: 0,
    flapAnimation: 0,
    isFlapping: false,
    // AI properties
    aiLastDecision: 0
};

let game2 = {
    board: null,
    context: null,
    bird: {
        x: birdX,
        y: birdY,
        width: birdWidth,
        height: birdHeight
    },
    pipeArray: [],
    velocityY: 0,
    gameOver: false,
    score: 0,
    deathAnimation: false,
    deathTimer: 0,
    hasBounced: false,
    gameOverScreenTimer: 0,
    canRestart: false,
    gameOverPanel: {
        y: boardHeight,
        targetY: boardHeight / 2 - 100,
        velocity: 0,
        settled: false
    },
    pipeInterval: null,
    lastDifficultyUpdate: 0,
    animationFrame: 0,
    animationTimer: 0,
    flapAnimation: 0,
    isFlapping: false,
    // AI properties
    aiLastDecision: 0
};

window.onload = function () {
    loadHighScores(); // Load saved high scores
    setupResponsiveCanvas();
    setupMenuButtons();

    //left side game
    game1.board = document.getElementById("board1");
    game1.board.height = boardHeight;
    game1.board.width = boardWidth;
    game1.context = game1.board.getContext("2d");

    //right side game
    game2.board = document.getElementById("board2");
    game2.board.height = boardHeight;
    game2.board.width = boardWidth;
    game2.context = game2.board.getContext("2d");

    //load images
    birdImg = new Image();
    birdImg.src = "./flappybird0.png";

    // Load bird animation frames
    for (let i = 0; i < 3; i++) {
        let frame = new Image();
        frame.src = `./flappybird${i}.png`;
        birdAnimFrames.push(frame);
    }

    topPipeImg = new Image();
    topPipeImg.src = "./toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./bottompipe.png";

    //load sound effects
    sfxWing = new Audio();
    sfxWing.src = "./sfx_wing.wav";

    sfxHit = new Audio();
    sfxHit.src = "./sfx_hit.wav";

    sfxDie = new Audio();
    sfxDie.src = "./sfx_die.wav";

    sfxPoint = new Audio();
    sfxPoint.src = "./sfx_point.wav";

    //load scrolling background image
    backgroundImg = new Image();
    backgroundImg.src = "./anotherbg.png";

    // Initialize background positions
    backgroundImg.onload = function () {
        backgroundX2 = backgroundImg.width;
    };

    //load easter egg image
    rianbaldImg = new Image();
    rianbaldImg.src = "./rianbald.png";



    // Only start the game loop, don't start pipe intervals yet
    requestAnimationFrame(update);

    window.addEventListener("resize", setupResponsiveCanvas);
    
    // Gamepad event listeners
    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
    
    // Initialize menu navigation
    updateMenuHighlight();
}

function setupResponsiveCanvas() {
    const container = document.getElementById("game-container");
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    // Calculate scale to fit both canvases side by side
    const totalWidth = boardWidth * 2 + 20; // 20px gap between canvas
    const scaleX = containerWidth / totalWidth;
    const scaleY = containerHeight / boardHeight;
    canvasScale = Math.min(scaleX, scaleY, 1.2); // Increased max scale from 1 to 1.2 for bigger display

    //scaling to the container we are in
    container.style.transform = `scale(${canvasScale})`;
    container.style.transformOrigin = 'center center';
}

function setupMenuButtons() {
    // Menu buttons are now controlled by controller navigation
    // No need for click event listeners
}

function showLeaderboard() {
    gameState = 'LEADERBOARD';
    currentLeaderboardIndex = 0;

    // Update leaderboard display with current high scores
    document.getElementById('score-single').textContent = highScores.SINGLE;
    document.getElementById('score-two-player').textContent = highScores.TWO_PLAYER;
    document.getElementById('score-ai-vs-ai').textContent = highScores.AI_VS_AI;
    document.getElementById('score-player-vs-ai').textContent = highScores.PLAYER_VS_AI;

    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'flex';
    
    // Initialize leaderboard highlight
    updateLeaderboardHighlight();
}

function hideLeaderboard() {
    gameState = 'TITLE';
    document.getElementById('leaderboard-screen').style.display = 'none';
    document.getElementById('title-screen').style.display = 'flex';
}



function startCountdown(mode) {
    gameMode = mode;
    gameState = 'COUNTDOWN';
    countdownValue = 3;
    countdownTimer = 0;

    // Hide title screen and show countdown
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('countdown-screen').style.display = 'flex';

    // Set countdown mode text
    const modeNames = {
        'SINGLE': 'SINGLE PLAYER',
        'TWO_PLAYER': 'TWO PLAYER',
        'AI_VS_AI': 'AI vs AI',
        'PLAYER_VS_AI': 'PLAYER vs AI'
    };
    document.getElementById('countdown-mode').textContent = modeNames[mode];
    document.getElementById('countdown-number').textContent = countdownValue;

    // Play countdown sound
    playSound(sfxWing);
}

function startGame(mode) {
    gameState = 'PLAYING';

    // Reset all global game variables to original values before starting
    velocityX = baseVelocityX;
    gravity = 0.41;
    currentPipeInterval = basePipeInterval;
    baseOpeningSpace = boardHeight / 4;

    // Reset all random events
    randomEvents.game1 = {
        active: false,
        type: null,
        timer: 0,
        duration: 0,
        originalValues: {}
    };
    randomEvents.game2 = {
        active: false,
        type: null,
        timer: 0,
        duration: 0,
        originalValues: {}
    };

    // Hide countdown screen and show game
    document.getElementById('countdown-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';

    // Configure AI based on game mode
    switch (mode) {
        case 'SINGLE':
            aiEnabled.game1 = false;
            aiEnabled.game2 = false;
            // Hide second canvas for single player
            document.getElementById('board2').style.display = 'none';
            break;
        case 'TWO_PLAYER':
            aiEnabled.game1 = false;
            aiEnabled.game2 = false;
            document.getElementById('board2').style.display = 'block';
            break;
        case 'AI_VS_AI':
            aiEnabled.game1 = true;
            aiEnabled.game2 = true;
            document.getElementById('board2').style.display = 'block';
            break;
        case 'PLAYER_VS_AI':
            aiEnabled.game1 = false;
            aiEnabled.game2 = true;
            document.getElementById('board2').style.display = 'block';
            break;
    }

    // Initialize games
    initializeGames();
}

function initializeGames() {
    // Reset both games
    resetGame(game1);
    resetGame(game2);

    // Draw initial birds
    if (birdAnimFrames[0] && birdAnimFrames[0].complete) {
        const initialFrame = birdAnimFrames[0];
        game1.context.drawImage(initialFrame, game1.bird.x, game1.bird.y, game1.bird.width, game1.bird.height);
        if (gameMode !== 'SINGLE') {
            game2.context.drawImage(initialFrame, game2.bird.x, game2.bird.y, game2.bird.width, game2.bird.height);
        }
    }

    // Start pipe intervals
    game1.pipeInterval = setInterval(() => placePipes(game1), currentPipeInterval);
    if (gameMode !== 'SINGLE') {
        game2.pipeInterval = setInterval(() => placePipes(game2), currentPipeInterval);
    }
}

function calculateDifficulty(score) {
    // Square root function for progressive difficulty
    // Starts at 1.0 and increases gradually
    const difficultyMultiplier = 1 + Math.sqrt(score) * 0.1;

    // Calculate new pipe speed (faster as score increases)
    const newVelocityX = baseVelocityX * difficultyMultiplier;

    // Calculate new pipe interval (more frequent pipes, but not too crazy)
    const newPipeInterval = Math.max(basePipeInterval / (1 + Math.sqrt(score) * 0.05), 1000);

    // Calculate new opening space (smaller gap, but keep it playable)
    const newOpeningSpace = Math.max(baseOpeningSpace - Math.sqrt(score) * 2, baseOpeningSpace * 0.6);

    return {
        velocityX: Math.max(newVelocityX, baseVelocityX * 2.5), // Cap at 2.5x speed
        pipeInterval: newPipeInterval,
        openingSpace: newOpeningSpace
    };
}

function updateDifficulty(game) {
    // Update difficulty every 5 points to avoid constant changes
    const scoreThreshold = Math.floor(game.score / 5) * 5;

    if (scoreThreshold > game.lastDifficultyUpdate) {
        game.lastDifficultyUpdate = scoreThreshold;

        const difficulty = calculateDifficulty(game.score);
        velocityX = difficulty.velocityX;

        // Update pipe interval by clearing old interval and creating new one
        if (game.pipeInterval) {
            clearInterval(game.pipeInterval);
            game.pipeInterval = setInterval(() => placePipes(game), difficulty.pipeInterval);
        }
    }
}

function updateBirdAnimation(game) {
    // Handle flap animation when jumping - cycle through once
    if (game.isFlapping) {
        game.flapAnimation++;
        // Calculate which frame to show (0, 1, 2, then back to 0)
        const frameIndex = Math.floor(game.flapAnimation / 3) % 3; // 3 frames per animation frame for faster transition
        game.animationFrame = frameIndex;

        // End animation after one complete cycle (3 frames * 3 = 9 frames)
        if (game.flapAnimation >= 9) {
            game.isFlapping = false;
            game.flapAnimation = 0;
            game.animationFrame = 0; // Reset to first frame when not flapping
        }
    }
}

function drawBird(game) {
    // Always use the current animation frame (0 when idle, cycles 0->1->2->0 when flapping)
    let currentFrame = birdAnimFrames[game.animationFrame];

    // Use fallback if animation frames aren't loaded yet
    if (!currentFrame || !currentFrame.complete) {
        currentFrame = birdAnimFrames[0] || birdImg;
    }

    // Save the current context state
    game.context.save();

    // Add glow effect
    let glowColor = '#FFD93D'; // Default golden glow
    let glowBlur = 15;
    
    // Check for shield mode
    let gameKey = game === game1 ? 'game1' : 'game2';
    if (randomEvents[gameKey].active && randomEvents[gameKey].type === 'SHIELD_MODE') {
        glowColor = '#45B7D1'; // Blue glow for shield
        glowBlur = 25; // Stronger glow for shield
    }
    
    game.context.shadowColor = glowColor;
    game.context.shadowBlur = glowBlur;
    game.context.shadowOffsetX = 0;
    game.context.shadowOffsetY = 0;

    // Draw the bird with glow
    game.context.drawImage(currentFrame, game.bird.x, game.bird.y, game.bird.width, game.bird.height);

    // Restore the context state to avoid affecting other drawings
    game.context.restore();
}

function update(currentTime = 0) {
    // Frame rate limiting - only update at 60fps
    if (currentTime - lastTime >= frameInterval) {
        lastTime = currentTime;
        frameCount++;
        
        if (gameState === 'TITLE') { 
            updateControllerNavigation();
        } else if (gameState === 'COUNTDOWN') {
            updateCountdown();
        } else if (gameState === 'PLAYING') {
            updateGame(game1);
            if (gameMode !== 'SINGLE') {
                updateGame(game2);
            }
            // Also check controller navigation during gameplay for Y button
            updateControllerNavigation();
        } else if (gameState === 'LEADERBOARD') {
            updateControllerNavigation();
        }
    }
    
    requestAnimationFrame(update);
}

function updateCountdown() {
    countdownTimer++;

    // Update every 60 frames (1 second at 60fps)
    if (countdownTimer % 60 === 0) {
        countdownValue--;

        if (countdownValue > 0) {
            document.getElementById('countdown-number').textContent = countdownValue;
            // Trigger animation by removing and re-adding class
            const numberEl = document.getElementById('countdown-number');
            numberEl.style.animation = 'none';
            setTimeout(() => {
                numberEl.style.animation = 'countdownPulse 1s ease-in-out';
            }, 10);
            playSound(sfxWing);
        } else {
            // Start the game!
            document.getElementById('countdown-number').textContent = 'GO!';
            document.getElementById('countdown-text').textContent = 'FLY!';
            playSound(sfxPoint);

            setTimeout(() => {
                startGame(gameMode);
            }, 500);
        }
    }
}

function updateGame(game) {
    game.context.clearRect(0, 0, game.board.width, game.board.height);

    // Draw scrolling background
    drawScrollingBackground(game);

    // Update random events
    let gameKey = game === game1 ? 'game1' : 'game2';
    updateRandomEvent(game, gameKey);

    // AI decision making
    if (aiEnabled[gameKey] && !game.gameOver) {
        updateAI(game);
    }
    
    // Check gamepad input
    checkGamepadInput();

    // Handle death animation
    if (game.gameOver && !game.deathAnimation) {
        game.deathAnimation = true;
        game.deathTimer = 0;
    }

    if (game.deathAnimation) {
        game.deathTimer++;
        //continue bird physics during animation
        game.velocityY += gravity;
        game.bird.y += game.velocityY;

        //bounce only once when hitting ground
        if (game.bird.y > game.board.height - 90 && !game.hasBounced) {
            game.bird.y = game.board.height - 90;
            if (game.velocityY > 0) {
                game.velocityY = bounceVelocity;
                game.hasBounced = true;
            }
        }

        //draw bird with slight rot using first animation frame
        game.context.save();
        game.context.translate(game.bird.x + game.bird.width / 2, game.bird.y + game.bird.height / 2);
        game.context.rotate(Math.PI / 4); //45 deg rotation

        // Add glow effect for death animation too
        game.context.shadowColor = '#FF6B6B'; // Red glow for death
        game.context.shadowBlur = 20; // Slightly stronger glow for dramatic effect
        game.context.shadowOffsetX = 0;
        game.context.shadowOffsetY = 0;

        const deathFrame = birdAnimFrames[0] && birdAnimFrames[0].complete ? birdAnimFrames[0] : birdImg;
        game.context.drawImage(deathFrame, -game.bird.width / 2, -game.bird.height / 2, game.bird.width, game.bird.height);
        game.context.restore();
    } else if (!game.gameOver) {
        //bird - normal gameplay
        game.velocityY += gravity;
        game.bird.y = Math.max(game.bird.y + game.velocityY, 0); //apply gravity to current bird.y, limit the bird.y to top of the canvas

        // Update and draw bird animation
        updateBirdAnimation(game);
        drawBird(game);

        //check for death
        if (game.bird.y > game.board.height - 90 || game.bird.y <= 0) {
            game.gameOver = true;
            playSound(sfxDie);
        }
    }

    //pipes
    for (let i = 0; i < game.pipeArray.length; i++) {
        let pipe = game.pipeArray[i];
        if (!game.gameOver) {
            pipe.x += velocityX;
        }
        game.context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && game.bird.x > pipe.x + pipe.width && !game.gameOver) {
            // Calculate score with multiplier
            let scoreGain = 0.5; //0.5 because there are 2 pipes! so 0.5*2 = 1, 1 for each set of pipes
            
            // Apply score multiplier if active
            gameKey = game === game1 ? 'game1' : 'game2';
            if (randomEvents.game2.active && randomEvents.game2.type === 'SCORE_MULTIPLIER') {//if (randomEvents[gameKey].active && randomEvents[gameKey].type === 'SCORE_MULTIPLIER') {
                scoreGain *= 2;
            }
            
            game.score += scoreGain;
            pipe.passed = true;

            // Play point sound when score increases by a full point (every 2 pipes)
            if (Math.floor(game.score) > Math.floor(game.score - scoreGain)) {
                playSound(sfxPoint);
            }

            // Trigger rianbald easter egg at score 5
            gameKey = game === game1 ? 'game1' : 'game2';
            if ((Math.floor(game.score) === 41 || Math.floor(game.score) === 67 || (Math.floor(game.score) % 100 === 0 && Math.floor(game.score) > 5)) && !rianbaldTrigger[gameKey]) {
                rianbaldTrigger[gameKey] = true;
                triggerRianbaldEasterEgg(game, pipe);
            }

            // Check for random events
            checkRandomEvent(game, gameKey);

            // Update difficulty when score changes
            updateDifficulty(game);
        }

        gameKey = game === game1 ? 'game1' : 'game2';
        if (detectCollisionWithShield(game.bird, pipe, game, gameKey) && !game.gameOver) {
            game.gameOver = true;
            playSound(sfxHit);
            playSound(sfxDie);
        }
    }

    //clear pipes
    while (game.pipeArray.length > 0 && game.pipeArray[0].x < -pipeWidth) {
        game.pipeArray.shift(); //removes first element from the array
    }

    //score - nice styling with real-time high score display
    if (!game.gameOver || game.deathTimer <= 60) {
        const currentScore = Math.floor(game.score);
        let currentHighScore = highScores[gameMode];

        // Update high score in real time if current score is higher
        if (currentScore > currentHighScore) {
            currentHighScore = currentScore;
            highScores[gameMode] = currentScore;
            saveHighScores();
        }

        // Current Score shadow
        game.context.fillStyle = "rgba(0, 0, 0, 0.7)";
        game.context.font = "bold 36px 'Courier New', monospace";
        game.context.fillText(currentScore, 12, 52);

        // Main score text
        game.context.fillStyle = currentScore >= currentHighScore ? "#FF6B6B" : "#FFD93D";
        game.context.fillText(currentScore, 10, 50);

        // High Score display (smaller, top right)
        game.context.fillStyle = "rgba(0, 0, 0, 0.7)";
        game.context.font = "bold 18px 'Courier New', monospace";
        game.context.textAlign = "right";
        game.context.fillText(`BEST: ${currentHighScore}`, game.board.width - 8, 32);

        game.context.fillStyle = "#4ECDC4";
        game.context.fillText(`BEST: ${currentHighScore}`, game.board.width - 10, 30);

        // Reset text alignment
        game.context.textAlign = "start";
    }

    // Enhanced game over screen
    if (game.gameOver && game.deathTimer > 60) { // Show after 1 second of death animation
        game.gameOverScreenTimer++;
        if (game.gameOverScreenTimer > 60) { // Allow restart after 1 second of game over screen
            game.canRestart = true;
        }
        drawGameOverScreen(game);
    }

    // Draw rianbald easter egg
    gameKey = game === game1 ? 'game1' : 'game2';
    if (rianbaldAnimation[gameKey].active) {
        drawRianbaldEasterEgg(game, gameKey);
    }
}

function placePipes(game) {
    if (game.gameOver) {
        return;
    }

    //(0-1) * pipeHeight/2.
    // 0 -> -128 (pipeHeight/4)
    // 1 -> -128 - 256 (pipeHeight/4 - pipeHeight/2) = -3/4 pipeHeight
    let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);

    // Use dynamic opening space based on current difficulty
    const difficulty = calculateDifficulty(game.score);
    let openingSpace = difficulty.openingSpace;

    let topPipe = {
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    game.pipeArray.push(topPipe);

    let bottomPipe = {
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    game.pipeArray.push(bottomPipe);
}

// Controller navigation functions
function updateControllerNavigation() {
    // Choose a controller to use for menu navigation. Prefer primary controller
    const gamepads = navigator.getGamepads();
    let navIndex = -1;
    if (gamepadIndex !== -1 && gamepads[gamepadIndex]) {
        navIndex = gamepadIndex;
    } else if (gamepad2Index !== -1 && gamepads[gamepad2Index]) {
        navIndex = gamepad2Index;
    } else {
        // fallback: find first connected gamepad
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) { navIndex = i; break; }
        }
    }

    if (navIndex === -1) {
        // no connected controllers available
        // console.log("No controller connected for navigation");
        return;
    }

    const gamepad = gamepads[navIndex];
    if (!gamepad) return;

    // Handle D-pad navigation (still supported)
    handleDpadNavigation(gamepad);

    // Handle left-stick (joystick) navigation for Xbox controllers
    handleStickNavigation(gamepad, navIndex);

    // Handle button presses
    handleButtonPresses(gamepad);
}

// Map left stick Y to up/down navigation with deadzone and edge detection
function handleStickNavigation(gamepad, index) {
    // Most standard controllers expose left stick vertical on axes[1]
    const yAxis = typeof gamepad.axes[1] === 'number' ? gamepad.axes[1] : 0;

    // Initialize last state for this index if needed
    if (!lastAxisStates[index]) lastAxisStates[index] = { y: 0 };

    const lastY = lastAxisStates[index].y;

    // Determine neutral vs up/down using deadzone
    const up = yAxis < -AXIS_DEADZONE;
    const down = yAxis > AXIS_DEADZONE;

    const wasUp = lastY < -AXIS_DEADZONE;
    const wasDown = lastY > AXIS_DEADZONE;

    // Trigger on edge: when transitioning from neutral to up/down (not when holding)
    if (up && !wasUp && !wasDown) {
        if (gameState === 'TITLE') {
            currentMenuIndex = Math.max(0, currentMenuIndex - 1);
            updateMenuHighlight();
        } else if (gameState === 'LEADERBOARD') {
            currentLeaderboardIndex = Math.max(0, currentLeaderboardIndex - 1);
            updateLeaderboardHighlight();
        }
        playSound(sfxWing);
    } else if (down && !wasDown && !wasUp) {
        if (gameState === 'TITLE') {
            currentMenuIndex = Math.min(menuButtons.length - 1, currentMenuIndex + 1);
            updateMenuHighlight();
        } else if (gameState === 'LEADERBOARD') {
            currentLeaderboardIndex = Math.min(leaderboardButtons.length - 1, currentLeaderboardIndex + 1);
            updateLeaderboardHighlight();
        }
        playSound(sfxWing);
    }

    // Save last axis value for edge detection
    lastAxisStates[index].y = yAxis;
}

function handleDpadNavigation(gamepad) {
    // D-pad up/down for navigation
    const dpadUp = gamepad.buttons[12] && gamepad.buttons[12].pressed;
    const dpadDown = gamepad.buttons[13] && gamepad.buttons[13].pressed;
    
    // Only trigger on press, not hold
    if (dpadUp && !lastDpadState.up) {
        if (gameState === 'TITLE') {
            currentMenuIndex = Math.max(0, currentMenuIndex - 1);
            updateMenuHighlight();
        } else if (gameState === 'LEADERBOARD') {
            currentLeaderboardIndex = Math.max(0, currentLeaderboardIndex - 1);
            updateLeaderboardHighlight();
        }
        playSound(sfxWing);
    }
    
    if (dpadDown && !lastDpadState.down) {
        if (gameState === 'TITLE') {
            currentMenuIndex = Math.min(menuButtons.length - 1, currentMenuIndex + 1);
            updateMenuHighlight();
        } else if (gameState === 'LEADERBOARD') {
            currentLeaderboardIndex = Math.min(leaderboardButtons.length - 1, currentLeaderboardIndex + 1);
            updateLeaderboardHighlight();
        }
        playSound(sfxWing);
    }
    
    // Update last states
    lastDpadState.up = dpadUp;
    lastDpadState.down = dpadDown;
}

function handleButtonPresses(gamepad) {
    const aButton = gamepad.buttons[0] && gamepad.buttons[0].pressed;
    const bButton = gamepad.buttons[1] && gamepad.buttons[1].pressed;
    const xButton = gamepad.buttons[2] && gamepad.buttons[2].pressed;
    const yButton = gamepad.buttons[3] && gamepad.buttons[3].pressed;
    
    // Debug Y button detection
    if (yButton) {
        console.log("Y button detected as pressed");
    }
    
    // A button for menu selection
    if (aButton && !lastButtonStates.a) {
        if (gameState === 'TITLE') {
            selectMenuOption();
        } else if (gameState === 'LEADERBOARD') {
            selectLeaderboardOption();
        }
    }
    
    // B button for back/return to menu (only in menus, not during gameplay)
    if (bButton && !lastButtonStates.b) {
        if (gameState === 'LEADERBOARD') {
            hideLeaderboard();
        }
        // Note: B button during gameplay is handled in checkGamepadInput() for jumping
    }
    
    // X button for return to menu during gameplay
    if (xButton && !lastButtonStates.x) {
        if (gameState === 'PLAYING') {
            returnToMenu();
        }
    }
    
    // Y button for restart game
    if (yButton && !lastButtonStates.y) {
        console.log("Y button pressed, gameState:", gameState);
        if (gameState === 'PLAYING') {
            console.log("Attempting restart...");
            handleGameRestart();
        }
    }
    
    // Update last states
    lastButtonStates.a = aButton;
    lastButtonStates.b = bButton;
    lastButtonStates.x = xButton;
    lastButtonStates.y = yButton;
}

function updateMenuHighlight() {
    // Remove highlight from all buttons
    menuButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.style.transform = 'none';
            button.style.boxShadow = '';
        }
    });
    
    // Add highlight to current button
    const currentButton = document.getElementById(menuButtons[currentMenuIndex]);
    if (currentButton) {
        currentButton.style.transform = 'translate(-2px, -2px)';
        currentButton.style.boxShadow = '6px 6px 0px #7f441a, 8px 8px 0px rgba(0, 0, 0, 0.3)';
    }
}

function selectMenuOption() {
    const selectedButton = menuButtons[currentMenuIndex];
    
    switch (selectedButton) {
        case 'single-player-btn':
            startCountdown('SINGLE');
            break;
        case 'two-player-btn':
            startCountdown('TWO_PLAYER');
            break;
        case 'ai-vs-ai-btn':
            startCountdown('AI_VS_AI');
            break;
        case 'player-vs-ai-btn':
            startCountdown('PLAYER_VS_AI');
            break;
        case 'leaderboard-btn':
            showLeaderboard();
            break;
    }
}

function selectLeaderboardOption() {
    const selectedButton = leaderboardButtons[currentLeaderboardIndex];
    
    switch (selectedButton) {
        case 'back-to-menu-btn':
            hideLeaderboard();
            break;
    }
}

function updateLeaderboardHighlight() {
    // Remove highlight from all buttons
    leaderboardButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.style.transform = 'none';
            button.style.boxShadow = '';
        }
    });
    
    // Add highlight to current button
    const currentButton = document.getElementById(leaderboardButtons[currentLeaderboardIndex]);
    if (currentButton) {
        currentButton.style.transform = 'translate(-2px, -2px)';
        currentButton.style.boxShadow = '6px 6px 0px #7f441a, 8px 8px 0px rgba(0, 0, 0, 0.3)';
    }
}

function handleGameRestart() {
    console.log("handleGameRestart called, gameMode:", gameMode);
    console.log("game1.gameOver:", game1.gameOver, "game1.canRestart:", game1.canRestart);
    console.log("game2.gameOver:", game2.gameOver, "game2.canRestart:", game2.canRestart);
    
    if (gameMode === 'SINGLE') {
        if (game1.gameOver && game1.canRestart) {
            console.log("Restarting single player game");
            resetGame(game1);
        } else {
            console.log("Cannot restart single player - conditions not met");
        }
    } else {
        if (game1.gameOver && game2.gameOver && game1.canRestart && game2.canRestart) {
            console.log("Restarting multiplayer game");
            resetGame(game1);
            resetGame(game2);
        } else {
            console.log("Cannot restart multiplayer - conditions not met");
        }
    }
}

function returnToMenu() {
    gameState = 'TITLE';

    // Clear intervals
    if (game1.pipeInterval) {
        clearInterval(game1.pipeInterval);
        game1.pipeInterval = null;
    }
    if (game2.pipeInterval) {
        clearInterval(game2.pipeInterval);
        game2.pipeInterval = null;
    }

    // Reset all global game variables to original values
    velocityX = baseVelocityX;
    gravity = 0.41;
    currentPipeInterval = basePipeInterval;
    baseOpeningSpace = boardHeight / 4;

    // Reset all random events
    randomEvents.game1 = {
        active: false,
        type: null,
        timer: 0,
        duration: 0,
        originalValues: {}
    };
    randomEvents.game2 = {
        active: false,
        type: null,
        timer: 0,
        duration: 0,
        originalValues: {}
    };

    // Show title screen and hide other screens
    document.getElementById('title-screen').style.display = 'flex';
    document.getElementById('countdown-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('board2').style.display = 'block'; // Reset for menu

    // Reset games
    resetGame(game1);
    resetGame(game2);
}

function detectCollision(a, b) {
    return a.x < b.x + b.width &&   //a's top left corner doesn't reach b's top right corner
        a.x + a.width > b.x &&   //a's top right corner passes b's top left corner
        a.y < b.y + b.height &&  //a's top left corner doesn't reach b's bottom left corner
        a.y + a.height > b.y;    //a's bottom left corner passes b's top left corner
}

function drawGameOverScreen(game) {
    // Nice dark overlay
    game.context.fillStyle = "rgba(0, 0, 0, 0.6)";
    game.context.fillRect(0, 0, game.board.width, game.board.height);

    // Update panel physics
    updateGameOverPanel(game);

    // Panel dimensions
    const panelWidth = 280;
    const panelHeight = 200;
    const panelX = game.board.width / 2 - panelWidth / 2;
    const panelY = game.gameOverPanel.y;

    // Draw the flying panel with rounded corners effect
    game.context.fillStyle = "rgba(40, 40, 40, 0.95)";
    game.context.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border
    game.context.strokeStyle = "#FFD93D";
    game.context.lineWidth = 3;
    game.context.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Inner shadow effect
    game.context.strokeStyle = "rgba(0, 0, 0, 0.3)";
    game.context.lineWidth = 1;
    game.context.strokeRect(panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4);

    game.context.textAlign = "center";

    // Stylish "GAME OVER" text with shadow
    const textY = panelY + 50;
    game.context.fillStyle = "#000";
    game.context.font = "bold 32px 'Courier New', monospace";
    game.context.fillText("GAME OVER", game.board.width / 2 + 2, textY + 2);

    game.context.fillStyle = "#8B0000";
    game.context.fillText("GAME OVER", game.board.width / 2 + 1, textY + 1);

    game.context.fillStyle = "#FF6B6B";
    game.context.fillText("GAME OVER", game.board.width / 2, textY);

    // Score display
    const scoreY = panelY + 90;
    const currentScore = Math.floor(game.score);
    const isNewHighScore = currentScore > highScores[gameMode];

    // Check and update high score
    if (game.gameOverScreenTimer === 61) { // Only check once when screen first appears
        updateHighScore(currentScore);
    }

    game.context.fillStyle = "rgba(255, 217, 61, 0.2)";
    game.context.fillRect(game.board.width / 2 - 90, scoreY - 20, 180, 50);

    game.context.strokeStyle = "#FFD93D";
    game.context.lineWidth = 1;
    game.context.strokeRect(game.board.width / 2 - 90, scoreY - 20, 180, 50);

    // Current Score
    game.context.fillStyle = "#333";
    game.context.font = "bold 16px 'Courier New', monospace";
    game.context.fillText(`SCORE: ${currentScore}`, game.board.width / 2 + 1, scoreY + 1);

    game.context.fillStyle = isNewHighScore ? "#FF6B6B" : "#FFD93D";
    game.context.fillText(`SCORE: ${currentScore}`, game.board.width / 2, scoreY);

    // High Score
    game.context.fillStyle = "#333";
    game.context.font = "bold 14px 'Courier New', monospace";
    game.context.fillText(`BEST: ${highScores[gameMode]}`, game.board.width / 2 + 1, scoreY + 21);

    game.context.fillStyle = "#4ECDC4";
    game.context.fillText(`BEST: ${highScores[gameMode]}`, game.board.width / 2, scoreY + 20);

    // New high score indicator
    if (isNewHighScore && game.gameOverScreenTimer % 30 < 15) {
        game.context.fillStyle = "#FF6B6B";
        game.context.font = "bold 12px 'Courier New', monospace";
        game.context.fillText("NEW HIGH SCORE!", game.board.width / 2, scoreY - 30);
    }

    // Instructions
    const instructY = panelY + 160;
    const instructY2 = panelY + 180;

    if (gameMode === 'SINGLE') {
        if (game1.gameOver && game1.canRestart) {
            game.context.fillStyle = "#4ECDC4";
            game.context.font = "bold 16px 'Courier New', monospace";
            game.context.fillText("Press Y to restart", game.board.width / 2, instructY);
        }
    } else {
        const bothDead = game1.gameOver && game2.gameOver;
        const bothReady = game1.canRestart && game2.canRestart;

        if (bothDead && bothReady) {
            game.context.fillStyle = "#4ECDC4";
            game.context.font = "bold 16px 'Courier New', monospace";
            game.context.fillText("Press Y to restart both", game.board.width / 2, instructY);
        } else if (game.gameOver) {
            game.context.fillStyle = "#FFA500";
            game.context.font = "14px 'Courier New', monospace";
            game.context.fillText("Waiting for other player...", game.board.width / 2, instructY);
        }
    }

    // X to menu instruction
    game.context.fillStyle = "#888";
    game.context.font = "12px 'Courier New', monospace";
    game.context.fillText("Press X for menu", game.board.width / 2, instructY2);

    game.context.textAlign = "start";
}

function updateGameOverPanel(game) {
    if (!game.gameOverPanel.settled) {
        // Spring physics with damping
        const spring = 0.3;
        const damping = 0.7;

        // Calculate force towards target
        const force = (game.gameOverPanel.targetY - game.gameOverPanel.y) * spring;
        game.gameOverPanel.velocity += force;
        game.gameOverPanel.velocity *= damping;

        // Update position
        game.gameOverPanel.y += game.gameOverPanel.velocity;

        // Check if settled (close enough and slow enough)
        if (Math.abs(game.gameOverPanel.y - game.gameOverPanel.targetY) < 2 &&
            Math.abs(game.gameOverPanel.velocity) < 0.5) {
            game.gameOverPanel.settled = true;
            game.gameOverPanel.y = game.gameOverPanel.targetY;
            game.gameOverPanel.velocity = 0;
        }
    }
}

function resetGame(game) {
    game.bird.y = birdY;
    game.bird.x = birdX;
    game.pipeArray = [];
    game.score = 0;
    game.gameOver = false;
    game.deathAnimation = false;
    game.deathTimer = 0;
    game.velocityY = 0;
    game.hasBounced = false;
    game.gameOverScreenTimer = 0;
    game.canRestart = false;
    game.lastDifficultyUpdate = 0;

    // Reset background positions
    backgroundX1 = 0;
    if (backgroundImg && backgroundImg.complete) {
        backgroundX2 = backgroundImg.width;
    }

    // Reset animation states
    game.animationFrame = 0;
    game.animationTimer = 0;
    game.flapAnimation = 0;
    game.isFlapping = false;

    // Reset AI states
    game.aiLastDecision = 0;

    // Reset difficulty settings
    velocityX = baseVelocityX;
    gravity = 0.41; // Reset gravity to original value
    currentPipeInterval = basePipeInterval; // Reset pipe interval
    baseOpeningSpace = boardHeight / 4; // Reset opening space

    // Reset pipe interval
    if (game.pipeInterval) {
        clearInterval(game.pipeInterval);
        game.pipeInterval = setInterval(() => placePipes(game), basePipeInterval);
    }

    // Reset panel position
    game.gameOverPanel.y = boardHeight;
    game.gameOverPanel.velocity = 0;
    game.gameOverPanel.settled = false;

    // Reset rianbald easter egg
    gameKey = game === game1 ? 'game1' : 'game2';
    rianbaldTrigger[gameKey] = false;
    rianbaldAnimation[gameKey] = { active: false, timer: 0, y: 0, targetY: 0 };
    
    // Reset random events
    randomEvents[gameKey] = {
        active: false,
        type: null,
        timer: 0,
        duration: 0,
        originalValues: {}
    };
}

function playSound(audio) {
    if (audio) {
        // Reset audio to beginning and play
        audio.currentTime = 0;
        audio.play().catch(e => {
            // Handle autoplay restrictions gracefully
            console.log("Audio play failed:", e);
        });
    }
}

// ADVANCED AI - Handles close gaps and height differences intelligently
function updateAI(game) {
    let birdCenter = game.bird.y + game.bird.height / 2;
    let nextGap = findNextPipeGap(game);

    if (nextGap) {
        let gapMiddle = nextGap.top + (nextGap.bottom - nextGap.top) / 2;

        // Simple but effective: jump if bird center is below gap middle
        if (birdCenter > gapMiddle) {
            executeJump(game);
        }
    } else {
        // No pipes visible - stay at screen center
        let screenCenter = boardHeight / 2;
        if (birdCenter > screenCenter) {
            executeJump(game);
        }
    }
}

// Helper function to find the next pipe gap
function findNextPipeGap(game) {
    let closestDistance = Infinity;
    let nextGap = null;

    // Group pipes by x position to find pairs
    let pipeGroups = {};

    for (let pipe of game.pipeArray) {
        // Only consider pipes that are ahead of the bird
        if (pipe.x + pipe.width > game.bird.x) {
            if (!pipeGroups[pipe.x]) {
                pipeGroups[pipe.x] = [];
            }
            pipeGroups[pipe.x].push(pipe);
        }
    }

    // Find the closest pipe pair
    for (let x in pipeGroups) {
        let distance = parseInt(x) - game.bird.x;
        if (distance < closestDistance && pipeGroups[x].length === 2) {
            closestDistance = distance;

            // Determine top and bottom of gap
            let pipes = pipeGroups[x];
            let topPipe = pipes[0].y < pipes[1].y ? pipes[0] : pipes[1];
            let bottomPipe = pipes[0].y > pipes[1].y ? pipes[0] : pipes[1];

            nextGap = {
                x: parseInt(x),
                top: topPipe.y + topPipe.height,
                bottom: bottomPipe.y,
                distance: distance
            };
        }
    }

    return nextGap;
}



// Execute perfect jump with no delays
function executeJump(game) {
    // No cooldown needed - perfect timing
    game.velocityY = -6;
    game.isFlapping = true;
    game.flapAnimation = 0;
    playSound(sfxWing);
}

// Console command to toggle AI
function toggleAI(player = 'both') {
    if (player === 'both' || player === 1) {
        aiEnabled.game1 = !aiEnabled.game1;
        console.log(`AI for Player 1 (left): ${aiEnabled.game1 ? 'ENABLED' : 'DISABLED'}`);
    }

    if (player === 'both' || player === 2) {
        aiEnabled.game2 = !aiEnabled.game2;
        console.log(`AI for Player 2 (right): ${aiEnabled.game2 ? 'ENABLED' : 'DISABLED'}`);
    }

    if (player !== 1 && player !== 2 && player !== 'both') {
        console.log('Usage: toggleAI() or toggleAI(1) or toggleAI(2)');
        console.log('Current status:');
        console.log(`Player 1 AI: ${aiEnabled.game1 ? 'ENABLED' : 'DISABLED'}`);
        console.log(`Player 2 AI: ${aiEnabled.game2 ? 'ENABLED' : 'DISABLED'}`);
    }
}

// Make toggleAI available globally
window.toggleAI = toggleAI;

// Rianbald Easter Egg Functions
function triggerRianbaldEasterEgg(game, triggerPipe) {
    gameKey = game === game1 ? 'game1' : 'game2';

    // Simple popup in center of screen
    rianbaldAnimation[gameKey].active = true;
    rianbaldAnimation[gameKey].timer = 0;
    rianbaldAnimation[gameKey].x = boardWidth * 0.75; // 75% to the right
    rianbaldAnimation[gameKey].y = boardHeight / 2; // Center vertically

    console.log("rian triggered at score:", Math.floor(game.score));
}

function drawRianbaldEasterEgg(game, gameKey) {
    let anim = rianbaldAnimation[gameKey];
    anim.timer++;

    // Show for 2 seconds (120 frames at 60fps)
    if (anim.timer > 120) {
        anim.active = false;
        return;
    }

    // Draw rianbald image
    if (rianbaldImg && rianbaldImg.complete) {
        let imgWidth = 50;
        let imgHeight = 50;

        // Simple shake effect
        let shakeX = (Math.random() - 0.5) * 4;
        let shakeY = (Math.random() - 0.5) * 4;

        let x = anim.x - imgWidth / 2 + shakeX;
        let y = anim.y - imgHeight / 2 + shakeY;

        game.context.drawImage(rianbaldImg, x, y, imgWidth, imgHeight);
    }
}

// Random Events System Functions
function checkRandomEvent(game, gameKey) {
    // Don't trigger new events if one is already active
    if (randomEvents[gameKey].active) return;
    
    // Don't trigger events too early in the game
    if (game.score < 2) return;
    
    // Calculate probability based on score (higher score = higher chance)
    const baseProbability = 0.05; // 5% base chance
    const scoreBonus = Math.min(game.score * 0.01, 0.15); // Up to 15% bonus
    const totalProbability = baseProbability + scoreBonus;
    
    if (Math.random() < totalProbability) {
        triggerRandomEvent(game, gameKey);
    }
}

function triggerRandomEvent(game, gameKey) {
    // Select random event based on probabilities
    const events = Object.keys(EVENT_TYPES);
    const totalProbability = events.reduce((sum, event) => sum + EVENT_TYPES[event].probability, 0);
    
    let random = Math.random() * totalProbability;
    let selectedEvent = null;
    
    for (let event of events) {
        random -= EVENT_TYPES[event].probability;
        if (random <= 0) {
            selectedEvent = event;
            break;
        }
    }
    
    if (selectedEvent) {
        activateRandomEvent(game, gameKey, selectedEvent);
    }
}

function activateRandomEvent(game, gameKey, eventType) {
    const event = EVENT_TYPES[eventType];
    const eventData = randomEvents[gameKey];
    
    eventData.active = true;
    eventData.type = eventType;
    eventData.timer = 0;
    eventData.duration = event.duration;
    
    // Store original values for restoration
    eventData.originalValues = {
        velocityX: velocityX,
        gravity: gravity,
        pipeInterval: currentPipeInterval
    };
    
    // Apply event effects
    applyEventEffect(game, gameKey, eventType);
    
    console.log(`Random Event: ${event.name} activated for ${gameKey}!`);
}

function applyEventEffect(game, gameKey, eventType) {
    switch (eventType) {
        case 'BONUS_ROUND':
            // Wider pipes - increase opening space
            baseOpeningSpace = boardHeight / 3; // Increased from /4
            break;
            
        case 'SPEED_BOOST':
            // Faster pipes
            velocityX = baseVelocityX * 1.8; //1.8
            break;
            
        case 'GRAVITY_SHIFT':
            // Reduced gravity
            gravity = 0.25; // Reduced from 0.41
            break;
            
        case 'SCORE_MULTIPLIER':
            // Score multiplier handled in scoring logic
            break;
            
        case 'SHIELD_MODE':
            // Shield mode handled in collision detection
            break;
            
        case 'BOSS_FIGHT':
            // Special pipe pattern - faster and more frequent
            velocityX = baseVelocityX * 1.5;
            currentPipeInterval = basePipeInterval * 0.7;
            break;
    }
}

function updateRandomEvent(game, gameKey) {
    const eventData = randomEvents[gameKey];
    
    if (eventData.active) {
        eventData.timer++;
        
        // Check if event should end
        if (eventData.timer >= eventData.duration) {
            endRandomEvent(game, gameKey);
        }
        
        // Draw event indicator
        drawEventIndicator(game, gameKey);
    }
}

function endRandomEvent(game, gameKey) {
    const eventData = randomEvents[gameKey];
    const event = EVENT_TYPES[eventData.type];
    
    // Restore original values
    velocityX = eventData.originalValues.velocityX;
    gravity = eventData.originalValues.gravity;
    currentPipeInterval = eventData.originalValues.pipeInterval;
    baseOpeningSpace = boardHeight / 4; // Reset to normal
    
    // Reset event data
    eventData.active = false;
    eventData.type = null;
    eventData.timer = 0;
    eventData.duration = 0;
    eventData.originalValues = {};
    
    console.log(`Random Event: ${event.name} ended for ${gameKey}!`);
}

function drawEventIndicator(game, gameKey) {
    const eventData = randomEvents[gameKey];
    const event = EVENT_TYPES[eventData.type];
    
    if (!eventData.active) return;
    
    // Calculate remaining time
    const remainingTime = Math.ceil((eventData.duration - eventData.timer) / 60);
    
    // Draw event banner at top of screen
    const bannerHeight = 40;
    const bannerY = 0;
    
    // Banner background with event color
    game.context.fillStyle = event.color;
    game.context.fillRect(0, bannerY, game.board.width, bannerHeight);
    
    // Banner border
    game.context.strokeStyle = "#000";
    game.context.lineWidth = 2;
    game.context.strokeRect(0, bannerY, game.board.width, bannerHeight);
    
    // Event name
    game.context.fillStyle = "#FFF";
    game.context.font = "bold 16px 'Courier New', monospace";
    game.context.textAlign = "center";
    game.context.fillText(event.name, game.board.width / 2, bannerY + 20);
    
    // Timer
    game.context.font = "bold 14px 'Courier New', monospace";
    game.context.fillText(`${remainingTime}s`, game.board.width / 2, bannerY + 35);
    
    // Reset text alignment
    game.context.textAlign = "start";
}

// Enhanced collision detection for shield mode
function detectCollisionWithShield(a, b, game, gameKey) {
    const eventData = randomEvents[gameKey];
    
    // If shield mode is active, no collision
    if (eventData.active && eventData.type === 'SHIELD_MODE') {
        return false;
    }
    
    // Normal collision detection
    return detectCollision(a, b);
}

// Gamepad handling functions
function handleGamepadConnected(event) {
    console.log("Gamepad connected:", event.gamepad.id);
    console.log("Gamepad index:", event.gamepad.index);
    console.log("Gamepad buttons:", event.gamepad.buttons.length);
    
    // Assign first controller to gamepad, second to gamepad2
    if (!gamepadConnected) {
        gamepadConnected = true;
        gamepadIndex = event.gamepad.index;
        console.log("Controller 1 assigned to Player 1, index:", gamepadIndex);
    } else if (!gamepad2Connected) {
        gamepad2Connected = true;
        gamepad2Index = event.gamepad.index;
        console.log("Controller 2 assigned to Player 2, index:", gamepad2Index);
    }
}

function handleGamepadDisconnected(event) {
    console.log("Gamepad disconnected:", event.gamepad.id);
    
    // Check which controller was disconnected
    if (event.gamepad.index === gamepadIndex) {
        gamepadConnected = false;
        gamepadIndex = -1;
        console.log("Controller 1 disconnected");
    } else if (event.gamepad.index === gamepad2Index) {
        gamepad2Connected = false;
        gamepad2Index = -1;
        console.log("Controller 2 disconnected");
    }
}

function checkGamepadInput() {
    const gamepads = navigator.getGamepads();
    
    // Check Controller 1 (Player 1 - game1/board1)
    if (gamepadConnected && gamepadIndex !== -1) {
        const gamepad = gamepads[gamepadIndex];
        if (gamepad && gamepad.buttons[1] && gamepad.buttons[1].pressed) {
            // Only trigger jump if game is playing and game1 is not over
            if (gameState === 'PLAYING' && !game1.gameOver) {
                // Trigger jump for game1 (left side)
                game1.velocityY = -6;
                game1.isFlapping = true;
                game1.flapAnimation = 0;
                playSound(sfxWing);
            }
        }
    }
    
    // Check Controller 2 (Player 2 - game2/board2)
    if (gamepad2Connected && gamepad2Index !== -1) {
        const gamepad2 = gamepads[gamepad2Index];
        if (gamepad2 && gamepad2.buttons[1] && gamepad2.buttons[1].pressed) {
            // Only trigger jump if game is playing and game2 is not over
            if (gameState === 'PLAYING' && !game2.gameOver && gameMode !== 'SINGLE') {
                // Trigger jump for game2 (right side)
                game2.velocityY = -6;
                game2.isFlapping = true;
                game2.flapAnimation = 0;
                playSound(sfxWing);
            }
        }
    }
}

