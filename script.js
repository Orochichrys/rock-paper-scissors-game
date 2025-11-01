let ordi = ['Pierre', 'Papier', 'Ciseaux'];
let ordiScore = 0;
let playerScore = 0;
let ordiScoreDisplay = document.getElementById('ordiScoreDisplay');
let playerScoreDisplay = document.getElementById('playerScoreDisplay');
let result = document.getElementById('result');
let rock = document.getElementById('rock');
let paper = document.getElementById('paper');
let scissors = document.getElementById('scissors');
let choices = document.getElementById('choices');
let guide = document.querySelector('.guide');
let playerChoice;

function randomNumber() {
  let idx = Math.floor(Math.random() * 3);
  return idx;
}

function emoji(choice) {
  switch (choice) {
    case 'Pierre': return '👊';
    case 'Papier': return '✋';
    case 'Ciseaux': return '✌️';
  }

}

function verify() {
  let idx = randomNumber();
  let ordiChoice = ordi[idx];
  let ordiEmoji = emoji(ordiChoice);
  let playerEmoji = emoji(playerChoice);

  if (ordiChoice === playerChoice) {
    result.innerHTML = `<div class="draw">Match Nul</div>
                            <div class="emoji">
                              <div>${ordiEmoji}</div>
                              <div>${playerEmoji}</div>
                            </div>
                            <button id="next">continue</button>
                        `;
    guide.style.display = 'none';
    choices.style.display = 'none';
    result.style.display = 'block';
  }
  else if (ordiChoice === 'Pierre' && playerChoice === 'Ciseaux' ||
    ordiChoice === 'Papier' && playerChoice === 'Pierre' ||
    ordiChoice === 'Ciseaux' && playerChoice === 'Papier'
  ) {
    ordiScore += 1;
    ordiScoreDisplay.innerHTML = 'Ordinateur: ' + ordiScore;
    result.innerHTML = `<div class="lose">Ordinateur gagne</div>
                            <div class="emoji">
                              <div>${ordiEmoji}</div>
                              <div>${playerEmoji}</div>
                            </div>
                            <button id="next">continue</button>
                        `;
    guide.style.display = 'none';
    choices.style.display = 'none';
    result.style.display = 'block';
  }
  else {
    playerScore += 1;
    playerScoreDisplay.innerHTML = 'Moi:' + playerScore;
    result.innerHTML = `<div class="win">Joueur gagne</div>
                            <div class="emoji">
                              <div>${ordiEmoji}</div>
                              <div>${playerEmoji}</div>
                            </div>
                            <button id="next">continue</button>
                        `;
    guide.style.display = 'none';
    choices.style.display = 'none';
    result.style.display = 'block';
  }

}

rock.onclick = () => { playerChoice = 'Pierre'; verify() }
paper.onclick = () => { playerChoice = 'Papier'; verify() }
scissors.onclick = () => { playerChoice = 'Ciseaux'; verify() }

result.onclick = (e) => {
 if(e.target && e.target.id === 'next'){
  choices.style.display = 'block';
  result.style.display = 'none';
  guide.style.display = 'block';
 } 
}
