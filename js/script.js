document.addEventListener('DOMContentLoaded', function() {
  // Récupération des éléments DOM
  const rootSelect = document.getElementById('root-note');
  const scaleSelect = document.getElementById('scale-type');
  const fretCountSelect = document.getElementById('fret-count');
  const stringOrderSelect = document.getElementById('string-order');
  const markersContainer = document.getElementById('markers-container');
  const semitoneContainer = document.getElementById('semitone-colors');
  const fretboardImage = document.getElementById('fretboard-image');

  // Variables de configuration
  let showNoteLabels = true; // Par défaut, les lettres des notes sont affichées

  // Tableau de notes chromatiques
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Formules des gammes (en demi-tons depuis la note racine)
  const scales_old = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    seventh: [0, 4, 7, 10],
    pentatonic: [0, 3, 5, 7, 10]
  };
  
  const scales = {
    major: [0, 2, 4, 5, 7, 9, 11],              // Gamme majeure (ex. C D E F G A B)
    minor: [0, 2, 3, 5, 7, 8, 10],              // Gamme mineure naturelle (ex. A B C D E F G)
    pentatonicMinor: [0, 3, 5, 7, 10],          // Pentatonique mineure (ex. A C D E G)
    pentatonicMajor: [0, 2, 4, 7, 9],           // Pentatonique majeure (ex. C D E G A)
    blues: [0, 3, 4, 5, 7, 10],                 // Gamme blues (pentatonique mineure + blue note, ex. A C D D# E G)
    mixolydian: [0, 2, 4, 5, 7, 9, 10],         // Mode mixolydien (pour accords 7ème, ex. G A B C D E F)
    dorian: [0, 2, 3, 5, 7, 9, 10],             // Mode dorien (jazz, rock, ex. D E F G A B C)
    phrygian: [0, 1, 3, 5, 7, 8, 10],           // Mode phrygien (sonorité espagnole, ex. E F G A B C D)
    lydian: [0, 2, 4, 6, 7, 9, 11],             // Mode lydien (sonorité brillante, ex. F G A B C D E)
    aeolian: [0, 2, 3, 5, 7, 8, 10],            // Mode éolien (identique à mineure naturelle, redondant mais inclus)
    locrian: [0, 1, 3, 5, 6, 8, 10]             // Mode locrien (rare, sonorité instable, ex. B C D E F G A)
};

  // Accordage standard (du mi grave au mi aigu) inversé pour le grave en bas
  const strings = [
    { note: 'E', frequency: 329.63 },
    { note: 'B', frequency: 246.94 },
    { note: 'G', frequency: 196.00 },
    { note: 'D', frequency: 146.83 },
    { note: 'A', frequency: 110.00 },
    { note: 'E', frequency: 82.41 }
  ];

  // Couleurs par défaut pour les 12 demi-tons
  const defaultColors = [
    "#FF9696", // 0 : C
    "#646464", // 1 : C#
    "#7D7D7D", // 2 : D
    "#FCD963", // 3 : D#
    "#FFAF64", // 4 : E
    "#AFFFAF", // 5 : F
    "#FCAD64", // 6 : F#
    "#EE811B", // 7 : G
    "#AFAFAF", // 8 : G#
    "#C8C8C8", // 9 : A
    "#E1E1E1", // 10: A#
    "#FFFFFF"  // 11: B
  ];

  // Chargement de l'option d'affichage des notes
  const storedNoteLabels = localStorage.getItem('showNoteLabels');
  if (storedNoteLabels !== null) {
    showNoteLabels = storedNoteLabels === "true";
  }

  // Chargement des couleurs enregistrées, si elles existent
  const storedColors = localStorage.getItem('colorMapping');
  let colorMapping = storedColors ? JSON.parse(storedColors) : defaultColors.slice();

  // Chargement du nombre de frettes depuis le localStorage (si défini)
  const storedFretCount = localStorage.getItem('fretCount');
  if (storedFretCount) {
    fretCountSelect.value = storedFretCount;
  }

  // Pour chaque demi-ton, indique s'il est affiché sur le manche (sera mis à jour par updateAllControls)
  let visibleMapping = new Array(12).fill(true);

  // --- Fonctions Utilitaires ---
  function getContrastColor(hexcolor) {
    hexcolor = hexcolor.replace('#', '');
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
  }

  function getNoteIndex(note) {
    return noteNames.indexOf(note);
  }

  function getNoteAtFret(openNote, fret) {
    const openIndex = getNoteIndex(openNote);
    const noteIndex = (openIndex + fret) % 12;
    return noteNames[noteIndex];
  }

  function generateScaleNotes(root, scaleType) {
    const intervals = scales[scaleType];
    const rootIndex = getNoteIndex(root);
    return intervals.map(interval => noteNames[(rootIndex + interval) % 12]);
  }

  function clearMarkers() {
    markersContainer.innerHTML = '';
  }

  function playTone(frequency) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  }

  // Met à jour l'image du manche en fonction du nombre de frettes sélectionné
  function updateFretboardImage() {
    const fretCount = parseInt(fretCountSelect.value, 10);
    fretboardImage.src = `images/fretboard${fretCount}.svg`;
  }

  // --- Génération des marqueurs sur le manche ---
  function generateMarkers() {
    clearMarkers();
    const selectedRoot = rootSelect.value;
    const totalFrets = parseInt(fretCountSelect.value, 10);

    strings.forEach((string, stringIndex) => {
      for (let fret = 0; fret <= totalFrets; fret++) {
        const note = getNoteAtFret(string.note, fret);
        const semitoneDiff = (getNoteIndex(note) - getNoteIndex(selectedRoot) + 12) % 12;
        if (!visibleMapping[semitoneDiff]) continue;
        const markerColor = colorMapping[semitoneDiff];
        const marker = document.createElement('div');
        marker.classList.add(
          'marker', 'w-6', 'h-6',
          'rounded-full', 'flex',
          'justify-center', 'items-center', 'font-bold',
          'cursor-pointer', 'select-none', 'absolute', 'text-sm'
        );
        // EF - Faire en sorte que les clics sur les marqueurs fonctionnenet
        marker.style.pointerEvents = "auto";

        // Affiche ou masque la lettre selon l'état de showNoteLabels
        marker.textContent = showNoteLabels ? note : '';
        marker.style.backgroundColor = markerColor;
        marker.style.color = getContrastColor(markerColor);

        const leftPercent = (fret / totalFrets) * 100;
        const topPercent = ((stringIndex + 0.5) / strings.length) * 100;
        marker.style.left = `calc(${leftPercent}% - 1rem)`;
        marker.style.top = `calc(${topPercent}% - 1rem)`;

        marker.addEventListener('click', function(event) {
          event.stopPropagation(); // Empêche le clic de se propager à l'image du manche
          const freq = string.frequency * Math.pow(2, fret / 12);
          playTone(freq);
        });

        markersContainer.appendChild(marker);
      }
    });
  }

  // --- Contrôles pour les Demi-Tons ---
  function getLabelForSemitone(i) {
    const rootIndex = noteNames.indexOf(rootSelect.value);
    const noteName = noteNames[(rootIndex + i) % 12];
    return `${noteName} (${i})`;
  }

  function updateAllControls() {
    const scaleNotes = generateScaleNotes(rootSelect.value, scaleSelect.value);
    const buttons = semitoneContainer.querySelectorAll('button');
    buttons.forEach(button => {
      const i = parseInt(button.getAttribute('data-index'));
      const noteForSemitone = noteNames[(getNoteIndex(rootSelect.value) + i) % 12];
      const shouldBeChecked = scaleNotes.includes(noteForSemitone);
      const checkbox = button.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = shouldBeChecked;
      }
      visibleMapping[i] = shouldBeChecked;
      const labelSpan = button.querySelector('span');
      if (labelSpan) {
        labelSpan.textContent = getLabelForSemitone(i);
      }
    });
    generateMarkers();
  }

  function createSemitoneControls() {
    semitoneContainer.innerHTML = '';
    const BUTTON_CLASSES = ['flex', 'items-center', 'justify-center', 'gap-2', 'border', 'rounded', 'p-2', 'w-25', 'h-8'];
    for (let i = 0; i < 12; i++) {
      const button = document.createElement('button');
      button.setAttribute('data-index', i);
      button.classList.add(...BUTTON_CLASSES);
      button.style.width ='115px';
      button.style.backgroundColor = colorMapping[i];
      button.style.color = getContrastColor(colorMapping[i]);
      
      button.style.boxShadow = '2px 2px 5px rgba(0, 0, 0, 0.3)';

      // Création de la case à cocher
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.classList.add('w-4', 'h-4');
      checkbox.addEventListener('change', function() {
        visibleMapping[i] = checkbox.checked;
        generateMarkers();
      });

      // Création du label
      const labelSpan = document.createElement('span');
      labelSpan.id = `label-${i}`;
      labelSpan.textContent = getLabelForSemitone(i);

      // ✅ Appliquer une taille de police plus petite
      labelSpan.style.fontSize = '75%';  // Taille de police réduite (0.75rem ≈ 12px)

      // Création de l'input color
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = colorMapping[i];
      colorInput.classList.add('w-5', 'h-5', 'p-0', 'border-0', 'cursor-pointer');
      colorInput.addEventListener('change', function() {
        colorMapping[i] = colorInput.value;
        button.style.backgroundColor = colorMapping[i];
        button.style.color = getContrastColor(colorMapping[i]);
        labelSpan.textContent = getLabelForSemitone(i);
        generateMarkers();
        localStorage.setItem('colorMapping', JSON.stringify(colorMapping));
      });

      button.appendChild(checkbox);
      button.appendChild(labelSpan);
      button.appendChild(colorInput);
      semitoneContainer.appendChild(button);
    }
  }

  // --- Gestionnaire d'événements pour afficher/masquer les lettres ---
  fretboardImage.addEventListener('click', function() {
    showNoteLabels = !showNoteLabels; // Inverse l'état d'affichage
    localStorage.setItem('showNoteLabels', showNoteLabels);
    generateMarkers(); // Regénère les marqueurs pour appliquer le changement
  });


  // --- Initialisation et Événements ---
  createSemitoneControls();
  updateAllControls();
  generateMarkers();
  updateFretboardImage();

  // Événements sur les sélecteurs de note et gamme
  rootSelect.addEventListener('change', updateAllControls);
  scaleSelect.addEventListener('change', updateAllControls);

  fretCountSelect.addEventListener('change', function() {
    localStorage.setItem('fretCount', fretCountSelect.value);
    updateFretboardImage();
    generateMarkers();
  });

  stringOrderSelect.addEventListener('change', function() {
    localStorage.setItem('stringOrder', stringOrderSelect.value);
    generateMarkers();
  });
});