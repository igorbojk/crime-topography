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
const bubbleNode = document.querySelector('.bubble');
const canvas = document.querySelector('#canvas');
const context = canvas.getContext('2d');

let crimeDates;
let lastCrimeDates;
let translates;
let animationTimeout;
let renderTimeout;
let isAnimationStarted = false;
let isAnimationPaused = false;
let stats = [];
let lastAnimationIndex = 0;
let selectedDate;

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
        timelineElem.setAttribute('date', el.date)
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
            let counter = target.querySelector('.stats__item__count')
            counter.innerText = stat.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        } else {
            const statsItem = document.createElement('div');
            statsItem.className = 'stats__item';
            statsItem.setAttribute('affected-type', stat.type);
            const statCount = document.createElement('div');
            statCount.className = 'stats__item__count';
            statCount.innerText = stat.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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

function resetCrimesToSelectedDate() {
    const lastDayIndex = crimeDates.findIndex(el => el.date === selectedDate);
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawCrimes(crimeDates.slice(0, lastDayIndex));
    stats = [];
    generateStats(crimeDates.slice(0, lastDayIndex));
    statsNode.innerHTML = '';
    renderStats();
};

function playAnimation(arr, index, lastIndex) {
    isAnimationPaused = false;
    clearTimeout(animationTimeout);
    lastAnimationIndex = index + 1;
    timelineRange.value = index + 1;
    createDots(arr[index]);
    addStat(arr[index]);
    renderStats();
    setBubble();
    if (index === lastIndex) {
        isAnimationStarted = false;
        return;
    }
    animationTimeout = setTimeout(() => {
        playAnimation(arr, index + 1, lastIndex);
    }, 500);
}

function pauseAnimation() {
    clearTimeout(animationTimeout);
    isAnimationPaused = true;
    isAnimationStarted = false;
}

function startAnimation() {
    isAnimationStarted = true;
    resetCrimesToSelectedDate();
    const index = lastCrimeDates.findIndex(el => el.date === selectedDate);
    playAnimation(lastCrimeDates, isAnimationPaused ? lastAnimationIndex : index, lastCrimeDates.length - 1)
}

function setBubble() {
    const index = timelineRange.value;
    selectedDate = lastCrimeDates[timelineRange.value].date;
    bubbleNode.innerHTML = selectedDate;
    bubbleNode.style.left = `calc(6px + ${index * (timelineNode.offsetWidth / 100)}px)`;
}

// Set main variables
crimeDates = proceedEvents(events).sort((a, b) => (new Date(a.date) - new Date(b.date)));
lastCrimeDates = crimeDates.length > 100 ? crimeDates.slice(-100) : [...crimeDates];

// Run main function
generateTranslatesObj();
createTimeline(lastCrimeDates);
setBubble();
generateStats(crimeDates.slice(0, crimeDates.length - 100));
renderStats();
drawCrimes(crimeDates.slice(0, crimeDates.length - 100));

// Listeners
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

timelineNode.addEventListener('click', function(evt) {
    evt.stopImmediatePropagation();
    evt.preventDefault();
    if (evt.target.className !== 'timeline__elem') {
        return
    }
    playImg.className = '';
    pauseImg.className = 'hide';
    pauseAnimation();
    isAnimationPaused = false;
    isAnimationStarted = false;
    selectedDate = evt.target.attributes.date.value;
    timelineRange.value = lastCrimeDates.findIndex(el => el.date === selectedDate);
    setBubble();
    resetCrimesToSelectedDate();
}, true);

timelineRange.addEventListener("input", () => {
    isAnimationPaused = false;
    isAnimationStarted = false;
    setBubble();
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
        resetCrimesToSelectedDate();
    }, 100)
});