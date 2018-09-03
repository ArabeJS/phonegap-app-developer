/*\
================================================================================
 *  Class
================================================================================
\*/

var db = new PouchDB('rdindb', {
  /*adapter: 'fruitdown',*/
  auto_compaction: true
});
var RD = angular.module("RDapp", [
  'ngRoute',
  'ngMaterial',
  'ngMessages',
  'pascalprecht.translate'
]);

var alert = function ($mdDialog ,$translate, title, textContent) {
  var RDyes = $translate.instant('06');
  $mdDialog.show(
    $mdDialog.alert()
      .clickOutsideToClose(true)
      .title(title)
      .textContent(textContent)
      .ariaLabel('Alert')
      .ok( RDyes )
  );
};

var sendApi = function (c,o) {
  var Auth;
  if(localStorage.getItem("Auth") === null){
    Auth = null;
  }else {
    Auth = localStorage.getItem("Auth");
  }

  return {
    appID: cfg.appID,
    cmd: c,
    ordr: o,
    auth: Auth
  };
}
/*\
================================================================================
 *  Config
================================================================================
\*/
RD.config(function($routeProvider, $locationProvider, $translateProvider) {
  $routeProvider
    .when('/', {
      templateUrl: '[RD]/page/home.html',
      controller: 'home',
    })
    .when('/check', {
      templateUrl: '[RD]/page/check.html',
      controller: 'check',
    })
    .when('/list', {
      templateUrl: '[RD]/page/list.html',
      controller: 'list',
    })
    .when('/login', {
      templateUrl: '[RD]/page/login.html',
      controller: 'login',
    })
    .when('/menu', {
      templateUrl: '[RD]/page/menu.html',
      controller: 'menu',
    })
    .otherwise({
      redirectTo: "/"
    });
  // configure html5 to get links working on jsfiddle
  //$locationProvider.html5Mode(true);

  $translateProvider.useStaticFilesLoader({
    prefix: '/[RD]/lang/',
    suffix: '.json'
  });
  $translateProvider.preferredLanguage('en');
  $translateProvider.useSanitizeValueStrategy('escapeParameters');
});

/*============================================================================*/

/*\
================================================================================
 *  Controllers
================================================================================
\*/
/*  RDapp  */
RD.controller('RDapp', function($rootScope, $scope, $location) {
  $scope.cfg = cfg;
  $rootScope.IsVisible = false;
});
/*============================================================================*/
/*  home  */
RD.controller('home', function($scope) {

});
/*============================================================================*/
/*  check  */
RD.controller('check', function($scope, $location, $translate, $mdDialog) {
  $scope.enbBle = function() {
    bluetoothSerial.enable(function() {
      $location.path('/list');
    }, function() {
      alert($mdDialog, $translate, 'Bluetoot OFF',$translate.instant('04'));
    });
  };
});
/*============================================================================*/
/*  list  */
RD.controller('list', function($scope, $location, $rootScope, $translate, $mdDialog) {
  $scope.list = [];
  $scope.error = false;

  var cmd = function (n,d) {
    $scope.$emit("cmd", {name: n, data: d})
  }

  var progress = function () {
    if ($rootScope.IsVisible = true) {
      $rootScope.IsVisible = false;
    }else {
      $rootScope.IsVisible = true;
    }
  }

  var bleApi = {
    getList: function() {
      progress();
      bluetoothSerial.list(bleApi.list, bleApi.failure);
    },
    list: function(device) {
      $scope.list = device;
      progress();
    },
    failure: function() {
      cmd('listFailure', '0');
      progress();
    },
    connect: function(id) {
      progress();
      bluetoothSerial.connect(id, bleApi.connectSuccess, bleApi.connectFailure);
    },
    connectSuccess: function() {
      cmd('isConnect', '1');
      progress();
    },
    connectFailure: function() {
      cmd('isConnect', '0');
      progress();
    },
    readUntil: function () {
      progress();
      bluetoothSerial.readUntil('info\n', bleApi.readSuccess, bleApi.readFailure);
    },
    readSuccess: function(data) {
      if (data.ArdID == cfg.ArdID && data.cmd == 'info' && data.data == cfg.appName) {
        cmd('isVerify', '1');
        progress();
      }else {
        cmd('isVerify', '0');
        progress();
      }

    },
    readFailure: function() {
      cmd('readFailure', '0');
      progress();
    },
  };

  bleApi.getList();

  $scope.connectDevice = function (id) {
    bleApi.connect(id);
  }

  var rsp = {
    listFailure: {
      '0': function () {
        alert($mdDialog, $translate, '⚠ Alert',$translate.instant('09'));
      }
    },
    isConnect: {
      '0': function () {
        alert($mdDialog, $translate, '⚠ Alert',$translate.instant('10'));
      },
      '1': function () {
        bleApi.readUntil();
      }
    },
    isVerify: {
      '0': function () {
        alert($mdDialog, $translate, '⚠ Alert',$translate.instant('11'));
      },
      '1': function () {
        $location.path('/login');
      }
    },
    readFailure: {
      '0': function () {
        alert($mdDialog, $translate, '⚠ Alert',$translate.instant('12'));
      }
    }
  };

  $scope.$on("cmd", function (ev, data) {
    rsp[data.name][data.data]();
  });

});
/*============================================================================*/
/*  login  */
RD.controller('login', function($scope) {
  $scope.login = function () {
    var login = sendApi('login', $scope.pass);
    bluetoothSerial.readUntil(login+'\n',
    function (data) {
      if (data.ArdID == cfg.ArdID && data.cmd == 'login' && data.stat == 100) {
        localStorage.setItem("Auth", data.data);
        $location.path('/menu');
      }else {
        alert($mdDialog, $translate, '⚠ Login',$translate.instant('14'));
      }
    }, function () {
      alert($mdDialog, $translate, '⚠ Alert',$translate.instant('12'));
    });
  }
});
/*============================================================================*/
/*  menu  */
RD.controller('menu', function($scope) {

});
/*============================================================================*/


/*\
================================================================================
 *  Run
================================================================================
\*/
RD.run(function($rootScope, $location, $window) {
  /* bluetooth API -----------------------------------------------------------*/
  var ble = {
    start: function() {
      bluetoothSerial.isEnabled(ble.isEnabled, ble.isEnabledError);
    },
    isEnabled: function() {
      $location.path('/list');
    },
    isEnabledError: function() {
      $location.path('/check');
    }
  };
  /* check DB ----------------------------------------------------------------*/
  db.get('isSetup').then(function(doc) {
    ble.start();
    if (doc.setup == 1) {
      $rootScope.dbSetup = true;
    } else {
      $rootScope.dbSetup = false;
    }
  }).catch(function(err) {
    ble.start();
    if (err.name == "not_found") {
      db.put(cfg.dbSetup).then(function(doc) {
        $rootScope.$apply(function() {
          $location.path('/');
          $window.location.reload();
        });
      });
    }
  });
  ble.start();
  /*--------------------------------------------------------------------------*/






});
/*============================================================================*/

/*\
================================================================================
 *  Service
================================================================================
\*/
RD.service('authService', function($location) {

});
