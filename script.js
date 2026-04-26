const WORD_BANK = [
  "WHERIGO",
  "GEOCACHING",
  "WAYMARK",
  "PUZZLE",
  "WEBCAM",
  "MINGO",
  "LOGBOOK",
  "TNLNSL"
];

const MAX_ATTEMPTS = 6;
const KEYWORD = "SIGNAL";
const KEY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"]
];

const boardElement = document.getElementById("board");
const keyboardElement = document.getElementById("keyboard");
const attemptsLeftElement = document.getElementById("attempts-left");
const wordLengthElement = document.getElementById("word-length");
const messageElement = document.getElementById("message");
const modalElement = document.getElementById("modal");
const modalTitleElement = document.getElementById("modal-title");
const modalBodyElement = document.getElementById("modal-body");
const playAgainButton = document.getElementById("play-again-button");
const newGameButton = document.getElementById("new-game-button");
const confettiLayer = document.getElementById("confetti-layer");

let targetWord = "";
let currentGuess = "";
let currentRow = 0;
let gameOver = false;
let guesses = [];
let keyboardState = {};

function randomWord() {
  const index = Math.floor(Math.random() * WORD_BANK.length);
  return WORD_BANK[index];
}

function priorityForState(state) {
  const priorities = { correct: 3, present: 2, absent: 1 };
  return priorities[state] || 0;
}

function setMessage(text) {
  messageElement.textContent = text;
}

function updateStatus() {
  attemptsLeftElement.textContent = `${MAX_ATTEMPTS - currentRow} left`;
  wordLengthElement.textContent = `${targetWord.length} letters`;
}

function buildBoard() {
  boardElement.innerHTML = "";
  boardElement.style.gridTemplateRows = `repeat(${MAX_ATTEMPTS}, 1fr)`;
  boardElement.style.setProperty("--cols", targetWord.length);

  for (let rowIndex = 0; rowIndex < MAX_ATTEMPTS; rowIndex += 1) {
    const row = document.createElement("div");
    row.className = "board-row";
    row.style.gridTemplateColumns = `repeat(${targetWord.length}, 1fr)`;

    for (let columnIndex = 0; columnIndex < targetWord.length; columnIndex += 1) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.id = `tile-${rowIndex}-${columnIndex}`;
      row.appendChild(tile);
    }

    boardElement.appendChild(row);
  }
}

function buildKeyboard() {
  keyboardElement.innerHTML = "";

  KEY_ROWS.forEach((rowKeys) => {
    const row = document.createElement("div");
    row.className = "keyboard-row";

    rowKeys.forEach((keyValue) => {
      const key = document.createElement("button");
      key.type = "button";
      key.className = "key";
      key.dataset.key = keyValue;
      key.textContent = keyValue === "BACK" ? "Delete" : keyValue;

      if (keyValue === "ENTER" || keyValue === "BACK") {
        key.classList.add("wide");
      }

      key.addEventListener("click", () => handleInput(keyValue));
      row.appendChild(key);
    });

    keyboardElement.appendChild(row);
  });
}

function refreshCurrentGuessRow() {
  for (let columnIndex = 0; columnIndex < targetWord.length; columnIndex += 1) {
    const tile = document.getElementById(`tile-${currentRow}-${columnIndex}`);
    const letter = currentGuess[columnIndex] || "";
    tile.textContent = letter;
    tile.classList.toggle("filled", Boolean(letter));
  }
}

function scoreGuess(guess) {
  const result = Array.from({ length: guess.length }, () => "absent");
  const remaining = {};

  for (let index = 0; index < targetWord.length; index += 1) {
    const targetLetter = targetWord[index];
    const guessLetter = guess[index];

    if (guessLetter === targetLetter) {
      result[index] = "correct";
    } else {
      remaining[targetLetter] = (remaining[targetLetter] || 0) + 1;
    }
  }

  for (let index = 0; index < targetWord.length; index += 1) {
    const guessLetter = guess[index];
    if (result[index] === "correct") {
      continue;
    }

    if (remaining[guessLetter] > 0) {
      result[index] = "present";
      remaining[guessLetter] -= 1;
    }
  }

  return result;
}

function paintGuess(rowIndex, guess, result) {
  for (let columnIndex = 0; columnIndex < guess.length; columnIndex += 1) {
    const tile = document.getElementById(`tile-${rowIndex}-${columnIndex}`);
    tile.textContent = guess[columnIndex];
    tile.classList.add(result[columnIndex]);
    tile.classList.add("filled");

    const letter = guess[columnIndex];
    const existingState = keyboardState[letter];
    if (priorityForState(result[columnIndex]) > priorityForState(existingState)) {
      keyboardState[letter] = result[columnIndex];
    }
  }

  document.querySelectorAll(".key").forEach((keyElement) => {
    const keyValue = keyElement.dataset.key;
    if (keyValue.length !== 1) {
      return;
    }

    keyElement.classList.remove("correct", "present", "absent");
    const state = keyboardState[keyValue];
    if (state) {
      keyElement.classList.add(state);
    }
  });
}

function openModal(title, body) {
  modalTitleElement.textContent = title;
  modalBodyElement.innerHTML = body;
  modalElement.classList.remove("hidden");
}

function closeModal() {
  modalElement.classList.add("hidden");
}

function launchConfetti() {
  confettiLayer.innerHTML = "";
  const colors = ["#5f9b3c", "#8ccf52", "#3f7d32", "#a7de6d"];

  for (let index = 0; index < 28; index += 1) {
    const piece = document.createElement("span");
    const fromLeft = index % 2 === 0;
    piece.className = `confetti-piece ${fromLeft ? "left" : "right"}`;
    piece.style.top = `${18 + (index % 10) * 6}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--travel-x", fromLeft ? `${90 + (index % 6) * 16}px` : `${-90 - (index % 6) * 16}px`);
    piece.style.setProperty("--travel-y", `${-120 + (index % 7) * 34}px`);
    piece.style.setProperty("--spin", `${fromLeft ? 240 : -240}deg`);
    piece.style.animationDelay = `${(index % 7) * 0.05}s`;
    confettiLayer.appendChild(piece);
  }

  window.setTimeout(() => {
    confettiLayer.innerHTML = "";
  }, 3000);
}

function startGame() {
  targetWord = randomWord();
  currentGuess = "";
  currentRow = 0;
  gameOver = false;
  guesses = [];
  keyboardState = {};
  closeModal();
  buildBoard();
  buildKeyboard();
  updateStatus();
  setMessage(`New round loaded. Guess a ${targetWord.length}-letter geocaching word.`);
}

function submitGuess() {
  if (currentGuess.length !== targetWord.length) {
    setMessage(`Need ${targetWord.length} letters before you can submit.`);
    return;
  }

  const guess = currentGuess;
  const result = scoreGuess(guess);
  guesses.push(guess);
  paintGuess(currentRow, guess, result);

  if (guess === targetWord) {
    gameOver = true;
    updateStatus();
    setMessage(`Cache cracked. Your keyword is ${KEYWORD}.`);
    launchConfetti();
    openModal("Cache cracked", `The keyword is <strong>${KEYWORD}</strong>.`);
    return;
  }

  currentRow += 1;
  currentGuess = "";
  updateStatus();

  if (currentRow >= MAX_ATTEMPTS) {
    gameOver = true;
    setMessage(`DNF. The word was ${targetWord}. Tap Play Again for another cache word.`);
    openModal("Did Not Find", `The word was <strong>${targetWord}</strong>.<br>Try another geocaching word whenever you're ready.`);
    return;
  }

  setMessage(`Not quite. ${MAX_ATTEMPTS - currentRow} attempts remaining.`);
}

function handleInput(value) {
  if (gameOver) {
    return;
  }

  if (value === "ENTER") {
    submitGuess();
    return;
  }

  if (value === "BACK") {
    currentGuess = currentGuess.slice(0, -1);
    refreshCurrentGuessRow();
    return;
  }

  if (/^[A-Z]$/.test(value) && currentGuess.length < targetWord.length) {
    currentGuess += value;
    refreshCurrentGuessRow();
  }
}

document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key === "Enter") {
    handleInput("ENTER");
    return;
  }

  if (key === "Backspace" || key === "Delete") {
    handleInput("BACK");
    return;
  }

  if (/^[a-zA-Z]$/.test(key)) {
    handleInput(key.toUpperCase());
  }
});

playAgainButton.addEventListener("click", startGame);
newGameButton.addEventListener("click", startGame);
modalElement.addEventListener("click", (event) => {
  if (event.target === modalElement) {
    closeModal();
  }
});

startGame();
