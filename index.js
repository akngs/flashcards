var QUIZ_TYPES = [
  'def2word',
  'word2def',
  'sen2word'
];


d3.csv('data/words.csv', parseRow, function (err, cards) {
  nextQuiz(cards);
});


function nextQuiz(cards) {
  var rightCard = chooseNextCard(cards);
  var quizType = QUIZ_TYPES[(Math.random() * QUIZ_TYPES.length) | 0];
  renderQuiz(quizType, rightCard, cards);
}


function chooseNextCard(cards) {
  var perfs = loadPerformance();
  var perfList = [];
  cards.forEach(function (card) {
    perfList.push({
      card: card,
      perf: perfs[card.id] || {word: card.word, score: 0.5, lastExposedTime: 0}
    });
  });

  var now = Date.now();
  var candidates = perfList
    .sort(function (a, b) {
      return d3.ascending(
        a.perf.score - Math.log(now - a.perf.lastExposedTime + 1) * 0.001,
        b.perf.score - Math.log(now - b.perf.lastExposedTime + 1) * 0.001
      );
    })
    .slice(0, 10);

  return d3.shuffle(candidates)[0].card;
}

function renderQuiz(quizType, rightCard, cards) {
  var wrongCandidates = findWrongCandidates(rightCard, cards).slice(0, 3);
  var candidates = d3.shuffle([rightCard].concat(wrongCandidates));

  d3.select('.quiz').attr('class', 'quiz ' + quizType);
  d3.select('.quiz .question').datum(rightCard).each(renderCard);
  d3.select('.quiz .candidates')
    .html('')
    .selectAll('li.card').data(candidates)
    .enter()
    .append('li')
    .classed('card', true)
    .classed('wrong', false)
    .each(renderCard)
    .on('click', function (c) {
      onClick(this, cards, c, rightCard);
    });
}


function renderCard(card) {
  var cardSel = d3.select(this)
    .attr('id', 'card' + card.id)
    .attr('data-id', card.id)
    .html('');
  cardSel.append('p')
    .attr('class', 'word')
    .text(card.word);
  cardSel.append('p')
    .attr('class', 'definition')
    .text(card.definition);
  cardSel.append('ul')
    .attr('class', 'synonyms')
    .selectAll('li')
    .data(d3.shuffle(card.synonyms))
    .enter()
    .append('li')
    .text(String);
  cardSel.append('ul')
    .attr('class', 'sentences')
    .selectAll('li')
    .data(d3.shuffle(card.sentences))
    .enter()
    .append('li')
    .text(String);
}


function onClick(element, cards, clickedCard, rightCard) {
  if (d3.select(element).classed('wrong')) return;

  updatePerf(rightCard, clickedCard);
  if (rightCard === clickedCard) {
    d3.select(element).classed('right', true);
    window.setTimeout(function () {
      nextQuiz(cards);
    }, 500);
  } else {
    d3.select(element).classed('wrong', true);
  }
}


function updatePerf(rightCard, choosenCard) {
  var perfs = loadPerformance();

  var now = Date.now();
  var correct = rightCard === choosenCard;
  updatePerfForEntry(perfs, rightCard, correct, now);
  if (!correct) {
    updatePerfForEntry(perfs, choosenCard, correct, now);
  }

  savePerformance(perfs);
}


function updatePerfForEntry(perfs, card, correct, now) {
  if (!perfs[card.id]) {
    perfs[card.id] = {
      word: card.word,
      score: 0.5,
      lastExposedTime: 0
    };
  }

  var perf = perfs[card.id];
  perf.word = card.word;
  perf.score = perf.score * 0.9 + (correct ? 1 : 0) * 0.1;
  perf.lastExposedTime = now;
  perfs[card.id] = perf;
}


function loadPerformance() {
  var perfs = JSON.parse(localStorage.getItem('perfs'));
  if (!perfs) {
    localStorage.setItem('perfs', '{}');
    return {};
  } else {
    return perfs;
  }
}


function savePerformance(perfs) {
  localStorage.setItem('perfs', JSON.stringify(perfs));
}


function parseRow(row) {
  return {
    id: row.word + '_' + hash([row.wordclass, row.synonyms, row.definition, row.sentences].join('-')),
    word: row.word,
    wordclass: row.wordclass,
    synonyms: row.synonyms.split(';'),
    definition: row.definition,
    sentences: row.sentences.split(';').map(function (s) {
      return s.replace(/\*.+?\*/g, '____');
    })
  }
}


function findWrongCandidates(rightCard, cards) {
  var sameClasses = cards
    .filter(function (c) {
      return c.wordclass === rightCard.wordclass;
    })
    .filter(function (c) {
      return c.word !== rightCard.word;
    });

  // shuffle and remove duplicated words
  var words = d3.set();
  return d3.shuffle(sameClasses).filter(function (c) {
    var duplicated = words.has(c.word);
    words.add(c.word);
    return !duplicated;
  });
}


function hash(s) {
  var hash = 5381;
  var i = s.length;
  while(i) {
    hash = (hash * 33) ^ s.charCodeAt(--i);
  }
  return hash >>> 0;
}