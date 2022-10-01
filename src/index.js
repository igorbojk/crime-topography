import './css/style.scss';
//TODO move it to the import
const events = require('./temp/events.json');
const names = require('./temp/names.json');

// TODO select browser default language
const DEFAULT_LANG = 'ua';
const LEFT_CORNER_LAT = 52.379109;
const LEFT_CORNER_LON = 22.137507;

const timelineNode = document.getElementById('timeline');
const timelineRange = document.getElementById('timeline-range');
const statsNode = document.getElementById('stats');
const playBtn = document.getElementById('play-btn');
const canvas = document.querySelector('#canvas');
const context = canvas.getContext('2d');

let crimeDates;
let lastCrimeDates;
let translates;

function proceedEvents(payload) {
    const arr = [];
    /**
     {
       events: ['5'],
       from: '2022-03-05',
       lat: 50.0254,
       lon: 36.12,
       object_statis: ['5'],
       qualification: ['1'],
       till: '2022-03-05',
      "affected_number": [
        "15"
      ],
     }
     */
    //TODO change to reduce
    payload.forEach(el => {
        const target = arr.find(crime => crime.date === el.from);
        if (target) {
            target.crimes.push(el);
        } else {
            arr.push({
                date: el.from,
                crimes: [el]
            });
        }
    });
    return arr.map(el => ({
        ...el,
        affectedNumber: accumulateAffectedNumber(el.crimes)
    }))
};

function accumulateAffectedNumber(arr) {
    return arr.reduce((acc, el) => {
        return acc + el.affected_number ? summNumberArray(el.affected_number) : 0;
    }, 0);
};

function summNumberArray(arr) {
    return arr.reduce((acc, el) => {
        return acc + +el;
    }, 0)
};

function createTimeline(arr) {
    arr.forEach(el => {
        const timelineElem = document.createElement('div');
        timelineElem.className = 'timeline__elem';
        timelineElem.style = `height: ${el.affectedNumber + 10}px`
        timelineNode.appendChild(timelineElem);
    })
};

function generateTranslatesObj() {
    translates = names[DEFAULT_LANG];
}

function generateStats() {
    let arr = [];
    crimeDates.forEach(date => {
        date.crimes.forEach(crime => {
            if (crime.affected_type) {
                const target = arr.find(el => el.type === crime.affected_type[0]);
                if (target) {
                    target.count += summNumberArray(crime.affected_number);
                } else {
                    arr.push({
                        type: crime.affected_type[0],
                        count: summNumberArray(crime.affected_number)
                    });
                }
            }
        })
    });
    return arr;
};

function createStats() {
    const stats = generateStats();
    stats.forEach(stat => {
        const statsItem = document.createElement('div');
        statsItem.className = 'stats__item';
        const statCount = document.createElement('div');
        statCount.className = 'stats__item__count';
        statCount.innerText = stat.count;
        statsItem.appendChild(statCount);
        const statTitle = document.createElement('div');
        statTitle.className = 'stats__item__title';
        statTitle.innerText = decodeURI(translates.affected_type[stat.type]);
        statsItem.appendChild(statTitle);
        // separate to thousands
        statsNode.appendChild(statsItem);
    });
};

function createDots(date) {
    date.crimes.forEach(crime => {
        if (crime.lat && crime.lon) {
            const lat = (canvas.height * (LEFT_CORNER_LAT - crime.lat)) / 7.991977;
            const lon = (canvas.width * (crime.lon - LEFT_CORNER_LON)) / 18.082542;
            context.beginPath();
            context.fillStyle = '#C00000';
            context.arc(lon, lat, 1, 0, 2 * Math.PI, true);
            context.fill();
        }
    });
}

function drawCrimes(dates) {
    dates.forEach(date => {
        createDots(date);
    });
}

function resetCrimesToDate() {
    const lastDayIndex = crimeDates.findIndex(el => el.date === lastCrimeDates[0].date);
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawCrimes(crimeDates.slice(0, lastDayIndex));
};

function startAnimation(selectedDate = lastCrimeDates[0].date) {
    resetCrimesToDate();
    const index = lastCrimeDates.findIndex(el => el.date === selectedDate);
    lastCrimeDates.slice(index, lastCrimeDates.length).forEach((date, index) => {
        setTimeout(() => {
            timelineRange.value = index + 1;
            console.log(timelineRange.value)
            createDots(date);
        }, 500 * index);
    });
}

crimeDates = proceedEvents(events);
lastCrimeDates = crimeDates.length > 100 ? crimeDates.slice(-100) : [...crimeDates];

generateTranslatesObj();
createTimeline(lastCrimeDates);
createStats();
drawCrimes(crimeDates);


playBtn.addEventListener('click', function(evt) {
    evt.stopImmediatePropagation();
    evt.preventDefault();
    startAnimation();
}, true);