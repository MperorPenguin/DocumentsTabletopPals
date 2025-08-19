function showSection(id) {
  document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
function rollDice(sides) {
  const result = Math.floor(Math.random() * sides) + 1;
  document.getElementById('dice-result').innerText = 'Rolled: ' + result;
}
function addDialogue() {
  const input = document.getElementById('dialogue-input');
  const log = document.getElementById('dialogue-log');
  const line = input.value.trim();
  if(line) {
    const entry = document.createElement('div');
    entry.innerText = line;
    log.appendChild(entry);
    input.value = '';
  }
}
function uploadScene(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('scene-display').innerHTML = '<img src="' + e.target.result + '" style="max-width:100%;">';
    };
    reader.readAsDataURL(file);
  }
}
