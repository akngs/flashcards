var QUIZ_TYPES = ['def2word', 'word2def', 'sen2word', 'synonyms'], deck = [];

function main() {
  d3.selectAll('.info .toggle').on('click', function() {
    var contents = d3.select('.info .contents');
    contents.classed('hidden', !contents.classed('hidden'));
  });

  d3.csv(
    'data/words.csv',
    function (r) {
      return {
        id: r.word + '_' + hash([r.wordclass, r.synonyms, r.definition, r.sentences].join('-')),
        word: r.word,
        wordclass: r.wordclass,
        synonyms: r.synonyms.split(';'),
        definition: r.definition,
        sentences: r.sentences.split(';').map(function (s) {
          return s.replace(/\*.+?\*/g, '____');
        })
      }
    },
    function (err, data) {
      deck = data;
      nextQuiz();
    }
  );
}

function nextQuiz() {
  var quizType = QUIZ_TYPES[(Math.random() * QUIZ_TYPES.length) | 0];
  var card = chooseCard();
  var choices = d3.shuffle([card].concat(getProbableChoices(card)));

  d3.select('.quiz').attr('class', 'quiz ' + quizType);
  d3.select('.quiz .question').datum(card).each(renderCard);
  d3.select('.quiz .choices')
    .html('')
    .selectAll('li.card').data(choices).enter().append('li')
    .attr('class', 'card')
    .each(renderCard)
    .on('click', function (clickedCard) {
      if (d3.select(this).classed('wrong')) return;
      updatePerf(card, clickedCard);
      var correct = card === clickedCard;
      d3.select(this).classed(correct ? 'right' : 'wrong', true);
      if (correct) window.setTimeout(nextQuiz, 500);
    });
}

function chooseCard() {
  var perfs = loadPerformance();
  var now = Date.now();

  function order(p) {
    return p.score - Math.log(now - p.lastExposedTime) * 0.001;
  }

  return deck
    .sort(function (a, b) {
      return d3.ascending(
        order(perfs[a.id] || defaultPerfEntry(a)),
        order(perfs[b.id] || defaultPerfEntry(b))
      );
    })
    .slice(0, 10)[(Math.random() * 10) | 0];
}

function renderCard(card) {
  var cardSel = d3.select(this)
    .attr('id', 'card' + card.id)
    .attr('data-id', card.id)
    .html('');
  cardSel.append('p').attr('class', 'word').text(card.word);
  cardSel.append('p').attr('class', 'definition').text(card.definition);
  cardSel.append('ul').attr('class', 'synonyms')
    .selectAll('li').data(d3.shuffle(card.synonyms).slice(0, 4)).enter().append('li')
    .text(String);
  cardSel.append('ul').attr('class', 'sentences')
    .selectAll('li').data(d3.shuffle(card.sentences).slice(0, 4)).enter().append('li')
    .text(String);
}

function updatePerf(rightCard, choosenCard) {
  var perfs = loadPerformance();
  var now = Date.now();
  var correct = rightCard === choosenCard;
  updatePerfForEntry(perfs, rightCard, correct, now);
  if (!correct) updatePerfForEntry(perfs, choosenCard, correct, now);
  savePerformance(perfs);
}

function updatePerfForEntry(perfs, card, correct, now) {
  // update performance using exponential-smoothing
  var perf = perfs[card.id] || defaultPerfEntry(card);
  perf.word = card.word;
  perf.score = perf.score * 0.9 + (correct ? 1 : 0) * 0.1;
  perf.lastExposedTime = now;
  perfs[card.id] = perf;
}

function defaultPerfEntry(card) {
  return {word: card.word, score: 0.5, lastExposedTime: 0};
}

function loadPerformance() {
  return JSON.parse(localStorage.getItem('perfs') || '{}');
}

function savePerformance(perfs) {
  localStorage.setItem('perfs', JSON.stringify(perfs));
}

function getProbableChoices(card) {
  var duplicates = d3.set([card.word]);
  var similarWords = d3.set(deck
    .filter(function (c) {
      return c.synonyms.indexOf(card.word) !== -1;
    })
    .map(function (c) {
      return c.word;
    })
  );

  return d3.shuffle(deck)
    .filter(function (c) {
      return c.wordclass === card.wordclass;
    })
    .filter(function (c) {
      var duplicated = duplicates.has(c.word);
      duplicates.add(c.word);
      return !duplicated;
    })
    .filter(function (c) {
      return !similarWords.has(c.word);
    })
    .slice(0, 3);
}

function hash(s) {
  var hash = 5381, i = s.length;
  while (i) hash = (hash * 33) ^ s.charCodeAt(--i);
  return hash >>> 0;
}

main();