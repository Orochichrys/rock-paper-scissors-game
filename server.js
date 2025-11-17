const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;
const WINNING_SCORE = 5; // Nouveau: Condition de victoire

// Servir les fichiers statiques (html, css, js)
app.use(express.static(__dirname));

// --- Logique du jeu en ligne ---
let waitingPlayer = null; 
let games = {};           
let playerScores = {};    // Map des scores (socketId: score)

function getRoomId(socketId) {
    for (const id in games) {
        if (games[id].player1 === socketId || games[id].player2 === socketId) {
            return id;
        }
    }
    return null;
}

function checkWin(choice1, choice2) {
    if (choice1 === choice2) return 'draw';
    
    if (
        (choice1 === 'Pierre' && choice2 === 'Ciseaux') ||
        (choice1 === 'Papier' && choice2 === 'Pierre') ||
        (choice1 === 'Ciseaux' && choice2 === 'Papier')
    ) {
        return 'win'; 
    }
    
    return 'lose'; 
}

io.on('connection', (socket) => {
    console.log(`Un joueur est connecté: ${socket.id}`);
    
    playerScores[socket.id] = 0;

    // --- Matchmaking ---
    if (waitingPlayer && waitingPlayer !== socket.id) {
        const player1Id = waitingPlayer;
        const player2Id = socket.id;
        const roomID = `game-${player1Id}-${player2Id}`;
        
        socket.join(roomID);
        io.sockets.sockets.get(player1Id).join(roomID);

        games[roomID] = {
            player1: player1Id,
            player2: player2Id,
            choices: {}, 
            room: roomID
        };

        waitingPlayer = null; 
        
        console.log(`Partie créée: ${roomID}`);
        
        io.to(roomID).emit('startMatch');
        
    } else {
        waitingPlayer = socket.id;
        socket.emit('waitingForOpponent');
        console.log(`Joueur en attente: ${socket.id}`);
    }

    // --- Gestion du choix du joueur ---
    socket.on('playerChoice', (choice) => {
        const roomID = getRoomId(socket.id);
        if (!roomID) return;

        const game = games[roomID];
        const playerID = socket.id;
        
        game.choices[playerID] = choice;

        socket.emit('waitingForOpponentChoice');

        if (game.choices[game.player1] && game.choices[game.player2]) {
            const choice1 = game.choices[game.player1];
            const choice2 = game.choices[game.player2];
            
            const result1 = checkWin(choice1, choice2); 
            
            // Mise à jour des scores
            if (result1 === 'win') {
                playerScores[game.player1]++;
            } else if (result1 === 'lose') {
                playerScores[game.player2]++;
            }
            
            // Vérification de la fin de partie
            const isGameOver = playerScores[game.player1] >= WINNING_SCORE || playerScores[game.player2] >= WINNING_SCORE;

            // Envoyer le résultat au joueur 1
            io.to(game.player1).emit('roundResult', {
                myScore: playerScores[game.player1],
                opponentScore: playerScores[game.player2],
                myChoice: choice1,
                opponentChoice: choice2,
                result: result1, // 'win', 'lose', 'draw'
                isGameOver: isGameOver
            });

            // Le joueur 2 est l'opposé du joueur 1
            const result2 = (result1 === 'win') ? 'lose' : (result1 === 'lose' ? 'win' : 'draw');
            
            // Envoyer le résultat au joueur 2
            io.to(game.player2).emit('roundResult', {
                myScore: playerScores[game.player2],
                opponentScore: playerScores[game.player1],
                myChoice: choice2,
                opponentChoice: choice1,
                result: result2,
                isGameOver: isGameOver
            });

            // Réinitialiser les choix pour le prochain tour UNIQUEMENT si la partie n'est pas terminée
            if (!isGameOver) {
                game.choices = {};
            }
        }
    });
    
    socket.on('readyForNewGame', () => {
        // Le joueur demande une nouvelle partie (après un Game Over)
        const roomID = getRoomId(socket.id);
        if (roomID) {
            const game = games[roomID];
            // Réinitialiser le score du joueur qui a cliqué
            playerScores[game.player1] = 0;
            playerScores[game.player2] = 0;
            game.choices = {}; // S'assurer que les choix sont vides
            
            // Notifier les deux joueurs de la réinitialisation
            io.to(roomID).emit('startMatch');
        }
    });

    // --- Déconnexion ---
    socket.on('disconnect', () => {
        console.log(`Joueur déconnecté: ${socket.id}`);

        if (waitingPlayer === socket.id) {
            waitingPlayer = null;
        }

        const roomID = getRoomId(socket.id);
        if (roomID) {
            const game = games[roomID];
            const opponentID = (socket.id === game.player1) ? game.player2 : game.player1;
            
            io.to(opponentID).emit('opponentLeft');

            waitingPlayer = opponentID;
            
            delete games[roomID];
            delete playerScores[socket.id];
            delete playerScores[opponentID];
        }
    });
});

server.listen(port, () => {
    console.log(`Serveur en ligne sur http://localhost:${port}`);
});