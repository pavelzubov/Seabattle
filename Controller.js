// слушатель события unload
// срабатывает, когда пользователь уходит со страницы
// очищает базу значений
window.addEventListener("beforeunload", function(event) {
    base.clear();
}, false);

// слушатель события endGame
// срабатывает, когда игра закончилась
window.addEventListener("endGame", function(event) {
    $('#indicators').fadeOut(300);
    screens.show(4);
    if (event.detail.winner) congratulations.innerHTML = 'Вы победили!';
    else congratulations.innerHTML = 'Соперник победил(((9';
    setTimeout(function() {
        base.clear();
    }, 1000); // для того чтобы соперник успел забрать из базы информацию о том, что игра закончена ждем секунду и потом очищаем базу
}, false);
// слушатель события connect
// срабатывает, когда подключается соперник
window.addEventListener("connect", function(event) {
    indicators.show('connectBlock'); // показываем что подключился
    indicators.hide('connectBlock'); // скрываем индикатор
    thisMoveInd.style.display = 'block';
    canvas0.onclick = canvasClick; // навешиваем обработчик
    canvas1.onclick = canvasClick;
    if (first) plane = values.secondPlane; // указываем рабочую поверхность
    else plane = values.firstPlane;
    for (var i = 0; i < SIDE; i++) { // ставим вражеские корабли в массив symbs_that (чтобы их потом рисовать)
        symbs_that[i] = [];
        cell = plane[i];
        for (var j = 0; j < SIDE; j++) {
            symbs_that[i][j] = new symb(i, j, cell[j]);
            symbs_that[i][j].his = false;
        }
    }
}, false);

// слушатель события load
// запускает игру
window.addEventListener("load", function() {
    base.update(); // проверяем что в базе на сервере
    thisMoveInd.style.display = 'none';
    setTimeout(function() { // спустя секунду (время на обмен)
        if (Object.keys(values).length == 0) { // если локальная база пуста после обновления
            screens.show(1); // показать первый экран
        } else { // иначе (если база обновилась данными, а значит кто-то уже создал игру)
            first = false; // делаем себя не первым
            values.second = true; // записываем что второй игрок подключился
            window.dispatchEvent(start_game);
            //waitingBlock.style.display='none';
            context = document.getElementById("canvas0").getContext("2d");
        }
    }, 1000);
});

// слушатель события начала игры
window.addEventListener("start_game", function() {
    screens.show(2); // показываем второй экран (с полями)
    standShips(); // ставим корабли (в базу)
    createRects(); // создаем клетки и туда же расставленные корабли
    drawPole(0); // рисуем первое поле
    drawPole(1); // рисуем второе поле
    updating = setInterval(function() { // на интервал ставим проверку соединения соперника и обновление базы
        base.update();
        if (Object.keys(values).length == 0) { // когда соперник нажмет "выйти" показать что соответствующий индикатор и прервать обновление
            indicators.show('disconnectBlock');
            clearInterval(updating);
        }
    }, 1000);
    $('#indicators').fadeIn(300);
    base.send(); // отправлем данные на сервер
});

// слушатель события click по игровому полю
// записывается отдельной функцией, потому что этот обработчик будет накидываться и сниматься в зависимости от того, чей сейчас ход - твой или соперника.
function canvasClick() { // обрабатываем клики мышью
    thisMove = (values.move == 'first' && first) || (values.move == 'second' && !first); // узнаем чей ход
    if ((~event.target.id.indexOf('0') && first) || (~event.target.id.indexOf('1') && !first) || !thisMove) return; // если щелчок не по полю соперника, то выход
    leftPosisiton = Math.floor((event.pageX - this.offsetLeft) / SIZE); // высчитываем координаты щелчка относительно поля измеряя растояние размером клетки и выбираем рабочее поле
    topPosisiton = Math.floor((event.pageY - this.offsetTop - 50) / SIZE);
    if (first) cell = values.secondPlane[topPosisiton];
    else cell = values.firstPlane[topPosisiton];
    if (cell[leftPosisiton].substr(4, 1) === '1') return; // если на клетке уже что-то отмечено, то выход
    var id = cell[leftPosisiton].substr(0, 2)
    if (id !== '00') { // если клетка содержит палубу корабля рисуем нолик, ставим в базу, проходим по полю, чтобы проверить не потоплен ли корабль
        symbs_that[topPosisiton][leftPosisiton].draw(false);
        cell[leftPosisiton] = cell[leftPosisiton].substr(0, 4) + '1';
        planePassage();
    } else if (id === '00') { // если пустая клетка то рисуем туда крестик и записываем это в базу
        symbs_that[topPosisiton][leftPosisiton].draw(true);
        cell[leftPosisiton] = cell[leftPosisiton].substr(0, 4) + '1';
        thisMove = false; // записываем что ход не свой
        if (first) values.move = 'second'; // записываем в базу чей сейчас ход
        else values.move = 'first';
    }
    base.send();
}
// слушатель события click по кнопке выхода
exit.addEventListener('click', function() {
    base.clear();
    screens.show(3);
    $('#indicators').fadeOut(300);
});

// слушатель события click по кнопке "Старт"
start.addEventListener('click', function() {
    // base.send();
    first = true;
    values.first = true;
    values.move = 'first';
    indicators.show('waitingBlock');
    //$('#waitingBlock').fadeIn(500);
    window.dispatchEvent(start_game);
});