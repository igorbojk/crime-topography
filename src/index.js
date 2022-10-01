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
const playImg = document.getElementById('play');
const pauseImg = document.getElementById('pause');
const canvas = document.querySelector('#canvas');
const context = canvas.getContext('2d');

let crimeDates;
let lastCrimeDates;
let translates;
let animationTimeout;
let isAnimationStarted = false;
let stats = [];

function proceedEvents(payload) {
    const arr = [];
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
        return acc = acc + (el.affected_number ? summNumberArray(el.affected_number) : 0);
    }, 0);
};

function summNumberArray(arr) {
    return arr.reduce((acc, el) => {
        return acc = acc + (typeof el === 'string' ? Number(el) : el);
    }, 0)
};

function createTimeline(arr) {
    const sortedArr = arr.map(el => el.affectedNumber).sort((a, b) => a - b);
    const max = sortedArr[sortedArr.length - 1];
    arr.forEach(el => {
        const timelineElem = document.createElement('div');
        timelineElem.className = 'timeline__elem';
        timelineElem.style = `height: ${(100 * el.affectedNumber) / max}%`
        timelineNode.appendChild(timelineElem);
    })
};

function generateTranslatesObj() {
    translates = names[DEFAULT_LANG];
}

function generateStats(dates) {
    dates.forEach(date => {
        addStat(date);
    });
};

function addStat(date) {
    date.crimes.forEach(crime => {
        if (crime.affected_type) {
            const target = stats.find(el => el.type === crime.affected_type[0]);
            if (target) {
                target.count += summNumberArray(crime.affected_number);
            } else {
                stats.push({
                    type: crime.affected_type[0],
                    count: summNumberArray(crime.affected_number)
                });
            }
        }
    })
}

function renderStats() {
    stats.forEach(stat => {
        const target = document.querySelector(`[affected-type="${stat.type}"`);
        if (target) {
            target.innerText = stat.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        } else {
            const statsItem = document.createElement('div');
            statsItem.className = 'stats__item';
            const statCount = document.createElement('div');
            statCount.className = 'stats__item__count';
            statCount.innerText = stat.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
            statCount.setAttribute('affected-type', stat.type);
            statsItem.appendChild(statCount);
            const statTitle = document.createElement('div');
            statTitle.className = 'stats__item__title';
            statTitle.innerText = decodeURI(translates.affected_type[stat.type]);
            statsItem.appendChild(statTitle);
            statsNode.appendChild(statsItem);
        }
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
    stats = [];
    generateStats(crimeDates.slice(0, lastDayIndex));
    statsNode.innerHTML = '';
    renderStats();
    timelineRange.value = 0;
};

function playAnimation(arr, index, lastIndex) {
    clearTimeout(animationTimeout);
    if (index === lastIndex) {
        return;
    }
    animationTimeout = setTimeout(() => {
        timelineRange.value = index + 1;
        createDots(arr[index]);
        addStat(arr[index]);
        renderStats();
        playAnimation(arr, index + 1, lastIndex);
    }, 1000);
}

function pauseAnimation() {
    clearTimeout(animationTimeout);
    isAnimationStarted = false;
}

function startAnimation(selectedDate = lastCrimeDates[0].date) {
    isAnimationStarted = true;
    resetCrimesToDate();
    const index = lastCrimeDates.findIndex(el => el.date === selectedDate);
    const arr = lastCrimeDates.slice(index, lastCrimeDates.length);
    playAnimation(arr, 0, arr.length - 1)
}

crimeDates = proceedEvents(events).sort((a, b) => (new Date(a.date) - new Date(b.date)));
lastCrimeDates = crimeDates.length > 100 ? crimeDates.slice(-100) : [...crimeDates];

generateTranslatesObj();
createTimeline(lastCrimeDates);
generateStats(crimeDates);
renderStats();
drawCrimes(crimeDates);


playBtn.addEventListener('click', function(evt) {
    evt.stopImmediatePropagation();
    evt.preventDefault();
    if (isAnimationStarted) {
        playImg.className = '';
        pauseImg.className = 'hide';
        pauseAnimation();
    } else {
        pauseImg.className = '';
        playImg.className = 'hide';
        startAnimation();
    }
}, true);