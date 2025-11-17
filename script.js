let ordiChoices = ['Pierre', 'Papier', 'Ciseaux'];
let ordiScore = 0;
let playerScore = 0;
let playerChoice = '';
let isOnlineMode = false;
const WINNING_SCORE = 5;

// Éléments du DOM (RÉCUPÉRATION CORRIGÉE)
const modeSelector = document.getElementById('mode-selector');
const gameArea = document.getElementById('game-area');
// ✅ S'assure que ces ID existent dans l'HTML
const scoreDisplay1 = document.getElementById('scoreDisplay1'); 
const scoreDisplay2 = document.getElementById('scoreDisplay2');
const result = document.getElementById('result');
const rock = document.getElementById('rock');
const paper = document.getElementById('paper');
const scissors = document.getElementById('scissors');
const choices = document.getElementById('choices');
const guide = document.querySelector('.guide');
const statusMessage = document.getElementById('status-message');
const modeOfflineBtn = document.getElementById('mode-offline');
const modeOnlineBtn = document.getElementById('mode-online');

// --- Socket.IO setup (initialisation tardive) ---
let socket;

// --- Fonctions utilitaires ---

function getEmoji(choice) {
    switch (choice) {
        case 'Pierre': return '👊';
        case 'Papier': return '✋';
        case 'Ciseaux': return '✌️';
        default: return '';
    }
}

// Fonction corrigée et robuste pour l'affichage des scores
function updateScoreDisplay(s1, s2, label1, label2) {
    // Vérification ajoutée pour éviter les erreurs si les éléments sont null
    if (scoreDisplay1) {
        scoreDisplay1.innerHTML = `${label1}: ${s1}`;
    }
    if (scoreDisplay2) {
        scoreDisplay2.innerHTML = `${label2}: ${s2}`;
    }
}

function setChoiceButtonsEnabled(enabled) {
    rock.disabled = !enabled;
    paper.disabled = !enabled;
    scissors.disabled = !enabled;
    rock.style.opacity = paper.style.opacity = scissors.style.opacity = enabled ? 1 : 0.5;
}

function showResult(winOrLoss, choice1, choice2, isGameOver = false) {
    // choice1 est l'Adversaire (Ordi ou Joueur 2)
    // choice2 est le Joueur Local
    const emoji1 = getEmoji(choice1);
    const emoji2 = getEmoji(choice2);
    let classType = 'draw';
    let message = 'Match Nul';
    let nextButtonText = 'Continuer';

    if (winOrLoss === 'win' || winOrLoss === 'playerWin') {
        classType = 'win';
        message = 'Vous gagnez la manche !';
    } else if (winOrLoss === 'lose' || winOrLoss === 'opponentWin') {
        classType = 'lose';
        message = 'Vous perdez la manche !';
    }
    
    if (isGameOver) {
        message = (winOrLoss === 'win' || winOrLoss === 'playerWin') ? 
                  `VOUS AVEZ GAGNÉ LA PARTIE ! (${WINNING_SCORE} points)` : 
                  `L'ADVERSAIRE GAGNE LA PARTIE ! (${WINNING_SCORE} points)`;
        nextButtonText = 'Nouvelle Partie';
    }

    // Affichage : Choix de l'adversaire (gauche) vs Votre choix (droite)
    result.innerHTML = `<div class="${classType}">${message}</div>
                        <div class="emoji">
                          <div>${emoji1}</div>
                          <div>${emoji2}</div>
                        </div>
                        <button id="next">${nextButtonText}</button>`;
    
    guide.style.display = 'none';
    statusMessage.style.display = 'none';
    choices.style.display = 'none';
    result.style.display = 'block';
    setChoiceButtonsEnabled(false);
}

function checkGameOver(myScore, opponentScore, choice1, choice2) {
    if (myScore >= WINNING_SCORE || opponentScore >= WINNING_SCORE) {
        const isPlayerWinner = myScore > opponentScore;
        const finalResult = isPlayerWinner ? 'win' : 'lose'; 
        
        // Afficher le résultat final
        showResult(finalResult, choice1, choice2, true);
        return true;
    }
    return false;
}

function resetGameArea() {
    result.style.display = 'none';
    choices.style.display = 'flex'; // Rétablir le flex pour aligner les boutons de choix
    guide.style.display = 'block';
    statusMessage.style.display = 'none';
    setChoiceButtonsEnabled(true);
}

// --- Logique du Mode Offline (Contre l'ordinateur) ---

function randomNumber() {
    return Math.floor(Math.random() * 3);
}

function verifyOffline() {
    const ordiChoice = ordiChoices[randomNumber()];
    const pChoice = playerChoice;
    let winOrLoss = 'draw';
    
    if (ordiChoice !== pChoice) {
        if (
            (ordiChoice === 'Pierre' && pChoice === 'Ciseaux') ||
            (ordiChoice === 'Papier' && pChoice === 'Pierre') ||
            (ordiChoice === 'Ciseaux' && pChoice === 'Papier')
        ) {
            ordiScore += 1;
            winOrLoss = 'lose';
        } else {
            playerScore += 1;
            winOrLoss = 'win';
        }
    }
    
    // Affichage des scores: scoreDisplay1 = Ordi, scoreDisplay2 = Moi
    updateScoreDisplay(ordiScore, playerScore, 'Ordinateur', 'Moi');
    
    // Vérification Game Over
    if (!checkGameOver(playerScore, ordiScore, ordiChoice, pChoice)) {
        // Affichage des choix: (Adversaire/Ordi, Moi)
        showResult(winOrLoss, ordiChoice, pChoice); 
    }
}

// --- Logique du Mode Online (Multijoueur) ---

function initializeOnlineMode() {
    isOnlineMode = true;
    updateScoreDisplay(0, 0, 'Votre Score', 'Adversaire'); // Initialisation des labels
    guide.innerHTML = 'Connexion au serveur...';
    statusMessage.innerHTML = 'En attente d\'un adversaire...';
    statusMessage.style.display = 'block';
    setChoiceButtonsEnabled(false);
    
    // Si socket est déjà initialisé, on ne le refait pas
    if (typeof io !== 'undefined') {
       socket = io('https://mon-ppc-server.onrender.com');
    } else {
        console.error("Socket.IO n'est pas chargé. Assurez-vous que le script Socket.IO est inclus dans votre HTML.");
        return;
    }
    
    socket.on('connect', () => {
        guide.innerHTML = 'Connecté !';
    });
    
    socket.on('waitingForOpponent', () => {
        statusMessage.style.display = 'block';
        statusMessage.innerHTML = 'En attente d\'un adversaire...';
        guide.innerHTML = 'Connecté !';
        setChoiceButtonsEnabled(false);
    });
    
    socket.on('startMatch', (data) => {
        guide.innerHTML = 'Faites votre choix !';
        statusMessage.style.display = 'none';
        setChoiceButtonsEnabled(true);
        // Réinitialisation des scores
        updateScoreDisplay(0, 0, 'Votre Score', 'Adversaire'); 
    });
    
    socket.on('waitingForOpponentChoice', () => {
        guide.innerHTML = 'Votre choix est fait. En attente de l\'adversaire...';
        setChoiceButtonsEnabled(false);
    });
    
    socket.on('roundResult', (data) => {
        // data contient : { myScore, opponentScore, myChoice, opponentChoice, result, isGameOver }
        
        // Affichage des scores: scoreDisplay1 = Moi, scoreDisplay2 = Adversaire
        updateScoreDisplay(data.myScore, data.opponentScore, 'Votre Score', 'Adversaire');
        
        // Affichage des choix: (Adversaire, Moi)
        if (data.isGameOver) {
            showResult(data.result, data.opponentChoice, data.myChoice, true);
        } else {
            showResult(data.result, data.opponentChoice, data.myChoice);
        }
    });

    socket.on('opponentLeft', () => {
        guide.innerHTML = 'L\'adversaire s\'est déconnecté. En attente d\'un nouveau joueur...';
        statusMessage.style.display = 'block';
        statusMessage.innerHTML = ''; 
        setChoiceButtonsEnabled(false);
        result.style.display = 'none';
        updateScoreDisplay(0, 0, 'Votre Score', 'Adversaire');
    });
}

function verifyOnline() {
    socket.emit('playerChoice', playerChoice);
    guide.innerHTML = 'Votre choix est fait. En attente de l\'adversaire...';
    setChoiceButtonsEnabled(false);
}

// --- Gestion des événements de click ---

// 1. Sélection du mode
modeOfflineBtn.onclick = () => {
    isOnlineMode = false;
    ordiScore = 0;
    playerScore = 0;
    modeSelector.style.display = 'none';
    gameArea.style.display = 'flex';
    updateScoreDisplay(ordiScore, playerScore, 'Ordinateur', 'Moi');
    guide.innerHTML = `Premier à ${WINNING_SCORE} points gagne ! Faites votre choix.`;
    setChoiceButtonsEnabled(true);
};

modeOnlineBtn.onclick = () => {
    modeSelector.style.display = 'none';
    gameArea.style.display = 'flex';
    initializeOnlineMode();
};


// 2. Choix du joueur
rock.onclick = () => { playerChoice = 'Pierre'; isOnlineMode ? verifyOnline() : verifyOffline(); };
paper.onclick = () => { playerChoice = 'Papier'; isOnlineMode ? verifyOnline() : verifyOffline(); };
scissors.onclick = () => { playerChoice = 'Ciseaux'; isOnlineMode ? verifyOnline() : verifyOffline(); };

// 3. Bouton "Continuer" / "Nouvelle Partie"
result.onclick = (e) => {
    if (e.target && e.target.id === 'next') {
        if (e.target.innerHTML === 'Nouvelle Partie') {
            if (!isOnlineMode) {
                ordiScore = 0;
                playerScore = 0;
                updateScoreDisplay(ordiScore, playerScore, 'Ordinateur', 'Moi');
                guide.innerHTML = `Premier à ${WINNING_SCORE} points gagne ! Faites votre choix.`;
            } else {
                socket.emit('readyForNewGame');
            }
        }
        
        resetGameArea();
        if (isOnlineMode) {
            socket.emit('readyForNextRound');
            guide.innerHTML = 'Faites votre choix !';
            setChoiceButtonsEnabled(true);
        } else {
             guide.innerHTML = `Premier à ${WINNING_SCORE} points gagne ! Faites votre choix.`;
        }
    }
};