var SIZE = 25, // размер клетки
	SIDE = 10, // размер поля
	pole = {}, // поле
	values = {}, // база значений, синхронизируемая с базой mysql 
	ships = {}, // корабли 
	OFFSET_VAL = 0.15, // отступ для символа
	OFFSET = SIZE * OFFSET_VAL,
	this_move = false, // текущий ли ход
	connect_opponent = false, // подключился ли оппонент
	first = false, // первым ли является игрок
	rects = [], // создаем массив клеток и  массивы с символами
	symbs_this = [],
	symbs_that = [],
	updating = '', // глобальный таймер (чтобы выключать из других функций)
	connect = new Event("connect"), // переменная события connect
	end_game = new CustomEvent("end_game", {
    detail: {
        winner: true
    }
}),
	start_game = new CustomEvent("start_game", {
    detail: {
        winner: true
    }
});

//		что какое число обозначает в коде:
//  
//   ____2___ __1_ __1_ __1_
//      id     len kill  bite 
//
//

// пустое поле
var clearPlane = [
    ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000']
];

function Base() {
    // объект базы
    // 

    // отправка данных на сервер.
    // через json конвертим локальный объект и передаем php-скрипту через ajax 
    this.send = function() {
        var jsonValue = {
            submit: JSON.stringify(values).replace(/"/g, '\"')
        }
        $.post(
            'send.php', jsonValue,
            function(data) {
                $('#ind').append(data);
            }
        )
    }

    // получение данных с сервера.
    // через ajax из php-скрипта получаем объект из базы, конвертируя json.
    // исходя из полученной информации смотрим подключился ли кто-то, закончилась ли игра и чей ход 
    this.update = function() {
        $.post(
            'update.php', '',
            function(data) {
                values = JSON.parse(data);
            }
        )
        if ((first && values.second && !connect_opponent) || (!first && values.first && !connect_opponent)) { // если второй игрок записал true в базу при connect_opponent=false (когда подключения еще не было)

            window.dispatchEvent(connect); // генерим событие connect
            connect_opponent = !connect_opponent;
        }
        if (values.end) { // проверяем закончилась ли игра
            clearInterval(updating);
            end_game.detail.winner = false;
            window.dispatchEvent(end_game);
        }
        if ((first && values.move === 'first' && values.second) || (!first && values.move === 'second' && values.first)) { // если ход твой
            thisMoveInd.className = 'indVisible'; // меняем информацию в индикаторе
            indText.innerHTML = 'Твой ход';
            canvas0.onclick = canvasClick; // навешиваем обработчики события
            canvas1.onclick = canvasClick;
        } else { // иначе, если ход не твой
            thisMoveInd.className = 'indHide'; // меняем информацию в индикаторе
            indText.innerHTML = 'Не твой ход'; // навешиваем обработчики события
            canvas0.onclick = '';
            canvas1.onclick = '';
        }
        thisPlanePassage();
        return values;
    }

    // очистка данных на сервере.
    // через ajax запускаем php-скрипт, записывающий в базу "{}".
    this.clear = function() {
        $.post(
            'clear.php', '',
            function(data) {}
        )
    }
}
var base = new Base();


// объект символа
// хранит свойства положения, содержания, 
// свойство his, показывающее символ текущего игрока рисуется или нет, и
// свойство Drawn, показывающее, нарисован ли уже данный символ.
// А так же метод рисования draw.
function symb(y, x, value) { // символ 
    this.x = x; // свойства положения и значения
    this.y = y;
    this.value = value;
    this.his = '';
    this.Drawn = false;
    this.draw = function(cross) { // метод рисования
        // выбираем, на каком поле рисовать
        if (first && this.his) cell = values.firstPlane[this.y]; // если первый игрок и это символ на его поле, то первое поле
        else if (!first && this.his) cell = values.secondPlane[this.y]; // если второй игрок и это символ на его поле, то второе поле
        else if (first && !this.his) cell = values.secondPlane[this.y]; // если первый игрок и это символ на чужом поле, то второе поле
        else if (!first && !this.his) cell = values.firstPlane[this.y]; // если второй игрок и это символ на чужом поле, то первое поле
        if (cell[this.x].substr(0, 2) == '00' && !cross) return; // если мы хотим нарисовать в клетку, которая не занята кораблем, символ крестика, то не делаем этого 
        symbSizeY = SIZE * this.y; // размер символа 
        symbSizeX = SIZE * this.x; //
        context.beginPath(); // рисование в canvas 
        if (cross) { // крестик
            context.moveTo(symbSizeX + OFFSET, symbSizeY + OFFSET);
            context.lineTo(symbSizeX + SIZE * (1 - OFFSET_VAL), symbSizeY + SIZE * (1 - OFFSET_VAL));
            context.moveTo(symbSizeX + OFFSET, symbSizeY + SIZE * (1 - OFFSET_VAL));
            context.lineTo(symbSizeX + SIZE * (1 - OFFSET_VAL), symbSizeY + OFFSET);
        } else context.arc(symbSizeX + (SIZE / 2), symbSizeY + (SIZE / 2), SIZE / 2 - OFFSET, 0, Math.PI * 2, false); // кружок 
        context.closePath();
        context.strokeStyle = "#000";
        context.stroke();
    };
}
symb.prototype.constructor = symb;

// объект клетки
// хранит свойства положения
// А так же метод рисования draw.
function rect(y, x) { // клетка 
    this.x = x; // свойства положения 
    this.y = y;
    this.draw = function() { // метод рисования
        context.fillStyle = '#000'; // рисование в canvas 
        context.strokeStyle = '#585858'; // рисование в canvas 
        context.strokeRect(SIZE * this.y, SIZE * this.x, SIZE, SIZE);
    };
}
rect.prototype.constructor = rect;

// объект клетки
// хранит свойства длины и id (расшифровка id в начале файла)
function Ship(id, length) {
    this.length = length;
    this.id = id;
}
Ship.prototype.constructor = Ship;
// создаем все корабли
// 1 четырехпалубный
// 2 трехпалубных
// 3 двухпалубных
// 4 однопалубных
ships.ship4deck = new Ship('01', 4);
ships.ship3deck1 = new Ship('02', 3);
ships.ship3deck2 = new Ship('03', 3);
ships.ship2deck1 = new Ship('04', 2);
ships.ship2deck2 = new Ship('05', 2);
ships.ship2deck3 = new Ship('06', 2);
ships.ship1deck1 = new Ship('07', 1);
ships.ship1deck2 = new Ship('08', 1);
ships.ship1deck3 = new Ship('09', 1);
ships.ship1deck4 = new Ship('10', 1);


// функция расстановки кораблей
// на чистое поле расставляем корабли в случайные места.
// для каждого корабля алгоритм тыкает в случайную клетку. 
// далее он смотрит, сможет ли он поместиться по направлению вниз или вправо
// (смотрит не только площадь самого корабля, толщиной в одну клетку, но и по одной клетке с каждой стороны)
// и записывает эти возможности в переменные clearHor и clearVert.
// после по выбранному направлению записывает значение в values 
function standShips() {
    var plane = JSON.parse(JSON.stringify(clearPlane)); // делаем независимую копию массива чистого поля
    var clear = true;
    for (n in ships) { // проходим по кораблям
        cellValue = ships[n].id + ships[n].length + '00'; // создаем его код (расшифровка кода в начале файла)
        random: for (;;) { // бесконечный цикл, прерывается он по условию внутри цикла
            var rndX = randomInteger(0, SIDE - 1); // случайные значения
            var rndY = randomInteger(0, SIDE - 1);
            clearHor = true;
            clearVert = true;
            roundHor: for (var i = rndY - 1; i <= rndY + 1; i++) { // смотрим есть ли что вокруг места по ГОРИЗОНТАЛИ
                if (i < 0) continue; // если вышли за верхнюю границу, то можно продолжать (ставим у границы)
                if (i > SIDE - 1 && i == rndY + 1) { // если вышли за нижнюю, но это последняя палуба из серии, то продоложаем
                    continue;
                } else if (i > SIDE - 1) { // если вышли за нижнюю, то обрываем цикл
                    clearHor = false;
                    break;
                }
                var cell = plane[i];
                for (var j = rndX - 1; j < rndX + ships[n].length + 1; j++) {
                    if (j < 0) continue; // если вышли за левую границу, то можно продолжать (ставим у границы)
                    if (j > SIDE - 1 && j == rndX + ships[n].length + 1) { // если вышли за правую, но это последний из серии, то продоложаем
                        continue;
                    } else if (j > SIDE - 1) { // если вышли за правую, то обрываем цикл
                        clearHor = false;
                        break roundHor;
                    }
                    if (cell[j] > 0) { // если есть запись в массиве, то заканчиваем цикл по текущему направлению
                        clearHor = false;
                        break roundHor;
                    }
                }
            }
            roundVert: for (var i = rndY - 1; i < rndY + ships[n].length + 1; i++) { // смотрим есть ли что вокруг места по ВЕРТИКАЛИ
                if (i < 0) continue; // если вышли за верхнюю границу, то можно продолжать (ставим у границы)
                if (i > SIDE - 1 && i == rndY + ships[n].length + 1) { // если вышли за нижнюю, но это последний из серии, то продоложаем
                    continue;
                } else if (i > SIDE - 1) { // если вышли за нижнюю, то обрываем цикл
                    clearVert = false;
                    break;
                }
                var cell = plane[i];
                for (var j = rndX - 1; j <= rndX + 1; j++) {
                    if (j < 0) continue; // если вышли за верхнюю границу, то можно продолжать (ставим у границы)
                    if (j > SIDE - 1 && j == rndX + 1) { // если вышли за правую, но это последний из серии, то продоложаем
                        continue;
                    } else if (j > SIDE - 1) { // если вышли за правую, то обрываем цикл
                        clearVert = false;
                        break roundVert;
                    }
                    if (cell[j] > 0) { // если есть запись в массиве, то заканчиваем цикл по текущему направлению
                        clearVert = false;
                        break roundVert;
                    }
                }
            }
            // далее смотрим. возможно поле чисто по какому-то из направлений. 
            // если это так, то ставим туда корабль и обрываем цикл. 
            // возможно оба направления свободны. тогда решаем случайно. иначе продолжаем поиски.
            if (clearHor && clearVert) {
                if (randomInteger(0, 1) == 1) { // по горизонтали
                    var cell = plane[rndY];
                    for (var i = rndX; i < rndX + ships[n].length; i++) {
                        cell[i] = cellValue;
                    }
                } else { // по вертикали
                    for (var i = rndY; i < rndY + ships[n].length; i++) {
                        var cell = plane[i];
                        cell[rndX] = cellValue;
                    }
                }
            } else if (clearVert) { // по вертикали
                for (var i = rndY; i < rndY + ships[n].length; i++) {
                    var cell = plane[i];
                    cell[rndX] = cellValue;
                }
            } else if (clearHor) { // по горизонтали
                var cell = plane[rndY];
                for (var i = rndX; i < rndX + ships[n].length; i++) {
                    cell[i] = cellValue;
                }
            } else continue;
            break;
        }
    }
    if (first) {
        values.firstPlane = JSON.parse(JSON.stringify(plane)); //
    } else {
        values.secondPlane = JSON.parse(JSON.stringify(plane)); //
    }
}

// функция случайного значения из диапазона
function randomInteger(min, max) {
    var rand = min - 0.5 + Math.random() * (max - min + 1)
    rand = Math.round(rand);
    return rand;
}

// проход по полю в целях обнаружения убитых кораблей
// если клетка занята, проверяется, все ли палубы подбиты
// если все, то запускается функция маркировки корабля и поля вокруг него крестиками
// так же ведется счетчик подбитых кораблей.
// если все корабли подбиты - поздравляем
function planePassage() {
    var numKilledShips = 0;
    if (first) plane = values.secondPlane; // выбираем поле
    else plane = values.firstPlane;
    for (var i = 0; i < SIDE; i++) {
        var cell = plane[i];
        for (var j = 0; j < SIDE; j++) {
            if (cell[j].substr(0, 2) !== '00') {
                if (shipPassage(i, j, plane)) {
                    markedKilled(i, j, plane, shipPassage(i, j, plane), parseInt(cell[j].substr(2, 1)));
                    numKilledShips++;
                }
            }
        }
    }
    if (numKilledShips === Object.keys(ships).length) {
        clearInterval(updating);
        values.end = true;
        base.send();
        end_game.detail.winner = true;
        window.dispatchEvent(end_game); // генерим событие end
    }
}

// проход по кораблю, с целью узнать все ли палубы подбиты
// возвращает false, если натыкается на целую палубу
// в случае, если количество подбитых палуб равно 
// длине корабля возвращает направление корабля
function shipPassage(y, x, plane) {
    var direct = '',
		cell = plane[y],
		l = 0;
    for (var i = x; i < SIDE; i++) { // попытка прохода по горизонтали
        if (cell[i].substr(0, 2) == '00') break; // если это пустая клетка
        direct = 'hor';
        if (cell[i].substr(4, 1) == '0') return false; // если палуба корабля не бита
        l++;
    }
    cell = plane[y];
    if (l == parseInt(cell[x].substr(2, 1))) return direct;
    var l = 0;
    for (var i = y; i < SIDE; i++) { // попытка прохода по вертикали
        cell = plane[i];
        if (cell[x].substr(0, 2) == '00') break; // если это пустая клетка
        direct = 'vert';
        if (cell[x].substr(4, 1) == '0') return false; // если палуба корабля не бита
        l++;
    }

    // если длина корабля равна длине в его коде, то возвращается true.
    // иначе возвращается false
    // сделано для того, чтобы исключить случаи прохода из середины корабля  
    cell = plane[y]; // (берется любая клетка, для выяснения значения длины)
    if (l == parseInt(cell[x].substr(2, 1))) return direct;
    return false;
}

// функция маркировки корабля и поля вокруг него крестиками.
// в зависимости от направления заполняем область корабля + по клетке с каждой стороны крестиками и заносим в базу изменения
function markedKilled(y, x, plane, direct, length) {
    if (direct === 'vert') {
        for (var i = y - 1; i < y + length + 1; i++) {
            if (i < 0 || i > SIDE - 1) continue;
            for (var j = x - 1; j <= x + 1; j++) {
                if (j < 0 || j > SIDE - 1) continue;
                if (plane[i][j].substr(4, 1) === '1' && plane[i][j].substr(0, 2) === '00') continue;
                symbs_that[i][j].draw(true);
                plane[i][j] = plane[i][j].substr(0, 4) + '1';
            }
        }
    } else {
        for (var i = y - 1; i < y + 1 + 1; i++) {
            if (i < 0 || i > SIDE - 1) continue;
            for (var j = x - 1; j <= x + length; j++) {
                if (j < 0 || j > SIDE - 1) continue;
                if (plane[i][j].substr(4, 1) === '1' && plane[i][j].substr(0, 2) === '00') continue;
                symbs_that[i][j].draw(true);
                plane[i][j] = plane[i][j].substr(0, 4) + '1';
            }
        }
    }
}

// функция разметки собственного поля действиями соперника.
// выбираем поле и меняем контекст для рисования
function thisPlanePassage() {
    if (!values.move) return;
    if (first) {
        context = document.getElementById("canvas0").getContext("2d");
        plane = values.firstPlane;
    } else {
        context = document.getElementById("canvas1").getContext("2d");
        plane = values.secondPlane;
    }
    for (var i = 0; i < SIDE; i++) { // проходим по полю
        cell = plane[i];
        for (var j = 0; j < SIDE; j++) {
            if (cell[j].substr(4, 1) === '1') { // если записано, что клетка битая, то сначала, если есть, ставим знак корабля, а потом, вне зависимости от этого рисуем крест
                if (symbs_this[i][j].drawn) continue; // если клетка уже отмечена, то переходим к следующей
                if (cell[j].substr(0, 2) !== '00') symbs_this[i][j].draw(true);
                symbs_this[i][j].draw(true);
                symbs_this[i][j].drawn = true; // указываем что клетка отмечена
            }
        }
    }
    // меняем контекст обратно
    if (first) context = document.getElementById("canvas1").getContext("2d");
    else context = document.getElementById("canvas0").getContext("2d");
    this_move = values.move; // записываем чей текущий ход
}


// функция создания массивов клеток и смиволов
function createRects() { // изменение поля
    var cell = '';
    for (var i = 0; i < SIDE; i++) {
        rects[i] = [];
        symbs_this[i] = [];
        if (first) cell = values.firstPlane[i]; // если игрок первый записываем значения из соответствующего массива 
        else cell = values.secondPlane[i]; // иначе из оставшегося
        for (var j = 0; j < SIDE; j++) {
            rects[i][j] = new rect(i, j);
            symbs_this[i][j] = new symb(i, j, cell[j]);
            symbs_this[i][j].his = true;
        }
    }
}