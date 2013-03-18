
  var adv = {
    setupForm: setupForm,
    getCurentNumber: getCurentNumber,
    setupMain: setupMain,
    buildTable: buildTable,
    sendForm: sendForm,
    tableSorting: tableSorting,
    exportTXT: exportTXT,
    backup: backup,
    correctorShow: correctorShow,
    editable: editable,
    nextNumber: nextNumber,
    deleteOldAdv: deleteOldAdv,
    statistica: statistica
  }

  // Проверка номера для приема объявлений
  function getCurentNumber(cssElement) {
    var curentNumber = parseInt($(cssElement).html());
    if (isNaN(curentNumber)) {
      alert('Установите номер для приема объявлений!');
      return false;
    }
    return curentNumber;
  }

  // Строим строку в таблице
  function buildTable(data, action) {
    var type = {"normal":"&nbsp;","bold":"Жирный","frame":"Рамка"};
    var muted = '';
    if ((data.begin + data.count) < adv.curentNumber) muted = ' class="muted"';
    var tableTd = '<td' + muted + '>' + data.rubrika + '</td><td' + muted + '>' + data.content +
      '</td><td' + muted + '>' + type[data.type] + '</td><td' + muted + '>' +
      data.begin + '</td><td title="' + (data.begin + data.count) + '"' + muted + '>' + (data.count + 1) + '</td>';
    var tableTr = '<tr data-id="' + data.id + '">' + tableTd + '</tr>';
    if (action == 'append')
      $('tbody').append(tableTr);
    else if (action == 'prepend')
      $('tbody').prepend(tableTr);
    else
      return tableTd;
  }

  // Вызывается один раз при загрузке страницы
  function setupMain() {
    // Навешиваем события по data-click
    $('a[data-click]').click(function () {
      adv[$(this).data('click')]();
      return false;
    });
    $.ajax({
      url: 'rpc',
      dataType: 'json',
      cache: false,
      type: 'post',
      sync: true,
      data: {"action":"all"},
      success: function (data, textStatus) {
        console.log('AJAX result: ' + textStatus);
        adv.count = data.length;

        // Строим таблицу
        for (var i = 0; i < adv.count; i++) {
          adv.buildTable(data[i], 'prepend');
        }

        // Навешиваем возможность правки
        adv.editable('tbody > tr');

        // Отображаем количество объявлений
        $('#length').html(adv.count);

        // Привязываем кнопку к отправке формы
        $('.well button').click(function() {
          adv.sendForm('.well');
        });

        // Инициализируем главный массив
        adv.classified = data;

        // Навешиваем пересортировку таблицы по номеру, рубрике и алфавиту
        $('#unselectable').dblclick(function() {
          adv.tableSorting();
        });

      },
      error: function (e, textError) {
        alert(textError);
      }
    });
  }

  function sendForm(element) {
    var currentElement = $(element);
    // Защита от повторного нажатия
    currentElement.find('button').attr('disabled', 'disabled');
    // Пустая форма отправки
    if (currentElement.find('textarea').val() == '') {
      alert('Введите текст объявления');
      currentElement.find('button').removeAttr('disabled');
      return false;
    }
    var newAdv = new Adv(currentElement);

    // Проверка совпадений номеров телефонов
    var phones = newAdv.content;
    phones = phones.match(/\d{2,3}-\d{2}-\d{2}|\(\d{5}\)\s\d{3}-\d{2}/g);// XX?-XX-XX || (XXXXX) XXX-XX
    var singleOwner = [];
    if (phones) {
      for (var i = 0; i < adv.count; i++) {
        for (var n = 0; n < phones.length; n++) {
          if ((adv.classified[i].begin + adv.classified[i].count) >= adv.curentNumber
          && adv.classified[i].content.indexOf(phones[n]) != -1) {
            singleOwner.push({"id": adv.classified[i].id, "key": i});
          }
        }
      }
      // Если есть совпадения!
      if (singleOwner.length > 0) {
        var textConfirm = ['СОВПАДЕНИЕ НОМЕРОВ ТЕЛЕФОНОВ! ПРОДОЛЖИТЬ?'];
        for (var i = 0; i < singleOwner.length; i++) {
          console.log(singleOwner[i]);
          var key = singleOwner[i].key;
          textConfirm.push(adv.classified[key].content);
        }
        if (!confirm(textConfirm.join('\n\n'))) {
          // !Продолжить = остановить
          currentElement.find('button').removeAttr('disabled');
          for (var i = 0; i < singleOwner.length; i++) {
            $('tbody tr[data-id="' + singleOwner[i].id + '"]').addClass('info');
          }
          return false;
        }
      }
    }

    $.ajax({
      url: 'rpc',
      dataType: 'json',
      cache: false,
      type: 'post',
      data: newAdv,
      success: function (data, textStatus) {
        console.log('AJAX result: ' + textStatus);
        newAdv.id = parseInt(data.id);
        if (isNaN(newAdv.id)) document.location.reload();// При пакетном добавлении
        adv.buildTable(newAdv, 'prepend');
        adv.classified.push(newAdv);
        adv.count = adv.classified.length;
        $('#length').html(adv.count);
        adv.editable('tr[data-id="' + newAdv.id + '"]');
        currentElement.find('button').removeAttr('disabled');
        $('tbody tr').removeClass('info');//Если было совпадение телефонов
        adv.setupForm();
      },
      error: function (e, textError) {
        alert(textError);
      }
    });
  }

  // Вызывается всякий раз после добавления объявления и при загрузке страницы
  function setupForm() {
    $('.well textarea').val('');
    $('.well select[name="count"] option[value="0"]').attr('selected', 'selected');
    $('.well label input[value="normal"]').attr('checked', 'checked');
    $('#list2, #list3').empty();
    $('#list1 option').removeAttr('selected');
    syncList1.sync("list1","list2","list3");
    $('.well textarea').focus();
  }

  // Получаем данные из формы
  function Adv(element, id) {
    this.id = id || null;
    this.content = $.trim(element.find('textarea').val().clearSpace());
    this.count = parseInt(element.find('select[name="count"] option:selected').val());
    this.type = element.find('input:radio[name="type"]:checked').val();
    this.begin = parseInt(element.find('input[name="begin"]').val());
    this.rubrika = element.find('select[name="rubrika"] option:selected').val();
  }

  // Строим пересортированную таблицу
  function tableSorting() {
    $('tbody').empty();
    adv.classified = sortingByNRC(adv.classified);
    for (var i = 0; i < adv.count; i++) {
      adv.buildTable(adv.classified[i], 'append');
    }
    // Навешиваем события
    adv.editable('tbody > tr');
  }


  // Выдает отсортированный объект. NRC - number, rubrika, content
  function sortingByNRC(data) {
    data.sort(sortByContent);
    var number = [];
    var rubrika = [];
    for (var i = 0; i < adv.count; i++) {
      number.push(data[i].begin);
      rubrika.push(data[i].rubrika);
    }
    number = number.unique().sort();
    rubrika = rubrika.unique().sort(sortByText);
    var adv_temp = [];
    for (var i = 0; i < number.length; i++) {    // each number
      for (var k = 0; k < rubrika.length; k++) { // each rubrika
        for (var n = 0; n < adv.count; n++) {   // all array
          if (data[n].rubrika == rubrika[k]) {
            if (data[n].begin == number[i]) {
              adv_temp.push(data[n]);
            }
          }
        }
      } 
    }
    return adv_temp;
  }


  // Вывод для верстки
  function exportTXT() {
    adv.classified = sortingByRC(adv.classified);
    var n = 0;
    var type = {"normal":"","bold":"ЖИРНЫЙ ","frame":"РАМКА "};
    var advByParagraph = ['Объявления ' + adv.curentNumber];
    for (var i = 0; i < adv.count; i++) {
      if ((adv.classified[i].begin + adv.classified[i].count) >= adv.curentNumber) {
        while (adv.exportRubrika[n].rubrika <= adv.classified[i].rubrika) {
          if (adv.exportRubrika[n].required || adv.exportRubrika[n].rubrika == adv.classified[i].rubrika) {
            advByParagraph.push(adv.exportRubrika[n].headline);
          }
          n++;
        }
        advByParagraph.push(type[adv.classified[i].type] + adv.classified[i].content);
      }
    }
    $('#hide').empty().append('<form action="export" method="post">' +
      '<input type="hidden" name="filename" value="classified_' + adv.curentNumber + '.txt" />' +
      '<textarea name="data">' + advByParagraph.join('\n') + '</textarea>' +
      '</form>');
    $('#hide form').submit();
    return false;
  }

  adv.exportRubrika = [{"required":true,"rubrika":"100","headline":"Недвижимость\t1"},{"required":true,"rubrika":"110","headline":"Продажа\t1.1"},{"required":false,"rubrika":"111","headline":"квартиры\t1.1.1"},{"required":false,"rubrika":"112","headline":"дома\t1.1.2"},{"required":false,"rubrika":"113","headline":"дачи, участки\t1.1.3"},{"required":true,"rubrika":"120","headline":"Куплю\t1.2"},{"required":false,"rubrika":"121","headline":"квартиры\t1.2.1"},{"required":false,"rubrika":"122","headline":"дома\t1.2.2"},{"required":false,"rubrika":"123","headline":"дачи, участки\t1.2.3"},{"required":true,"rubrika":"130","headline":"Аренда\t1.3"},{"required":false,"rubrika":"131","headline":"сдам\t1.3.1"},{"required":false,"rubrika":"132","headline":"сниму\t1.3.2"},{"required":true,"rubrika":"140","headline":"Обмен\t1.4"},{"required":false,"rubrika":"141","headline":"местный\t1.4.1"},{"required":false,"rubrika":"142","headline":"междугородный\t1.4.2"},{"required":false,"rubrika":"150","headline":"Деловая\t1.5\nнедвижимость"},{"required":true,"rubrika":"200","headline":"Оборудование\t2"},{"required":false,"rubrika":"210","headline":"Продам\t2.1"},{"required":false,"rubrika":"220","headline":"Куплю\t2.2"},{"required":true,"rubrika":"300","headline":"Сырье\t3\nи материалы"},{"required":false,"rubrika":"310","headline":"Продам\t3.1"},{"required":false,"rubrika":"320","headline":"Куплю\t3.2"},{"required":true,"rubrika":"400","headline":"Супермаркет\t4"},{"required":true,"rubrika":"410","headline":"Продам\t4.1"},{"required":false,"rubrika":"411","headline":"мебель\t4.1.1"},{"required":false,"rubrika":"412","headline":"техника\t4.1.2"},{"required":false,"rubrika":"413","headline":"одежда, ткани\t4.1.3"},{"required":false,"rubrika":"414","headline":"книги\t4.1.4"},{"required":false,"rubrika":"415","headline":"продукты питания\t4.1.5"},{"required":false,"rubrika":"416","headline":"спорттовары\t4.1.6"},{"required":false,"rubrika":"417","headline":"товары для детей\t4.1.7"},{"required":false,"rubrika":"418","headline":"муз. инструменты\t4.1.8"},{"required":false,"rubrika":"419","headline":"другое\t4.1.9"},{"required":true,"rubrika":"420","headline":"Куплю\t4.2"},{"required":false,"rubrika":"421","headline":"мебель\t4.2.1"},{"required":false,"rubrika":"422","headline":"техника\t4.2.2"},{"required":false,"rubrika":"423","headline":"одежда, ткани\t4.2.3"},{"required":false,"rubrika":"424","headline":"книги\t4.2.4"},{"required":false,"rubrika":"425","headline":"продукты питания\t4.2.5"},{"required":false,"rubrika":"426","headline":"спорттовары\t4.2.6"},{"required":false,"rubrika":"427","headline":"товары для детей\t4.2.7"},{"required":false,"rubrika":"428","headline":"муз. инструменты\t4.2.8"},{"required":false,"rubrika":"429","headline":"другое\t4.2.9"},{"required":true,"rubrika":"500","headline":"Живой мир\t5"},{"required":false,"rubrika":"510","headline":"Предложение\t5.1"},{"required":false,"rubrika":"520","headline":"Спрос\t5.2"},{"required":true,"rubrika":"600","headline":"Работа\t6"},{"required":false,"rubrika":"610","headline":"Требуются\t6.1"},{"required":false,"rubrika":"620","headline":"Ищу\t6.2"},{"required":true,"rubrika":"700","headline":"Услуги\t7"},{"required":true,"rubrika":"710","headline":"Предложение\t7.1"},{"required":false,"rubrika":"711","headline":"ремонт и строительство\t7.1.1"},{"required":false,"rubrika":"712","headline":"медицина\t7.1.2"},{"required":false,"rubrika":"713","headline":"образование\t7.1.3"},{"required":false,"rubrika":"714","headline":"отдых и туризм\t7.1.4"},{"required":false,"rubrika":"715","headline":"другое\t7.1.5"},{"required":true,"rubrika":"720","headline":"Спрос\t7.2"},{"required":false,"rubrika":"721","headline":"ремонт и строительство\t7.2.1"},{"required":false,"rubrika":"722","headline":"медицина\t7.2.2"},{"required":false,"rubrika":"723","headline":"образование\t7.2.3"},{"required":false,"rubrika":"724","headline":"отдых и туризм\t7.2.4"},{"required":false,"rubrika":"725","headline":"другое\t7.2.5"},{"required":true,"rubrika":"800","headline":"Транспорт\t8"},{"required":true,"rubrika":"810","headline":"Продам\t8.1"},{"required":false,"rubrika":"811","headline":"автомобили\t8.1.1"},{"required":false,"rubrika":"812","headline":"запчасти\t8.1.2"},{"required":false,"rubrika":"813","headline":"гаражи\t8.1.3"},{"required":false,"rubrika":"814","headline":"катера и яхты\t8.1.4"},{"required":false,"rubrika":"815","headline":"с/х техника\t8.1.5"},{"required":false,"rubrika":"816","headline":"другое\t8.1.6"},{"required":true,"rubrika":"820","headline":"Куплю\t8.2"},{"required":false,"rubrika":"821","headline":"автомобили\t8.2.1"},{"required":false,"rubrika":"822","headline":"запчасти\t8.2.2"},{"required":false,"rubrika":"823","headline":"гаражи\t8.2.3"},{"required":false,"rubrika":"824","headline":"катера и яхты\t8.2.4"},{"required":false,"rubrika":"825","headline":"с/х техника\t8.2.5"},{"required":false,"rubrika":"826","headline":"другое\t8.2.6"},{"required":true,"rubrika":"910","headline":"Знакомства\t9"},{"required":false,"rubrika":"920","headline":"Мужчины\t9.2"},{"required":false,"rubrika":"930","headline":"Женщины\t9.3"},{"required":false,"rubrika":"A00","headline":"Деловые\tА\nпредложения"},{"required":false,"rubrika":"B00","headline":"Разное\tБ"},{"required":false,"rubrika":"ZZZ","headline":"Эта строчка нужна для цикла while"}];

  // Сохранить резервную копию
  function backup() {
    var today = new Date();
    var filename = 'classified_' + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '.json';
    $('#hide').empty().append('<form action="export" method="post">' +
      '<input type="hidden" name="filename" value="' + filename + '" />' +
      '<textarea name="data">' + JSON.stringify(adv.classified) + '</textarea>' +
      '</form>');
    $('#hide form').submit();
    return false;
  }

  // Следующий номер
  function nextNumber() {
    if (confirm('Назначить для приема объявлений\nследующий номер?'))
      document.location.href = "num?number=" + (adv.curentNumber + 1);
  }


  // Вывод окна для распечатки корректору: только текущий номер
  function correctorShow() {
    adv.classified = sortingByNRC(adv.classified);
    var tableData = [];
    for (var i = 0; i < adv.count; i++) {
      if (adv.classified[i].begin == adv.curentNumber) {
        tableData.push('<p><span>' + adv.classified[i].rubrika + '</span>&nbsp;&nbsp;' + adv.classified[i].content + '</p>');
      }
    }
    $('#corrector > div').append(tableData.join(''));
    $('#corrector').show();
    $('#main').hide();
    $('#link-to-main').click(function() {
      $('#main').show();
      $('#corrector > div').empty();
      $('#corrector').hide();
      return false;
    });
  }


  function editable(element) {
    $(element).bind('click', function() {
      var currentAdv = $(this);
      currentAdv.toggle();
      var id = currentAdv.data('id');
      // Находим значение ключа массива по записи id
      var findId = function(id) {
        for (var i = 0; i < adv.count; i++) {
          if (adv.classified[i].id == id) return i;
        }
      }
      var positionInArray = findId(id);
      currentAdv.after('<tr id="zone' + id + '"><td colspan="5"><div class="row">' + $('#top-form').clone().html() + '</div><div class="pull-right"><button id="submit' + id + '" class="btn btn-success btn-large">Сохранить</button> <button type="button" class="btn btn-large" id="cancel' + id + '">Отменить</button></div>' + $('#selectRubrika').clone().html() + '</td></tr>');
      var editZone = $('#zone' + id);
      editZone.find('textarea').html(adv.classified[positionInArray].content);
      editZone.find('select[name="count"] option[value="' + adv.classified[positionInArray].count + '"]').attr('selected', 'selected');
      editZone.find('select[name="rubrika"] option[value="' + adv.classified[positionInArray].rubrika + '"]').attr('selected', 'selected');
      editZone.find('input[value="' + adv.classified[positionInArray].type + '"]').attr('checked', 'checked');
      editZone.find('input[name="begin"]').val(adv.classified[positionInArray].begin);
      $('#cancel' + id).bind('click', function() {
        currentAdv.css('background-color', 'WhiteSmoke');
        currentAdv.toggle();
        editZone.remove();
        currentAdv.animate({backgroundColor: 'transparent'}, 'slow');
      });
      $('#submit' + id).bind('click', function() {
        adv.classified[positionInArray] = new Adv(editZone, id);
        currentAdv.html(adv.buildTable(adv.classified[positionInArray]));
        editZone.remove();
        currentAdv.css('background-color', '#ffee99');
        currentAdv.toggle();
        currentAdv.animate({backgroundColor: 'transparent'}, 2000);
        $.ajax({
          url: 'rpc',
          dataType: 'json',
          cache: false,
          data: adv.classified[positionInArray],
          type: 'post',
          success: function (data, textStatus) {
            console.log('AJAX result: ' + textStatus);
          },
          error: function (e, textError) {
            alert(textError);
          }
        });       
      });
    });
  }

  function deleteOldAdv() {
    if (confirm('Удалить безвозвратно старые объявления?'))
      document.location.href = "del";
  }

  // Выдает отсортированный объект. RC - rubrika, content
  function sortingByRC(data) {
    data.sort(sortByContent);
    var rubrika = [];
    for (var i = 0; i < adv.count; i++) {
      rubrika.push(data[i].rubrika);
    }
    rubrika = rubrika.unique().sort(sortByText);
    var adv_temp = [];
    for (var k = 0; k < rubrika.length; k++) { // each rubrika
      for (var n = 0; n < adv.count; n++) {   // all array
        if (data[n].rubrika == rubrika[k]) {
          adv_temp.push(data[n]);
        }
      }
    } 
    return adv_temp;
  }

  function statistica() {
    var n = 0;
    var m = 0;
    for (var i = 0; i < adv.count; i++) {
      if (adv.classified[i].begin == adv.curentNumber) n++;
      if (adv.classified[i].begin + adv.classified[i].count >= adv.curentNumber) m++;
    }
    alert('Всего: ' + adv.count + '\nАктуальных: ' + m + '\nНовых: ' + n);
  }



  // Вспомогательные функции для .sort()
  // Сортировка по алфавиту
  function sortByText(x, y) {
    return ((x == y) ? 0 : ((x > y) ? 1 : -1 ));
  }
  // Сортировка по алфавиту объекта по элементу content
  function sortByContent(x, y) {
    return ((x.content == y.content) ? 0 : ((x.content > y.content) ? 1 : -1 ));
  }

  // Выборка уникальных значений из массива
  Array.prototype.unique = function() {
    var a = [];
    var l = this.length;
    for (var i = 0; i < l; i++) {
      for (var j = i + 1; j < l; j++) {
        if (this[i] === this[j])
          j = ++i;
      }
      a.push(this[i]);
    }
    return a;
  };

  String.prototype.clearSpace = function() {
    data = this;
    data = data.replace(/\n|\t/g, ' ');
    data = data.replace(/\s{2,}/g, ' ');
    return data;
  };


  /*********************************************************
    www.tigir.com (дата последней модификации - 30.11.2007)
    Библиотека linkedselect.js из статьи
    "Javascript SELECT - динамические списки"
    http://www.tigir.com/linked_select.htm
    syncList - "класс" связанных списков
  **********************************************************/
  function syncList(){}
  syncList.prototype.sync = function() {
    for (var i=0; i < arguments.length-1; i++)
      document.getElementById(arguments[i]).onchange = (function (o, id1, id2) {
        return function() {
          o._sync(id1, id2);
        };
      })(this, arguments[i], arguments[i+1]);
    document.getElementById(arguments[0]).onchange();
  }
  syncList.prototype._sync = function (firstSelectId, secondSelectId) {
    var firstSelect = document.getElementById(firstSelectId);
    var secondSelect = document.getElementById(secondSelectId);
    secondSelect.length = 0;
    if (firstSelect.length>0) {
      var optionData = this.dataList[ firstSelect.options[firstSelect.selectedIndex==-1 ? 0 : firstSelect.selectedIndex].value ];
      for (var key in optionData || null)
        secondSelect.options[secondSelect.length] = new Option(optionData[key], key);
      if (firstSelect.selectedIndex == -1)
        setTimeout( function() {firstSelect.options[0].selected = true;}, 1 );
      if (secondSelect.length>0)
        setTimeout( function() {secondSelect.options[0].selected = true;}, 1 );
    }
    secondSelect.onchange && secondSelect.onchange();
  };

  // Объект связанных списков
  var syncList1 = new syncList;
  syncList1.dataList = {
    '1':{'11':'Продам', '12':'Куплю', '13':'Аренда', '14':'Обмен', '15':'Деловая недвижимость'},
    '2':{'21':'Продам', '22':'Куплю'},
    '3':{'31':'Продам', '32':'Куплю'},
    '4':{'41':'Продам', '42':'Куплю'},
    '5':{'51':'Предложение', '52':'Спрос'},
    '6':{'61':'Требуются', '62':'Ищу'},
    '7':{'71':'Предложение', '72':'Спрос'},
    '8':{'81':'Продам', '82':'Куплю'},
    '9':{'90':'Помощь в знакомстве', '91':'Мужчины', '92':'Женщины'},
    'A':{'A0':'----'},
    'B':{'B0':'----'},

    '11':{'111':'квартиры', '112':'дома', '113':'дачи, участки'},
    '12':{'121':'квартиры', '122':'дома', '123':'дачи, участки'},
    '13':{'131':'сдам', '132':'сниму'},
    '14':{'141':'местный', '142':'междугородный'},
    '15':{'150':'----'},
    '21':{'210':'----'},
    '22':{'220':'----'},
    '31':{'310':'----'},
    '32':{'320':'----'},
    '41':{'411':'мебель', '412':'техника', '413':'одежда, ткани', '414':'книги', '415':'продукты питания', '416':'спорттовары', '417':'товары для детей', '418':'муз. инструменты', '419':'другое'},
    '42':{'421':'мебель', '422':'техника', '423':'одежда, ткани', '424':'книги', '425':'продукты питания', '426':'спорттовары', '427':'товары для детей', '428':'муз. инструменты', '429':'другое'},
    '51':{'510':'----'},
    '52':{'520':'----'},
    '61':{'610':'----'},
    '62':{'620':'----'},
    '71':{'711':'ремонт и строительство', '712':'медицина', '713':'образование', '714':'отдых и туризм', '715':'другое'},
    '72':{'721':'ремонт и строительство', '722':'медицина', '723':'образование', '724':'отдых и туризм', '725':'другое'},
    '81':{'811':'автомобили', '812':'запчасти', '813':'гаражи', '814':'катера и яхты', '815':'с/х техника', '816':'другое'},
    '82':{'821':'автомобили', '822':'запчасти', '823':'гаражи', '824':'катера и яхты', '825':'с/х техника', '826':'другое'},
    '90':{'900':'----'},
    '91':{'910':'----'},
    '92':{'920':'----'},
    'A0':{'A00':'----'},
    'B0':{'B00':'----'}
  };


