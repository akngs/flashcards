var QUIZ_TYPES = [
  'def2word',
  'word2def',
  'sen2word',
  // 'word2syn',
  // 'syn2word'
];

google.charts.load('current', {'packages': ['corechart']});
google.charts.setOnLoadCallback(main);


function main() {
  var url = 'https://docs.google.com/spreadsheets/d/1969Gi-7GP1bmJXH72y4PNmnp2Up9ESEpmjGGuGfBAHE/edit?usp=sharing';
  var query = new google.visualization.Query(url);
  query.send(function (res) {
    var cards = parseRawData(JSON.parse(res.getDataTable().toJSON()));
    nextQuiz(cards);
  });
}


function nextQuiz(cards) {
  var rightCard = cards[(Math.random() * cards.length) | 0];
  var quizType = QUIZ_TYPES[(Math.random() * QUIZ_TYPES.length) | 0];
  renderQuiz(quizType, rightCard, cards);
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

  updateScore(rightCard, clickedCard);
  if (rightCard === clickedCard) {
    d3.select(element).classed('right', true);
    window.setTimeout(function() {
      nextQuiz(cards);
    }, 500);
  } else {
    d3.select(element).classed('wrong', true);
  }
}


function updateScore(rightCard, choosenCard) {

}


function parseRawData(raw) {
  return raw.rows.map(function (row, ri) {
    return {
      id: +row.c[0].v,
      word: row.c[1].v,
      wordclass: row.c[2].v,
      synonyms: row.c[3].v.split(';'),
      definition: row.c[4].v,
      sentences: row.c[5].v.split(';').map(function (s) {
        return s.replace(/\*.+?\*/g, '[___]')
      })
    };
  });
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