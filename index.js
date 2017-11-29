// poly fill for Node.remove
// from:https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/remove()/remove().md
(function (arr) {
  arr.forEach(function (item) {
    if (item.hasOwnProperty('remove')) {
      return;
    }
    Object.defineProperty(item, 'remove', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function remove() {
        if (this.parentNode !== null)
          this.parentNode.removeChild(this);
      }
    });
  });
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);

// polyfill for NodeList.forEach
if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function (callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

// polyfill for Object.assign
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) { // .length of function is 2
      'use strict';
      if (target == null) { // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

var ATDSuperTable = function(el, options) {
  var containerEl = el;
  var dataTable = containerEl.querySelectorAll('table')[0];
  var lockTable = null;
  var lockTableRear = null;
  var autoLocked = getAutoLocked('data-auto-lock');
  var autoLockedRear = [];
  var manuallyLocked = [];
  var allLocked = [];
  var originalHeaders = [];
  var settings = Object.assign({
      'stackedBreakpoint': 767,
      'maxLocked': true
  }, options);

  dataTable.querySelectorAll('th').forEach(function(node) {
    originalHeaders.push(node.innerText);
  });
  
  layoutTable();
  
  window.addEventListener('resize', layoutTable);
  
  function layoutTable() {
    clearLockTables();
    containerEl.classList.remove('compact', 'stacked');

    if(dataTable.offsetWidth <= containerEl.offsetWidth) {
      return;
    }
    else if(window.innerWidth <= settings.stackedBreakpoint) {
        containerEl.classList.add('stacked');
        setStackedHeadings();
        return;
    }
    else {
        containerEl.classList.add('compact');
    }
    
    placeLocks();
    
    allLocked = autoLocked.concat(manuallyLocked);
    allLocked.sort(function(a, b) {
      if(a.index < b.index) {
        return -1;
      }
      return 1;
    });

    if(allLocked.length) {
      lockTable = createLockTable();
      calculateLockTableSize(lockTable, allLocked);
      toggleColumnVisibility(true, allLocked, lockTable);
    }
    
    autoLockedRear = getAutoLocked('data-auto-lock-rear');    
    if(autoLockedRear.length) {
      lockTableRear = createLockTable(true);
      calculateLockTableSize(lockTableRear, autoLockedRear);
      toggleColumnVisibility(true, autoLockedRear, lockTableRear);
    }

    calculateMaxLocked();

    var lockButtons = containerEl.querySelectorAll('[data-lock-column]');
    lockButtons.forEach(function(btn) {
      btn.addEventListener('click', toggleLocked);
    });
  }

  function setStackedHeadings() {
    var columnHeads = dataTable.querySelectorAll('th');
    var rows = dataTable.querySelectorAll('tbody tr');
    rows.forEach(function(row) {
        var cells = row.querySelectorAll('td');
        cells.forEach(function(cell, i) {
            if(columnHeads[i].innerText.length && !columnHeads[i].innerText.match(/^\s$/) && !columnHeads[i].innerText.match(/\xA0$/g)) {
                cell.setAttribute('data-heading', columnHeads[i].innerText);
            }
        });
    });
  }
  
  function toggleLocked(e) {
    var columnHead = e.target.parentElement;
    var headerRow = columnHead.parentElement;
    var isLocked = lockTable ? lockTable.table.contains(columnHead) : false;
    
    clearLockTables();
    
    if(isLocked) {
      manuallyLocked = removeFromLocked(manuallyLocked);
      autoLocked = removeFromLocked(autoLocked);
      
      function removeFromLocked(lockedList) {
        var locked = [];
        for(var i = 0, length = lockedList.length; i < length; i++) { 
          if(columnHead.innerText !== lockedList[i].el.innerText) {
            locked.push(lockedList[i]);
          }
        }
        return locked;  
      }
    }
    else {      
        manuallyLocked.push({
          index: Array.prototype.indexOf.call(headerRow.children, columnHead),
          el: columnHead
        });
    }
    
    layoutTable();
  }
  
  function getAutoLocked(autoLockAttr) {
    var lockedList = [];
    columnHeads =  dataTable.querySelectorAll('th');
    for(var i = 0, length = columnHeads.length; i < length; i++) {
      if(columnHeads[i].hasAttribute(autoLockAttr)) {
        lockedList.push({
          index: i,
          el: columnHeads[i]
        });
      }
    }
    
    return lockedList;
  }
  
  function placeLocks() {
    columnHeads = dataTable.querySelectorAll('th');
    columnHeads.forEach(function(th) {
      placeLock(th);
    });
  }
  
  function placeLock(th) {
    var lock = document.createElement('A');
    lock.setAttribute('data-lock-column', '');
    th.appendChild(lock);
  }
  
  function clearLockTables() {
    restorOrignialOrder();
    
    dataTable.querySelectorAll('th').forEach(function(node) {
      var anchor = node.querySelector('[data-lock-column]');
      if(anchor) {
        anchor.remove();
      }
      
    });
    
    if(lockTable) {    
       containerEl.removeChild(lockTable.container);
       lockTable = null;
    }
    
    if(lockTableRear) {
      containerEl.removeChild(lockTableRear.container);
      lockTableRear = null;
    }
  }
  
  function restorOrignialOrder() {
    var currentOrder = dataTable.querySelectorAll('th');
    for(var i = 0, length = originalHeaders.length; i < length; i++) {
      currentOrder = dataTable.querySelectorAll('th');
      currentOrder.forEach(function(node, index) {
        if(originalHeaders[i] === node.innerText) {
           moveColumn(dataTable, index, i);
        }
      }); 
    }
  }
  
  function moveColumn(table, index, position, isRear) {
    if(isRear) {
      return;
    }
    var tableRows = table.querySelectorAll('tbody tr');
    var tableHeadRow = table.querySelector('thead tr');
   
    tableHeadRow.insertBefore(
      tableHeadRow.children[index], 
      tableHeadRow.childNodes[position]
    );
    
    for(var i = 0, length = tableRows.length; i < length; i++) {
      tableRows[i].insertBefore(
        tableRows[i].children[index], 
        tableRows[i].childNodes[position]
      );
    }
  }
  
  function calculateLockTableSize(lockTable, lockedList) {
    var width = 0;
    var columnHeads = lockTable.table.querySelectorAll('th');
    var rows = lockTable.table.querySelectorAll('tbody tr');
    
    for(var i = 0, length = lockedList.length; i < length; i++) {
      width += columnHeads[lockedList[i].index].offsetWidth;
      columnHeads[lockedList[i].index].style.visibility = 'visible';
      columnHeads[lockedList[i].index].style.pointerEvents = 'auto';
       
      for(var rows_i = 0, rows_length = rows.length; rows_i < rows_length; rows_i++) {
        rows[rows_i].children[lockedList[i].index].style.visibility = 'visible';
        rows[rows_i].children[lockedList[i].index].style.pointerEvents = 'auto';
      }
      
      moveColumn(lockTable.table, lockedList[i].index, i, lockTable.isRear);
      moveColumn(dataTable, lockedList[i].index, i, lockTable.isRear);
    }
    lockTable.container.style.width = width + 'px';
  }

  function calculateMaxLocked() {
      if(settings.maxLocked === false || lockTable == undefined) {
          return;
      }
      
      var containerWidth = containerEl.offsetWidth;
      var lockContainerWidth = lockTable.container.offsetWidth;

      if(lockContainerWidth > containerWidth / 2) {
          dataTable.classList.add('max-locked');
      }
      else {
        dataTable.classList.remove('max-locked');
      }
  }
  
  function toggleColumnVisibility(visible, lockedList, lockTable) {
    if(lockTable) {
        for(var i = 0, length = lockedList.length; i < length; i++) {
        lockTable.table.querySelectorAll('th')[i].style.visibility = 'visible';
        }
    }
  }
 
  function createLockTable(isRear) {
    //create lock table
    var lockTable = {
      table: dataTable.cloneNode(true),
      container:  document.createElement('div'),
      isRear: isRear
    }
        
    lockTable.table.classList.add('lock-table');
    lockTable.table.classList.remove('max-locked');
    if(isRear) {
      lockTable.container.classList.add('rear');
       lockTable.table.setAttribute('id', 'lock-table-rear');
    }
    else {
      lockTable.table.setAttribute('id', 'lock-table');
    }
    lockTable.container.classList.add('lock-table-container');
    
    var inner = document.createElement('div');
    inner.classList.add('lock-table-inner');

    inner.appendChild(lockTable.table);
    lockTable.container.appendChild(inner);
    lockTable.container.setAttribute('aria-hidden', '');
    containerEl.appendChild(lockTable.container);

    return lockTable;
  }
  
  return {
    layoutTable: layoutTable
  };
};

superTables = document.querySelectorAll('[data-super-table]');
superTables.forEach(function(superTable) {
  new ATDSuperTable(superTable);
});