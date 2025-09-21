
//board - responsive sizing
let boardWidth = 360;
let boardHeight = 640;
let canvasScale = 1;

//bird
let birdWidth = 34; //width/height ratio = 408/228 = 17/12
let birdHeight = 24;
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

//pipes
let pipeWidth = 64; //width/height ratio = 384/3072 = 1/8
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let baseVelocityX = -2; //base pipes moving left speed
let velocityX = -2; //current pipes moving left speed
let gravity = 0.41;
let bounceVelocity = -7; //bounce when hitting ground

//difficulty settings
let basePipeInterval = 1500; //base pipe spawn interval in ms
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
    aiReactionTime: 0,
    aiMistakeChance: 0.02,
    aiLastDecision: 0,
    aiPanicMode: false
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
    aiReactionTime: 0,
    aiMistakeChance: 0.02,
    aiLastDecision: 0,
    aiPanicMode: false
};

window.onload = function () {
    setupResponsiveCanvas();

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

    birdImg.onload = function () {
        // Use first animation frame for initial draw if available, otherwise use original
        const initialFrame = birdAnimFrames[0] || birdImg;
        game1.context.drawImage(initialFrame, game1.bird.x, game1.bird.y, game1.bird.width, game1.bird.height);
        game2.context.drawImage(initialFrame, game2.bird.x, game2.bird.y, game2.bird.width, game2.bird.height);
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

    requestAnimationFrame(update);

    // Dynamic pipe intervals that will be updated based on difficulty
    let pipeInterval1 = setInterval(() => placePipes(game1), currentPipeInterval);
    let pipeInterval2 = setInterval(() => placePipes(game2), currentPipeInterval);

    // Store intervals for later clearing and recreation
    game1.pipeInterval = pipeInterval1;
    game2.pipeInterval = pipeInterval2;

    document.addEventListener("keydown", moveBird);
    window.addEventListener("resize", setupResponsiveCanvas);
}

function setupResponsiveCanvas() {
    const container = document.getElementById("game-container");
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    // Calculate scale to fit both canvases side by side
    const totalWidth = boardWidth * 2 + 20; // 20px gap between canvas
    const scaleX = containerWidth / totalWidth;
    const scaleY = containerHeight / boardHeight;
    canvasScale = Math.min(scaleX, scaleY, 1); //scale limitation

    //scaling to the container we are in
    container.style.transform = `scale(${canvasScale})`;
    container.style.transformOrigin = 'center center';
}

function calculateDifficulty(score) {
    // Square root function for progressive difficulty
    // Starts at 1.0 and increases gradually
    const difficultyMultiplier = 1 + Math.sqrt(score) * 0.1;

    // Calculate new pipe speed (faster as score increases)
    const newVelocityX = baseVelocityX * difficultyMultiplier;

    // Calculate new pipe interval (more frequent pipes, but not too crazy)
    const newPipeInterval = Math.max(basePipeInterval / (1 + Math.sqrt(score) * 0.05), 800);

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

    game.context.drawImage(currentFrame, game.bird.x, game.bird.y, game.bird.width, game.bird.height);
}

function update() {
    requestAnimationFrame(update);
    updateGame(game1);
    updateGame(game2);
}

function updateGame(game) {
    game.context.clearRect(0, 0, game.board.width, game.board.height);

    // AI decision making
    const gameKey = game === game1 ? 'game1' : 'game2';
    if (aiEnabled[gameKey] && !game.gameOver) {
        updateAI(game);
    }

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
            game.score += 0.5; //0.5 because there are 2 pipes! so 0.5*2 = 1, 1 for each set of pipes
            pipe.passed = true;

            // Play point sound when score increases by a full point (every 2 pipes)
            if (Math.floor(game.score) > Math.floor(game.score - 0.5)) {
                playSound(sfxPoint);
            }

            // Update difficulty when score changes
            updateDifficulty(game);
        }

        if (detectCollision(game.bird, pipe) && !game.gameOver) {
            game.gameOver = true;
            playSound(sfxHit);
            playSound(sfxDie);
        }
    }

    //clear pipes
    while (game.pipeArray.length > 0 && game.pipeArray[0].x < -pipeWidth) {
        game.pipeArray.shift(); //removes first element from the array
    }

    //score - nice styling without box
    if (!game.gameOver || game.deathTimer <= 60) {
        // Score shadow
        game.context.fillStyle = "rgba(0, 0, 0, 0.7)";
        game.context.font = "bold 32px 'Courier New', monospace";
        game.context.fillText(Math.floor(game.score), 12, 42);

        // Main score text
        game.context.fillStyle = "#FFD93D";
        game.context.fillText(Math.floor(game.score), 10, 40);
    }

    // Enhanced game over screen
    if (game.gameOver && game.deathTimer > 60) { // Show after 1 second of death animation
        game.gameOverScreenTimer++;
        if (game.gameOverScreenTimer > 60) { // Allow restart after 1 second of game over screen
            game.canRestart = true;
        }
        drawGameOverScreen(game);
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

function moveBird(e) {
    // Player 1 controls (left side) - W key for jump, R key for restart
    if (e.code == "KeyW") {
        if (!game1.gameOver) {
            //jump
            game1.velocityY = -6;
            // Trigger flap animation
            game1.isFlapping = true;
            game1.flapAnimation = 0;
            playSound(sfxWing);
        }
    }

    // Player 2 controls (right side) - I key for jump
    if (e.code == "KeyI") {
        if (!game2.gameOver) {
            //jump
            game2.velocityY = -6;
            // Trigger flap animation
            game2.isFlapping = true;
            game2.flapAnimation = 0;
            playSound(sfxWing);
        }
    }

    // R key restarts both games when both players are dead and ready
    if (e.code == "KeyR") {
        if (game1.gameOver && game2.gameOver && game1.canRestart && game2.canRestart) {
            resetGame(game1);
            resetGame(game2);
        }
    }
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
    const scoreY = panelY + 100;
    game.context.fillStyle = "rgba(255, 217, 61, 0.2)";
    game.context.fillRect(game.board.width / 2 - 70, scoreY - 20, 140, 30);

    game.context.strokeStyle = "#FFD93D";
    game.context.lineWidth = 1;
    game.context.strokeRect(game.board.width / 2 - 70, scoreY - 20, 140, 30);

    // Score text
    game.context.fillStyle = "#333";
    game.context.font = "bold 20px 'Courier New', monospace";
    game.context.fillText(`SCORE: ${Math.floor(game.score)}`, game.board.width / 2 + 1, scoreY + 1);

    game.context.fillStyle = "#FFD93D";
    game.context.fillText(`SCORE: ${Math.floor(game.score)}`, game.board.width / 2, scoreY);

    // Instructions
    const instructY = panelY + 150;
    const bothDead = game1.gameOver && game2.gameOver;
    const bothReady = game1.canRestart && game2.canRestart;

    if (bothDead && bothReady) {
        game.context.fillStyle = "#4ECDC4";
        game.context.font = "bold 16px 'Courier New', monospace";
        game.context.fillText("Press R to restart both", game.board.width / 2, instructY);
    } else if (game.gameOver) {
        game.context.fillStyle = "#FFA500";
        game.context.font = "14px 'Courier New', monospace";
        game.context.fillText("Waiting for other player...", game.board.width / 2, instructY);
    }

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

    // Reset animation states
    game.animationFrame = 0;
    game.animationTimer = 0;
    game.flapAnimation = 0;
    game.isFlapping = false;

    // Reset AI states
    game.aiReactionTime = 0;
    game.aiMistakeChance = 0.02;
    game.aiLastDecision = 0;
    game.aiPanicMode = false;

    // Reset difficulty settings
    velocityX = baseVelocityX;

    // Reset pipe interval
    if (game.pipeInterval) {
        clearInterval(game.pipeInterval);
        game.pipeInterval = setInterval(() => placePipes(game), basePipeInterval);
    }

    // Reset panel position
    game.gameOverPanel.y = boardHeight;
    game.gameOverPanel.velocity = 0;
    game.gameOverPanel.settled = false;
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

// AI Logic - simulates human-like play with mistakes
function updateAI(game) {
    // Increase reaction time counter
    game.aiReactionTime++;
    
    // Find the next pipe that the bird needs to navigate
    let nextPipe = null;
    let minDistance = Infinity;
    
    for (let pipe of game.pipeArray) {
        if (pipe.x + pipe.width > game.bird.x && pipe.x < game.bird.x + 200) {
            let distance = pipe.x - game.bird.x;
            if (distance < minDistance) {
                minDistance = distance;
                nextPipe = pipe;
            }
        }
    }
    
    if (nextPipe) {
        // Calculate the gap center between top and bottom pipes
        let topPipe = nextPipe;
        let bottomPipe = null;
        
        // Find the corresponding bottom pipe
        for (let pipe of game.pipeArray) {
            if (pipe.x === nextPipe.x && pipe.y > nextPipe.y) {
                bottomPipe = pipe;
                break;
            }
        }
        
        if (bottomPipe) {
            let gapCenter = topPipe.y + topPipe.height + (bottomPipe.y - (topPipe.y + topPipe.height)) / 2;
            let birdCenter = game.bird.y + game.bird.height / 2;
            
            // AI decision making with human-like imperfections
            let shouldJump = false;
            
            // Basic logic: jump if bird is below gap center
            if (birdCenter > gapCenter + 10) { // 10px tolerance
                shouldJump = true;
            }
            
            // Panic mode when close to pipes
            if (minDistance < 80) {
                game.aiPanicMode = true;
                // In panic mode, make more erratic decisions
                if (Math.random() < 0.3) {
                    shouldJump = !shouldJump; // Sometimes panic and do opposite
                }
            } else {
                game.aiPanicMode = false;
            }
            
            // Add human-like reaction delay (3-8 frames)
            let reactionDelay = 3 + Math.random() * 5;
            
            // Make mistakes occasionally
            if (Math.random() < game.aiMistakeChance) {
                shouldJump = !shouldJump; // Make wrong decision
                console.log("AI made a mistake!");
            }
            
            // Increase mistake chance as score gets higher (pressure)
            game.aiMistakeChance = 0.02 + (game.score * 0.001);
            
            // Only make decision if enough time has passed since last decision
            if (shouldJump && game.aiReactionTime > reactionDelay && 
                Date.now() - game.aiLastDecision > 100) { // Minimum 100ms between jumps
                
                // Execute jump
                game.velocityY = -6;
                game.isFlapping = true;
                game.flapAnimation = 0;
                playSound(sfxWing);
                
                game.aiLastDecision = Date.now();
                game.aiReactionTime = 0;
            }
        }
    }
    
    // Emergency jump if bird is falling too fast near ground
    if (game.bird.y > boardHeight - 150 && game.velocityY > 3) {
        if (Math.random() < 0.8) { // 80% chance to save itself
            game.velocityY = -6;
            game.isFlapping = true;
            game.flapAnimation = 0;
            playSound(sfxWing);
            game.aiLastDecision = Date.now();
        }
    }
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